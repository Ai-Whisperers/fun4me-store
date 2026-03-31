import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth'
import { apiError } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { createSearchPattern, MIN_SEARCH_LENGTH } from '@/lib/utils/search'

interface SearchResult {
  id: string
  type: 'pet' | 'appointment' | 'product' | 'client' | 'invoice'
  title: string
  subtitle?: string
  icon?: string
  url?: string
}

// GET /api/search?q=query&clinic=clinic_slug
export const GET = withApiAuth(async ({ request, user: _user, profile, supabase }) => {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const clinic = searchParams.get('clinic')

  if (!query || query.length < MIN_SEARCH_LENGTH) {
    return NextResponse.json({ results: [] })
  }

  if (!clinic) {
    return apiError('MISSING_FIELDS', 400, {
      details: { required: ['clinic'] },
    })
  }

  // Verify tenant access
  if (profile.tenant_id !== clinic) {
    return apiError('FORBIDDEN', 403)
  }

  const results: SearchResult[] = []
  // SEC-009: Escape LIKE special characters to prevent pattern injection
  const searchPattern = createSearchPattern(query)

  try {
    // Search pets
    const { data: pets } = await supabase
      .from('pets')
      .select('id, name, species, breed, owner_id')
      .eq('tenant_id', clinic)
      .or(
        `name.ilike.${searchPattern},breed.ilike.${searchPattern},microchip_number.ilike.${searchPattern}`
      )
      .limit(5)

    if (pets) {
      for (const pet of pets) {
        results.push({
          id: pet.id,
          type: 'pet',
          title: pet.name,
          subtitle: `${pet.species === 'dog' ? 'Perro' : 'Gato'}${pet.breed ? ` • ${pet.breed}` : ''}`,
          icon: pet.species,
          url: `/${clinic}/portal/pets/${pet.id}`,
        })
      }
    }

    // Search appointments (staff only)
    if (['vet', 'admin'].includes(profile.role)) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(
          `
          id,
          appointment_date,
          appointment_time,
          status,
          service_id,
          pets!inner(name, species)
        `
        )
        .eq('tenant_id', clinic)
        .or(`notes.ilike.${searchPattern}`)
        .order('appointment_date', { ascending: false })
        .limit(5)

      if (appointments) {
        for (const apt of appointments) {
          const petData = apt.pets as unknown as { name: string; species: string }
          const date = new Date(apt.appointment_date).toLocaleDateString('es-PY', {
            day: 'numeric',
            month: 'short',
          })
          results.push({
            id: apt.id,
            type: 'appointment',
            title: petData?.name || 'Cita',
            subtitle: `${date} • ${apt.appointment_time || ''} • ${apt.status}`,
            icon: 'calendar',
            url: `/${clinic}/portal/appointments/${apt.id}`,
          })
        }
      }

      // Search clients (staff only)
      const { data: clients } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('tenant_id', clinic)
        .eq('role', 'owner')
        .or(
          `full_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`
        )
        .limit(5)

      if (clients) {
        for (const client of clients) {
          results.push({
            id: client.id,
            type: 'client',
            title: client.full_name || client.email || 'Cliente',
            subtitle: client.phone || client.email,
            icon: 'user',
            url: `/${clinic}/portal/clients/${client.id}`,
          })
        }
      }
    }

    // Search products
    const { data: products } = await supabase
      .from('store_products')
      .select('id, name, description, category, price')
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .or(
        `name.ilike.${searchPattern},description.ilike.${searchPattern},sku.ilike.${searchPattern}`
      )
      .limit(5)

    if (products) {
      for (const product of products) {
        results.push({
          id: product.id,
          type: 'product',
          title: product.name,
          subtitle: `${product.category} • ${product.price?.toLocaleString('es-PY')} Gs`,
          icon: 'package',
          url: `/${clinic}/store/products/${product.id}`,
        })
      }
    }

    // Search invoices (staff only)
    if (['vet', 'admin'].includes(profile.role)) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, status, created_at, client:profiles(full_name)')
        .eq('tenant_id', clinic)
        .or(`invoice_number.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (invoices) {
        for (const invoice of invoices) {
          const clientData = invoice.client as unknown as { full_name: string } | null
          const statusLabels: Record<string, string> = {
            draft: 'Borrador',
            sent: 'Enviada',
            partial: 'Pago parcial',
            paid: 'Pagada',
            overdue: 'Vencida',
            void: 'Anulada',
          }
          results.push({
            id: invoice.id,
            type: 'invoice',
            title: `Factura ${invoice.invoice_number}`,
            subtitle: `${clientData?.full_name || 'Cliente'} • ${invoice.total?.toLocaleString('es-PY')} Gs • ${statusLabels[invoice.status] || invoice.status}`,
            icon: 'file-text',
            url: `/${clinic}/dashboard/invoices/${invoice.id}`,
          })
        }
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    logger.error('Search error', {
      tenantId: clinic,
      query,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', 500)
  }
}, { rateLimit: 'search' })
