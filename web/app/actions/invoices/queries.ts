'use server'

import { withActionAuth, actionSuccess, actionError } from '@/lib/actions'
import { logger } from '@/lib/logger'
import type { Invoice, Service } from '@/lib/types/invoicing'

/**
 * Get services for a clinic (for service selector)
 */
export const getClinicServices = withActionAuth(
  async ({ profile, supabase }, clinicSlug: string) => {
    if (profile.tenant_id !== clinicSlug) {
      return actionError('No tienes acceso a esta clínica')
    }

    const { data: services, error } = await supabase
      .from('services')
      .select('id, tenant_id, name, description, category, base_price, duration_minutes, is_active')
      .eq('tenant_id', clinicSlug)
      .eq('is_active', true)
      .order('category')
      .order('name')

    if (error) {
      logger.error('Get services error', {
        tenantId: profile.tenant_id,
        clinicSlug,
        error: error instanceof Error ? error.message : String(error),
      })
      return actionError('Error al cargar servicios')
    }

    return actionSuccess(services as Service[])
  },
  { requireStaff: true }
)

/**
 * Get pets for a clinic (for pet selector in invoice form)
 */
export const getClinicPets = withActionAuth(
  async ({ profile, supabase }, clinicSlug: string, search?: string) => {
    if (profile.tenant_id !== clinicSlug) {
      return actionError('No tienes acceso a esta clínica')
    }

    let query = supabase
      .from('pets')
      .select(
        `
        id,
        name,
        species,
        breed,
        photo_url,
        owner:profiles!pets_owner_id_fkey(id, full_name, email, phone)
      `
      )
      .eq('tenant_id', clinicSlug)
      .order('name')
      .limit(50)

    if (search) {
      query = query.or(`name.ilike.%${search}%`)
    }

    const { data: pets, error } = await query

    if (error) {
      logger.error('Get pets error', {
        tenantId: profile.tenant_id,
        clinicSlug,
        error: error instanceof Error ? error.message : String(error),
      })
      return actionError('Error al cargar mascotas')
    }

    // Transform the nested owner data
    const transformedPets = pets?.map((pet) => ({
      ...pet,
      owner: Array.isArray(pet.owner) ? pet.owner[0] : pet.owner,
    }))

    return actionSuccess(transformedPets)
  },
  { requireStaff: true }
)

/**
 * Get invoices for a clinic
 */
export const getInvoices = withActionAuth(
  async (
    { profile, supabase },
    params: {
      clinic: string
      status: string
      page: number
      limit: number
    }
  ) => {
    if (profile.tenant_id !== params.clinic) {
      return actionError('No tienes acceso a esta clínica')
    }

    const offset = (params.page - 1) * params.limit

    let query = supabase
      .from('invoices')
      .select(
        `
        *,
        pets(id, name, species, photo_url, owner:profiles!pets_owner_id_fkey(id, full_name, email, phone))
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', params.clinic)
      .order('created_at', { ascending: false })
      .range(offset, offset + params.limit - 1)

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status)
    }

    const { data: invoices, error, count } = await query

    if (error) {
      logger.error('Get invoices error', {
        tenantId: profile.tenant_id,
        clinic: params.clinic,
        error: error instanceof Error ? error.message : String(error),
      })
      return actionError('Error al cargar facturas')
    }

    // Transform nested data
    const transformedInvoices =
      invoices?.map((inv) => {
        const pets = Array.isArray(inv.pets) ? inv.pets[0] : inv.pets
        const owner = pets?.owner
          ? Array.isArray(pets.owner)
            ? pets.owner[0]
            : pets.owner
          : undefined
        return {
          ...inv,
          pets: pets ? { ...pets, owner } : undefined,
        }
      }) || []

    return actionSuccess({ data: transformedInvoices as Invoice[], total: count || 0 })
  },
  { requireStaff: true }
)

/**
 * Get single invoice with all details
 */
export const getInvoice = withActionAuth(
  async ({ profile: _profile, user, isStaff, supabase }, invoiceId: string) => {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        pets(id, name, species, breed, photo_url, owner:profiles!pets_owner_id_fkey(id, full_name, email, phone)),
        invoice_items(
          id, service_id, product_id, description, quantity, unit_price, discount_percent, line_total,
          services(id, name, category),
          products(id, name, sku)
        ),
        payments(id, amount, payment_method, reference_number, paid_at, received_by),
        refunds(id, amount, reason, refunded_at),
        created_by_user:profiles!invoices_created_by_fkey(full_name)
      `
      )
      .eq('id', invoiceId)
      .single()

    if (error) {
      logger.error('Get invoice error', {
        invoiceId,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return actionError('Factura no encontrada')
    }

    // Check access
    if (!isStaff && invoice.owner_id !== user.id) {
      return actionError('No tienes acceso a esta factura')
    }

    return actionSuccess(invoice as Invoice)
  }
)
