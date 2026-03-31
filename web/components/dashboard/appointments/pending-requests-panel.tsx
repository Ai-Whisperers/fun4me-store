'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Clock,
  Calendar,
  Phone,
  User,
  PawPrint,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react'
import { getPendingBookingRequests } from '@/app/actions/schedule-appointment'
import { ScheduleAppointmentModal } from './schedule-appointment-modal'

interface PendingRequest {
  id: string
  pet_name: string
  pet_id: string
  owner_name: string
  owner_phone: string | null
  services: string
  preferred_date_start: string | null
  preferred_date_end: string | null
  preferred_time_of_day: string | null
  notes: string | null
  requested_at: string
}

interface PendingRequestsPanelProps {
  clinic: string
}

/**
 * Panel showing pending booking requests that need to be scheduled
 */
export function PendingRequestsPanel({ clinic }: PendingRequestsPanelProps) {
  const t = useTranslations('dashboard.pendingRequests')
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchRequests = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getPendingBookingRequests()

    if (result.success && result.data) {
      setRequests(result.data.requests)
    } else {
      setError(!result.success && 'error' in result ? result.error : t('errorLoading'))
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleSchedule = (request: PendingRequest) => {
    setSelectedRequest(request)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedRequest(null)
  }

  const handleScheduleSuccess = () => {
    fetchRequests() // Refresh the list
    handleModalClose()
  }

  const formatPreference = (request: PendingRequest) => {
    const parts: string[] = []

    if (request.preferred_date_start) {
      if (request.preferred_date_end) {
        parts.push(t('dateRange', { start: request.preferred_date_start, end: request.preferred_date_end }))
      } else {
        parts.push(t('from', { date: request.preferred_date_start }))
      }
    }

    if (request.preferred_time_of_day && request.preferred_time_of_day !== 'any') {
      parts.push(request.preferred_time_of_day === 'morning' ? t('morning') : t('afternoon'))
    }

    return parts.length > 0 ? parts.join(' • ') : t('noPreference')
  }

  const getTimeIcon = (timeOfDay: string | null) => {
    if (timeOfDay === 'morning') return <Sun className="h-3 w-3" />
    if (timeOfDay === 'afternoon') return <Moon className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-default)] p-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--primary)]" />
          <span className="text-[var(--text-secondary)]">{t('loadingRequests')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--status-error-light)] bg-[var(--status-error-bg)] p-6">
        <div className="flex items-center gap-3 text-[var(--status-error)]">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={fetchRequests}
            className="ml-auto rounded-lg bg-[var(--status-error)] px-3 py-1 text-sm text-white hover:opacity-90"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    return null // Don't show panel if no pending requests
  }

  return (
    <>
      <div className="mb-6 rounded-xl border-2 border-dashed border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--status-warning-dark)]" />
            <h2 className="font-bold text-[var(--status-warning-dark)]">
              {t('title')} ({requests.length})
            </h2>
          </div>
          <button
            onClick={fetchRequests}
            className="rounded-lg p-2 text-[var(--status-warning-dark)] hover:bg-[var(--status-warning-light)]"
            title={t('refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                {/* Pet Avatar */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <PawPrint className="h-6 w-6" />
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">{request.pet_name}</span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-sm text-[var(--text-secondary)]">{request.services}</span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.owner_name}
                    </span>
                    {request.owner_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {request.owner_phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      {getTimeIcon(request.preferred_time_of_day)}
                      {formatPreference(request)}
                    </span>
                  </div>

                  {request.notes && (
                    <p className="mt-1 line-clamp-1 text-xs italic text-[var(--text-muted)]">
                      "{request.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => handleSchedule(request)}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-medium text-white transition-all hover:opacity-90"
              >
                <Calendar className="h-4 w-4" />
                {t('schedule')}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduling Modal */}
      {selectedRequest && (
        <ScheduleAppointmentModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleScheduleSuccess}
          request={selectedRequest}
          clinic={clinic}
        />
      )}
    </>
  )
}
