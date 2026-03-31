/**
 * Vaccines [id] API
 *
 * GET    /api/vaccines/[id] - Get single vaccine record
 * PATCH  /api/vaccines/[id] - Update vaccine record (staff only)
 * DELETE /api/vaccines/[id] - Delete vaccine record (staff only)
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Valid vaccine statuses
const VACCINE_STATUSES = ['pending', 'verified', 'expired'] as const

// Zod schema for updating vaccine
const updateVaccineSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre es muy largo').optional(),
  administered_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .optional(),
  next_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .nullable()
    .optional(),
  batch_number: z.string().max(50, 'El número de lote es muy largo').nullable().optional(),
  notes: z.string().max(1000, 'Las notas son muy largas').nullable().optional(),
  status: z.enum(VACCINE_STATUSES).optional(),
  certificate_url: z.string().url('URL de certificado inválida').nullable().optional(),
  photos: z.array(z.string().url('URL de foto inválida')).max(5).nullable().optional(),
})

/**
 * GET /api/vaccines/[id] - Get single vaccine with full details
 */
export const GET = withApiAuthParams(
  async ({ params, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const vaccineId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(vaccineId)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: [{ field: 'id', message: 'ID de vacuna inválido' }] },
      })
    }

    // Get vaccine with all related data
    const { data: vaccine, error } = await supabase
      .from('vaccines')
      .select(
        `
        *,
        pet:pets!inner(
          id, name, species, breed, date_of_birth, tenant_id,
          owner:profiles!pets_owner_id_fkey(id, full_name, email, phone)
        ),
        administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name, avatar_url),
        verified_by_profile:profiles!vaccines_verified_by_fkey(id, full_name),
        reactions:vaccine_reactions(
          id, reaction_detail, severity, onset_time, resolved_at, treatment_given, created_at
        )
      `
      )
      .eq('id', vaccineId)
      .eq('pet.tenant_id', profile.tenant_id)
      .single()

    if (error || !vaccine) {
      logger.warn('Vaccine not found', {
        tenantId: profile.tenant_id,
        vaccineId,
        error: error?.message,
      })
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'vaccine' },
      })
    }

    return NextResponse.json(vaccine)
  },
  { roles: ['vet', 'admin', 'owner'] }
)

/**
 * PATCH /api/vaccines/[id] - Update vaccine (staff only)
 */
export const PATCH = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const vaccineId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(vaccineId)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: [{ field: 'id', message: 'ID de vacuna inválido' }] },
      })
    }

    // Parse and validate body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const result = updateVaccineSchema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    // Verify vaccine exists and belongs to tenant
    const { data: existingVaccine } = await supabase
      .from('vaccines')
      .select(
        `
        id, pet_id, name, administered_date, next_due_date, status,
        pet:pets!inner(tenant_id)
      `
      )
      .eq('id', vaccineId)
      .single()

    if (!existingVaccine) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'vaccine' },
      })
    }

    // Check tenant ownership via pet
    const petTenantId = Array.isArray(existingVaccine.pet)
      ? existingVaccine.pet[0]?.tenant_id
      : (existingVaccine.pet as { tenant_id: string })?.tenant_id

    if (petTenantId !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Validate date logic if dates are being updated
    const newAdminDate = result.data.administered_date || existingVaccine.administered_date
    const newNextDate = result.data.next_due_date !== undefined ? result.data.next_due_date : existingVaccine.next_due_date

    if (newNextDate && new Date(newNextDate) <= new Date(newAdminDate)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: [
            { field: 'next_due_date', message: 'La fecha de próxima dosis debe ser posterior a la fecha de aplicación' },
          ],
        },
      })
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (result.data.name !== undefined) updateData.name = result.data.name
    if (result.data.administered_date !== undefined) updateData.administered_date = result.data.administered_date
    if (result.data.next_due_date !== undefined) updateData.next_due_date = result.data.next_due_date
    if (result.data.batch_number !== undefined) updateData.batch_number = result.data.batch_number
    if (result.data.notes !== undefined) updateData.notes = result.data.notes
    if (result.data.certificate_url !== undefined) updateData.certificate_url = result.data.certificate_url
    if (result.data.photos !== undefined) updateData.photos = result.data.photos

    // Handle status change - if verifying, set verified_by
    if (result.data.status !== undefined) {
      updateData.status = result.data.status
      if (result.data.status === 'verified' && existingVaccine.status !== 'verified') {
        updateData.verified_by = user.id
        updateData.verified_at = new Date().toISOString()
      }
    }

    // Update vaccine
    const { data: updated, error } = await supabase
      .from('vaccines')
      .update(updateData)
      .eq('id', vaccineId)
      .select(
        `
        *,
        pet:pets(id, name, species),
        administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name)
      `
      )
      .single()

    if (error) {
      logger.error('Error updating vaccine', {
        tenantId: profile.tenant_id,
        userId: user.id,
        vaccineId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'update',
      resource: 'vaccine',
      resource_id: vaccineId,
      details: {
        previous: {
          name: existingVaccine.name,
          administered_date: existingVaccine.administered_date,
          status: existingVaccine.status,
        },
        updated: result.data,
      },
    })

    logger.info('Vaccine updated', {
      tenantId: profile.tenant_id,
      userId: user.id,
      vaccineId,
      fields: Object.keys(result.data),
    })

    return NextResponse.json(updated)
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/vaccines/[id] - Delete vaccine (staff only)
 */
export const DELETE = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const vaccineId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(vaccineId)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: [{ field: 'id', message: 'ID de vacuna inválido' }] },
      })
    }

    // Parse optional reason from body
    let reason: string | null = null
    try {
      const body = await request.json()
      reason = body.reason || null
    } catch (_error: unknown) {
      // Body is optional
    }

    // Verify vaccine exists and get details for audit
    const { data: existingVaccine } = await supabase
      .from('vaccines')
      .select(
        `
        id, pet_id, name, administered_date, status,
        pet:pets!inner(tenant_id, name)
      `
      )
      .eq('id', vaccineId)
      .single()

    if (!existingVaccine) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'vaccine' },
      })
    }

    // Check tenant ownership via pet
    const petData = Array.isArray(existingVaccine.pet) ? existingVaccine.pet[0] : existingVaccine.pet
    if (petData?.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Delete vaccine (also cascades to vaccine_reactions via FK)
    const { error } = await supabase.from('vaccines').delete().eq('id', vaccineId)

    if (error) {
      logger.error('Error deleting vaccine', {
        tenantId: profile.tenant_id,
        userId: user.id,
        vaccineId,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'delete',
      resource: 'vaccine',
      resource_id: vaccineId,
      details: {
        name: existingVaccine.name,
        pet_id: existingVaccine.pet_id,
        pet_name: petData?.name,
        administered_date: existingVaccine.administered_date,
        reason,
      },
    })

    logger.info('Vaccine deleted', {
      tenantId: profile.tenant_id,
      userId: user.id,
      vaccineId,
      vaccineName: existingVaccine.name,
      reason,
    })

    return NextResponse.json({ success: true, deleted: vaccineId })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
