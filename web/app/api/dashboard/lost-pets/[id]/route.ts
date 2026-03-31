/**
 * API Route: /api/dashboard/lost-pets/[id]
 * Individual lost pet report operations
 *
 * @FEAT-015 Lost Pet Management Dashboard
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'
import { NOT_FOUND_ERRORS, DATABASE_ERRORS } from '@/lib/i18n/errors'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateStatusSchema = z.object({
  status: z.enum(['lost', 'found', 'reunited']),
  notes: z.string().max(1000).optional(),
  found_location: z.string().max(500).optional(),
})

/**
 * GET /api/dashboard/lost-pets/[id]
 * Get detailed report with sightings
 */
export const GET = withApiAuthParams<{ id: string }>(
  async ({ profile, supabase, log, params }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = params

    try {
      // Get report with related data
      const { data: report, error } = await supabase
        .from('lost_pets')
        .select(
          `
          *,
          pet:pets!inner (
            id,
            name,
            species,
            breed,
            color,
            weight_kg,
            photo_url,
            microchip_number,
            owner:profiles!pets_owner_id_fkey (
              id,
              full_name,
              phone,
              email
            )
          ),
          reported_by_profile:profiles!lost_pets_reported_by_fkey (
            id,
            full_name,
            email
          ),
          found_by_profile:profiles!lost_pets_found_by_fkey (
            id,
            full_name,
            email
          )
        `
        )
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !report) {
        log.warn('Lost pet report not found', { id, tenant: profile.tenant_id })
        return NextResponse.json({ error: NOT_FOUND_ERRORS.RESOURCE }, { status: 404 })
      }

      // Get sightings for this report
      const { data: sightings } = await supabase
        .from('pet_sightings')
        .select('*')
        .eq('lost_pet_id', id)
        .order('sighting_date', { ascending: false })

      // Get match suggestions
      const { data: matches } = await supabase
        .from('pet_match_suggestions')
        .select(
          `
          *,
          found_report:lost_pets!pet_match_suggestions_found_report_id_fkey (
            id,
            status,
            pet:pets (
              id,
              name,
              species,
              breed,
              photo_url
            )
          )
        `
        )
        .eq('lost_report_id', id)
        .order('confidence_score', { ascending: false })

      return NextResponse.json({
        report,
        sightings: sightings || [],
        matches: matches || [],
      })
    } catch (err) {
      log.error('Error fetching lost pet report', { error: err instanceof Error ? err.message : err, id })
      return NextResponse.json({ error: DATABASE_ERRORS.SERVER_ERROR }, { status: 500 })
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PUT /api/dashboard/lost-pets/[id]
 * Update report status
 */
export const PUT = withApiAuthParams<{ id: string }>(
  async ({ request, profile, user, supabase, log, params }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = params

    try {
      const body = await request.json()
      const validation = updateStatusSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: validation.error.issues },
          { status: 400 }
        )
      }

      const { status, notes, found_location } = validation.data

      // Build update object
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (notes) {
        updateData.notes = notes
      }

      // Set resolution fields based on status
      if (status === 'found') {
        updateData.found_at = new Date().toISOString()
        updateData.found_by = user.id
        if (found_location) {
          updateData.found_location = found_location
        }
      } else if (status === 'reunited') {
        // If marking as reunited, set found_at if not already set
        const { data: existingReport } = await supabase
          .from('lost_pets')
          .select('found_at, pet_id')
          .eq('id', id)
          .single()

        if (!existingReport?.found_at) {
          updateData.found_at = new Date().toISOString()
          updateData.found_by = user.id
        }

        // FEAT-015: Notify owner when pet is reunited
        if (existingReport?.pet_id) {
          // Get owner info for notification
          const { data: pet } = await supabase
            .from('pets')
            .select('name, owner:profiles!pets_owner_id_fkey(id, email, full_name)')
            .eq('id', existingReport.pet_id)
            .single()

          // Handle owner which may be returned as array from Supabase join
          const ownerData = pet?.owner as unknown
          const owner = Array.isArray(ownerData) ? ownerData[0] : ownerData
          if (owner && typeof owner === 'object' && 'id' in owner) {
            // Create notification
            await supabase.from('notifications').insert({
              user_id: (owner as { id: string }).id,
              title: '¡Mascota reunida!',
              message: `${pet?.name} ha sido marcado como reunido con su dueño.`,
              type: 'pet_reunited',
              data: { report_id: id, pet_id: existingReport.pet_id },
            })

            log.info('Pet reunited notification sent', {
              pet_id: existingReport.pet_id,
              owner_id: (owner as { id: string }).id,
            })
          }
        }
      }

      // Update the report
      const { data: report, error } = await supabase
        .from('lost_pets')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .select(
          `
          *,
          pet:pets!inner (
            id,
            name,
            species,
            breed,
            photo_url,
            microchip_number,
            owner:profiles!pets_owner_id_fkey (
              id,
              full_name,
              phone,
              email
            )
          )
        `
        )
        .single()

      if (error) {
        log.error('Failed to update lost pet status', { error, id })
        return NextResponse.json({ error: DATABASE_ERRORS.QUERY_FAILED }, { status: 500 })
      }

      // Log to audit
      await supabase.from('audit_logs').insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        action: 'lost_pet_status_update',
        resource: 'lost_pets',
        resource_id: id,
        details: { old_status: body.old_status, new_status: status, notes },
      })

      return NextResponse.json({ report })
    } catch (err) {
      log.error('Error updating lost pet report', { error: err instanceof Error ? err.message : err, id })
      return NextResponse.json({ error: DATABASE_ERRORS.SERVER_ERROR }, { status: 500 })
    }
  },
  { roles: ['vet', 'admin'] }
)
