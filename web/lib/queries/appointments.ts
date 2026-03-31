/**
 * Appointments Query Hooks
 *
 * RES-001: React Query Migration - Phase 2
 *
 * Query hooks for appointment data fetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { buildUrl, staleTimes, gcTimes, parseErrorResponse } from './utils'

// Types
export interface Appointment {
  id: string
  tenant_id: string
  pet_id: string
  pet_name?: string
  owner_id?: string
  owner_name?: string
  vet_id?: string
  vet_name?: string
  service_id?: string
  service_name?: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  scheduling_status?: 'pending_scheduling' | 'scheduled' | 'rescheduling'
  notes?: string
  created_at: string
  updated_at: string
}

export interface AppointmentSlot {
  start: string
  end: string
  available: boolean
  vet_id?: string
  vet_name?: string
}

export interface WaitlistEntry {
  id: string
  pet_id: string
  pet_name: string
  owner_name: string
  service_id?: string
  service_name?: string
  preferred_date_start?: string
  preferred_date_end?: string
  preferred_time_of_day?: 'morning' | 'afternoon' | 'any'
  requested_at: string
  status: 'waiting' | 'offered' | 'accepted' | 'expired'
}

export interface AppointmentFilters {
  status?: string
  vet_id?: string
  date_from?: string
  date_to?: string
  scheduling_status?: string
  page?: number
  limit?: number
}

// Query Hooks

/**
 * Fetch appointments list
 */
export function useAppointmentsList(
  clinic: string,
  filters?: AppointmentFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.appointments.list(clinic, filters as Record<string, unknown>),
    queryFn: async (): Promise<{ appointments: Appointment[]; total: number }> => {
      const url = buildUrl(`/api/${clinic}/appointments`, {
        status: filters?.status,
        vet_id: filters?.vet_id,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        scheduling_status: filters?.scheduling_status,
        page: filters?.page,
        limit: filters?.limit,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/list')
        throw new Error(error.error || 'Error al cargar citas')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT, // Appointments change frequently
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch single appointment
 */
export function useAppointment(
  appointmentId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId),
    queryFn: async (): Promise<Appointment> => {
      const response = await fetch(`/api/appointments/${appointmentId}`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/detail')
        throw new Error(error.error || 'Error al cargar cita')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!appointmentId,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch calendar events for date range
 */
export function useCalendarAppointments(
  clinic: string,
  start: string,
  end: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.appointments.calendar(clinic, start, end),
    queryFn: async (): Promise<Appointment[]> => {
      const url = buildUrl(`/api/${clinic}/calendar/events`, { start, end })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/calendar')
        throw new Error(error.error || 'Error al cargar calendario')
      }
      const data = await response.json()
      return data.events || data
    },
    enabled: (options?.enabled ?? true) && !!start && !!end,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch pending appointment requests
 */
export function usePendingAppointments(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.appointments.pending(clinic),
    queryFn: async (): Promise<Appointment[]> => {
      const url = buildUrl(`/api/${clinic}/appointments`, {
        scheduling_status: 'pending_scheduling',
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/pending')
        throw new Error(error.error || 'Error al cargar solicitudes pendientes')
      }
      const data = await response.json()
      return data.appointments || data
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
  })
}

/**
 * Fetch waitlist
 */
export function useWaitlist(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.appointments.waitlist(clinic),
    queryFn: async (): Promise<WaitlistEntry[]> => {
      const response = await fetch(`/api/${clinic}/appointments/waitlist`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/waitlist')
        throw new Error(error.error || 'Error al cargar lista de espera')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch available slots for a date and service
 */
export function useAvailableSlots(
  clinic: string,
  date: string,
  serviceId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.appointments.slots(clinic, date, serviceId),
    queryFn: async (): Promise<AppointmentSlot[]> => {
      const url = buildUrl(`/api/${clinic}/appointments/availability`, {
        date,
        service_id: serviceId,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/availability')
        throw new Error(error.error || 'Error al cargar disponibilidad')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!date,
    staleTime: staleTimes.SHORT, // Availability changes frequently
    gcTime: gcTimes.SHORT,
  })
}

// Mutation Hooks

interface CreateAppointmentInput {
  pet_id: string
  service_id?: string
  preferred_date_start?: string
  preferred_date_end?: string
  preferred_time_of_day?: 'morning' | 'afternoon' | 'any'
  notes?: string
}

/**
 * Create appointment request
 */
export function useCreateAppointment(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAppointmentInput): Promise<Appointment> => {
      const response = await fetch(`/api/${clinic}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/create')
        throw new Error(error.error || 'Error al crear cita')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.todayAppointments(clinic) })
    },
  })
}

interface UpdateAppointmentInput {
  id: string
  start_time?: string
  end_time?: string
  vet_id?: string
  status?: Appointment['status']
  notes?: string
}

/**
 * Update appointment
 */
export function useUpdateAppointment(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAppointmentInput): Promise<Appointment> => {
      const response = await fetch(`/api/${clinic}/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/update')
        throw new Error(error.error || 'Error al actualizar cita')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      queryClient.setQueryData(queryKeys.appointments.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.todayAppointments(clinic) })
    },
  })
}

/**
 * Cancel appointment
 */
export function useCancelAppointment(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }): Promise<void> => {
      const response = await fetch(`/api/${clinic}/appointments/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/cancel')
        throw new Error(error.error || 'Error al cancelar cita')
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.waitlist(clinic) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.todayAppointments(clinic) })
    },
  })
}

/**
 * Schedule a pending appointment request
 */
export function useScheduleAppointment(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      start_time,
      end_time,
      vet_id,
    }: {
      id: string
      start_time: string
      end_time: string
      vet_id?: string
    }): Promise<Appointment> => {
      const response = await fetch(`/api/${clinic}/appointments/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time, end_time, vet_id }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'appointments/schedule')
        throw new Error(error.error || 'Error al programar cita')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      queryClient.setQueryData(queryKeys.appointments.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.todayAppointments(clinic) })
    },
  })
}
