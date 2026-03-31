import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { z } from 'zod'
import {
  appointmentToCalendarEvent,
  timeOffToCalendarEvent,
  shiftToCalendarEvent,
} from '@/lib/types/calendar'
import type { CalendarEvent, TimeOffRequest } from '@/lib/types/calendar'
import { logger } from '@/lib/logger'

/**
 * API: Get calendar events for a date range
 *
 * GET /api/calendar/events?start=2024-01-01&end=2024-01-31
 *
 * Fetches appointments, shifts, and time off requests for the specified date range.
 * This enables dynamic loading of events when navigating the calendar.
 */

// Query params validation schema
const getEventsSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    try {
      // Parse and validate query params
      const { searchParams } = new URL(request.url)
      const validation = getEventsSchema.safeParse({
        start: searchParams.get('start'),
        end: searchParams.get('end'),
      })

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: validation.error.flatten(),
        })
      }

    const { start: startDateStr, end: endDateStr } = validation.data

    // Fetch appointments (exclude pending_scheduling - those appear in separate panel)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        tenant_id,
        start_time,
        end_time,
        status,
        reason,
        notes,
        vet_id,
        scheduling_status,
        pets (
          id,
          name,
          species,
          owner:profiles!pets_owner_id_fkey (
            id,
            full_name
          )
        )
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .neq('scheduling_status', 'pending_scheduling') // Only show scheduled appointments
      .gte('start_time', `${startDateStr}T00:00:00`)
      .lte('start_time', `${endDateStr}T23:59:59`)
      .order('start_time', { ascending: true })

      if (appointmentsError) {
        logger.error('Error fetching appointments', {
          tenantId: profile.tenant_id,
          error: appointmentsError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

    // Fetch staff profiles with their user data
    const { data: staffProfiles } = await supabase
      .from('staff_profiles')
      .select(
        `
        id,
        user_id,
        job_title,
        color_code,
        can_be_booked
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .eq('can_be_booked', true)
      .eq('employment_status', 'active')

    // Get user profiles for staff
    const staffUserIds = staffProfiles?.map((sp) => sp.user_id) || []
    const { data: staffUserProfiles } =
      staffUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', staffUserIds)
        : { data: [] }

    // Merge staff data
    const staff =
      staffProfiles?.map((sp) => {
        const userProfile = staffUserProfiles?.find((up) => up.id === sp.user_id)
        return {
          id: sp.id,
          user_id: sp.user_id,
          full_name: userProfile?.full_name || 'Sin nombre',
          job_title: sp.job_title,
          color_code: sp.color_code,
          avatar_url: userProfile?.avatar_url,
        }
      }) || []

    // Fetch shifts for staff
    const staffProfileIds = staffProfiles?.map((sp) => sp.id) || []
    const { data: shifts } =
      staffProfileIds.length > 0
        ? await supabase
            .from('staff_shifts')
            .select('*')
            .in('staff_profile_id', staffProfileIds)
            .gte('scheduled_start', `${startDateStr}T00:00:00`)
            .lte('scheduled_start', `${endDateStr}T23:59:59`)
        : { data: [] }

    // Fetch approved time off requests
    const { data: timeOffRequests } = await supabase
      .from('time_off_requests')
      .select(
        `
        *,
        time_off_type:time_off_types (
          id,
          code,
          name,
          color_code
        )
      `
      )
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['approved', 'pending'])
      .or(`and(start_date.lte.${endDateStr},end_date.gte.${startDateStr})`)

    // Transform data to calendar events
    const events: CalendarEvent[] = []

    // Transform appointments
    if (appointments) {
      for (const apt of appointments) {
        const pet = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets
        const owner = pet?.owner ? (Array.isArray(pet.owner) ? pet.owner[0] : pet.owner) : undefined

        const event = appointmentToCalendarEvent({
          id: apt.id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status,
          reason: apt.reason,
          pet: pet ? { name: pet.name } : null,
          service: null,
        })

        // Enrich with resource data
        event.resource = {
          type: 'appointment',
          appointmentId: apt.id,
          petId: pet?.id,
          petName: pet?.name,
          species: pet?.species,
          ownerId: owner?.id,
          ownerName: owner?.full_name,
          reason: apt.reason || undefined,
          notes: apt.notes || undefined,
          status: apt.status,
          staffId: apt.vet_id || undefined,
        }

        // Find staff color
        const vetStaff = staff.find((s) => s.user_id === apt.vet_id)
        if (vetStaff) {
          event.resource.staffId = vetStaff.id
          event.resource.staffName = vetStaff.full_name
          event.resource.staffColor = vetStaff.color_code
          event.color = vetStaff.color_code
        }

        events.push(event)
      }
    }

    // Transform shifts
    if (shifts) {
      for (const shift of shifts) {
        const staffMember = staff.find((s) => s.id === shift.staff_profile_id)
        if (!staffMember) continue

        const event = shiftToCalendarEvent({
          ...shift,
          staff: {
            id: staffMember.id,
            user_id: staffMember.user_id,
            full_name: staffMember.full_name,
            job_title: staffMember.job_title,
            color_code: staffMember.color_code,
            can_be_booked: true,
          },
        })
        events.push(event)
      }
    }

    // Transform time off requests
    if (timeOffRequests) {
      for (const request of timeOffRequests) {
        const staffMember = staff.find((s) => s.id === request.staff_profile_id)
        const staffName = staffMember?.full_name || 'Personal'

        const event = timeOffToCalendarEvent(request as TimeOffRequest, staffName)
        if (staffMember && event.resource) {
          event.color = request.time_off_type?.color_code || 'var(--accent-pink)'
          event.resource.staffId = staffMember.id
          event.resource.staffColor = staffMember.color_code
        }
        events.push(event)
      }
    }

      return NextResponse.json({
        events,
        meta: {
          start: startDateStr,
          end: endDateStr,
          count: events.length,
        },
      })
    } catch (error) {
      logger.error('Calendar events error', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
