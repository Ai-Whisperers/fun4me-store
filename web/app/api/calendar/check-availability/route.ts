import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

/**
 * API: Check appointment slot availability
 *
 * POST /api/calendar/check-availability
 *
 * Checks if a time slot is available for booking by detecting overlapping appointments.
 */

// Request validation schema
const checkAvailabilitySchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  vet_id: z.string().uuid().optional(),
  exclude_appointment_id: z.string().uuid().optional(),
})

export const POST = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    try {
      // Parse and validate request body
      const body = await request.json()
      const validation = checkAvailabilitySchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

      const { start_time, end_time, vet_id, exclude_appointment_id } = validation.data

      // Validate time range
      const startDate = new Date(start_time)
      const endDate = new Date(end_time)

      if (endDate <= startDate) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { reason: 'La hora de fin debe ser posterior a la hora de inicio' },
        })
      }

      // Check for overlapping appointments
      let query = supabase
        .from('appointments')
        .select(
          `
          id,
          start_time,
          end_time,
          status,
          vet_id,
          pets (
            name
          )
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        // Check for time overlap: existing start < new end AND existing end > new start
        .lt('start_time', end_time)
        .gt('end_time', start_time)

      // Filter by vet if specified
      if (vet_id) {
        query = query.eq('vet_id', vet_id)
      }

      // Exclude a specific appointment (useful when rescheduling)
      if (exclude_appointment_id) {
        query = query.neq('id', exclude_appointment_id)
      }

      const { data: conflicts, error: conflictsError } = await query

      if (conflictsError) {
        logger.error('Error checking conflicts', {
          tenantId: profile.tenant_id,
          error: conflictsError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Format conflicts for response
      const formattedConflicts =
        conflicts?.map((apt) => {
          const pet = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets
          return {
            id: apt.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            vet_id: apt.vet_id,
            pet_name: pet?.name || 'Mascota',
          }
        }) || []

      return NextResponse.json({
        available: formattedConflicts.length === 0,
        conflicts: formattedConflicts,
        message:
          formattedConflicts.length === 0
            ? 'Horario disponible'
            : `${formattedConflicts.length} cita(s) en conflicto`,
      })
    } catch (error) {
      logger.error('Check availability error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'search' }
)
