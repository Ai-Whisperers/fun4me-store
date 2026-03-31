/**
 * Quick Add Form Hook
 *
 * Manages form state, validation, and availability checking for quick appointment creation.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import type { Service, ConflictInfo } from './types'

interface UseQuickAddFormProps {
  slotInfo: { start: Date; end: Date } | null
  isOpen: boolean
  services: Service[]
}

interface QuickAddFormState {
  petId: string
  serviceId: string
  vetId: string
  reason: string
  notes: string
  startTime: string
  endTime: string
  petSearch: string
  error: string
  isSaving: boolean
  conflicts: ConflictInfo[]
  isCheckingAvailability: boolean
}

export function useQuickAddForm({ slotInfo, isOpen, services }: UseQuickAddFormProps) {
  // Form state
  const [petId, setPetId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [vetId, setVetId] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [petSearch, setPetSearch] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Conflict detection state
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check availability function
  const checkAvailability = useCallback(
    async (start: string, end: string, vet?: string) => {
      if (!slotInfo || !start || !end) return

      setIsCheckingAvailability(true)
      try {
        const [startHours, startMinutes] = start.split(':').map(Number)
        const [endHours, endMinutes] = end.split(':').map(Number)

        const startDateTime = new Date(slotInfo.start)
        startDateTime.setHours(startHours, startMinutes, 0, 0)

        const endDateTime = new Date(slotInfo.start)
        endDateTime.setHours(endHours, endMinutes, 0, 0)

        if (endDateTime <= startDateTime) return

        const response = await fetch('/api/calendar/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            vet_id: vet || undefined,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setConflicts(data.conflicts || [])
        }
      } catch (error) {
        // Log availability check failure - non-critical, conflicts won't prevent booking
        if (process.env.NODE_ENV === 'development') {
          console.warn('[QuickAdd/checkAvailability] Failed to check conflicts:', error)
        }
      } finally {
        setIsCheckingAvailability(false)
      }
    },
    [slotInfo]
  )

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && slotInfo) {
      setPetId('')
      setServiceId('')
      setVetId('')
      setReason('')
      setNotes('')
      setError('')
      setPetSearch('')
      setConflicts([])
      setStartTime(format(slotInfo.start, 'HH:mm'))
      setEndTime(format(slotInfo.end, 'HH:mm'))
    }
  }, [isOpen, slotInfo])

  // Debounced availability check when times or vet changes
  useEffect(() => {
    if (!isOpen || !slotInfo || !startTime || !endTime) return

    // Clear previous timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current)
    }

    // Debounce the check
    checkTimeoutRef.current = setTimeout(() => {
      checkAvailability(startTime, endTime, vetId)
    }, 500)

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [isOpen, slotInfo, startTime, endTime, vetId, checkAvailability])

  // Update end time when service changes
  useEffect(() => {
    if (serviceId && slotInfo) {
      const selectedService = services.find((s) => s.id === serviceId)
      if (selectedService) {
        const start = new Date(slotInfo.start)
        const [hours, minutes] = startTime.split(':').map(Number)
        start.setHours(hours, minutes, 0, 0)
        const end = new Date(start.getTime() + selectedService.duration_minutes * 60000)
        setEndTime(format(end, 'HH:mm'))
      }
    }
  }, [serviceId, startTime, services, slotInfo])

  // Validate and build submission data
  const validateAndBuildData = () => {
    setError('')

    if (!petId) {
      setError('Selecciona una mascota')
      return null
    }

    if (!reason.trim()) {
      setError('Ingresa el motivo de la cita')
      return null
    }

    if (!slotInfo) return null

    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const start = new Date(slotInfo.start)
    start.setHours(startHours, startMinutes, 0, 0)

    const end = new Date(slotInfo.start)
    end.setHours(endHours, endMinutes, 0, 0)

    if (end <= start) {
      setError('La hora de fin debe ser posterior a la hora de inicio')
      return null
    }

    return {
      petId,
      serviceId: serviceId || undefined,
      vetId: vetId || undefined,
      startTime: start,
      endTime: end,
      reason,
      notes: notes || undefined,
    }
  }

  return {
    // State
    formState: {
      petId,
      serviceId,
      vetId,
      reason,
      notes,
      startTime,
      endTime,
      petSearch,
      error,
      isSaving,
      conflicts,
      isCheckingAvailability,
    } as QuickAddFormState,

    // Setters
    setPetId,
    setServiceId,
    setVetId,
    setReason,
    setNotes,
    setStartTime,
    setEndTime,
    setPetSearch,
    setError,
    setIsSaving,

    // Helpers
    validateAndBuildData,
  }
}
