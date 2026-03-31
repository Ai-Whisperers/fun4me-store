'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Shield,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface VaccineRecommendation {
  vaccine_name: string
  vaccine_code: string
  protocol_type: 'core' | 'non-core' | 'lifestyle'
  diseases_prevented: string[]
  first_dose_weeks: number | null
  notes: string | null
  status: 'missing' | 'due' | 'overdue'
  reason: string
}

interface VaccineRecommendationsResponse {
  core_vaccines: VaccineRecommendation[]
  recommended_vaccines: VaccineRecommendation[]
  lifestyle_vaccines: VaccineRecommendation[]
  total_missing: number
}

interface MissingVaccinesCardProps {
  petId: string
  petName: string
  species: string
  birthDate?: string | null
  existingVaccineCodes?: string[]
  existingVaccineNames?: string[]
  clinic: string
}

/**
 * MissingVaccinesCard - Shows missing and recommended vaccines for a pet
 *
 * This component fetches vaccine recommendations from the API based on:
 * - Pet species
 * - Pet age (calculated from birth date)
 * - Already administered vaccines
 *
 * Displays core (obligatory) vaccines and recommended (non-core) vaccines
 * with appropriate urgency styling.
 */
export function MissingVaccinesCard({
  petId,
  petName,
  species,
  birthDate,
  existingVaccineCodes = [],
  existingVaccineNames = [],
  clinic,
}: MissingVaccinesCardProps) {
  const t = useTranslations('vaccines.missing')
  const [recommendations, setRecommendations] = useState<VaccineRecommendationsResponse | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate age in weeks from birth date
  const calculateAgeWeeks = (birthDateStr: string | null | undefined): number | null => {
    if (!birthDateStr) return null
    const birthDate = new Date(birthDateStr)
    const today = new Date()
    const diffMs = today.getTime() - birthDate.getTime()
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
    return diffWeeks >= 0 ? diffWeeks : null
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true)
      setError(null)

      try {
        // Build query parameters
        const params = new URLSearchParams()
        params.set('species', species)

        const ageWeeks = calculateAgeWeeks(birthDate)
        if (ageWeeks !== null) {
          params.set('age_weeks', ageWeeks.toString())
        }

        if (existingVaccineCodes.length > 0) {
          params.set('existing_vaccines', existingVaccineCodes.join(','))
        }

        if (existingVaccineNames.length > 0) {
          params.set('existing_vaccine_names', existingVaccineNames.join(','))
        }

        const response = await fetch(`/api/vaccines/recommendations?${params.toString()}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || t('errorFetching'))
        }

        const data = await response.json()
        setRecommendations(data)
      } catch (err) {
        console.error('Error fetching vaccine recommendations:', err)
        setError(err instanceof Error ? err.message : t('unknownError'))
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [species, birthDate, existingVaccineCodes.join(','), existingVaccineNames.join(',')])

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-6">
        <div className="flex items-center justify-center gap-3 text-[var(--status-warning-text)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-6">
        <div className="flex items-center gap-3 text-[var(--status-error-text)]">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  // No recommendations (all vaccines up to date or no protocols for species)
  if (!recommendations || recommendations.total_missing === 0) {
    return null // Don't show anything if no vaccines are missing
  }

  const hasOverdue = recommendations.core_vaccines.some((v) => v.status === 'overdue')
  const hasDue = recommendations.core_vaccines.some((v) => v.status === 'due')

  // Determine card urgency level
  const cardBgClass = hasOverdue
    ? 'bg-[var(--status-error-bg)] border-[var(--status-error-border)]'
    : hasDue
      ? 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]'
      : 'bg-[var(--status-warning-bg)]/50 border-[var(--status-warning-border)]/50'

  const headerClass = hasOverdue ? 'text-[var(--status-error-text)]' : 'text-[var(--status-warning-text)]'

  const HeaderIcon = hasOverdue ? AlertCircle : AlertTriangle

  return (
    <div className={`space-y-5 rounded-2xl border-2 p-6 ${cardBgClass}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            hasOverdue ? 'bg-[var(--status-error-bg)]' : 'bg-[var(--status-warning-bg)]'
          }`}
        >
          <HeaderIcon className={`h-5 w-5 ${headerClass}`} />
        </div>
        <div>
          <h3 className={`text-lg font-bold ${headerClass}`}>{t('title')}</h3>
          <p className="text-sm text-gray-600">
            {recommendations.total_missing !== 1
              ? t('petNeedsPlural', { name: petName, count: recommendations.total_missing })
              : t('petNeeds', { name: petName, count: recommendations.total_missing })}
          </p>
        </div>
      </div>

      {/* Core Vaccines (Obligatorias) */}
      {recommendations.core_vaccines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--status-error-text)]">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wide">{t('coreVaccines')}</span>
          </div>
          <div className="space-y-2">
            {recommendations.core_vaccines.map((vaccine) => (
              <VaccineItem key={vaccine.vaccine_code} vaccine={vaccine} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Vaccines (Non-core) */}
      {recommendations.recommended_vaccines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--status-warning-text)]">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wide">{t('recommendedVaccines')}</span>
          </div>
          <div className="space-y-2">
            {recommendations.recommended_vaccines.map((vaccine) => (
              <VaccineItem key={vaccine.vaccine_code} vaccine={vaccine} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Lifestyle Vaccines (Optional) - Show collapsed if any */}
      {recommendations.lifestyle_vaccines.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-gray-600 transition-colors hover:text-gray-800">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            <span className="text-sm font-medium">
              {recommendations.lifestyle_vaccines.length !== 1
                ? t('optionalVaccinesPlural', { count: recommendations.lifestyle_vaccines.length })
                : t('optionalVaccines', { count: recommendations.lifestyle_vaccines.length })}
            </span>
          </summary>
          <div className="mt-3 space-y-2 pl-6">
            {recommendations.lifestyle_vaccines.map((vaccine) => (
              <VaccineItem key={vaccine.vaccine_code} vaccine={vaccine} isOptional t={t} />
            ))}
          </div>
        </details>
      )}

      {/* CTA Button */}
      <Link
        href={`/${clinic}/book?pet=${petId}&service=vacunacion`}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-colors ${
          hasOverdue
            ? 'bg-[var(--status-error)] text-white hover:opacity-90'
            : 'bg-[var(--status-warning)] text-white hover:opacity-90'
        }`}
      >
        <Calendar className="h-4 w-4" />
        {t('scheduleVaccination')}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

interface VaccineItemProps {
  vaccine: VaccineRecommendation
  isOptional?: boolean
  t: (key: string, params?: Record<string, string | number>) => string
}

function VaccineItem({ vaccine, isOptional = false, t }: VaccineItemProps) {
  const StatusIcon =
    vaccine.status === 'overdue' ? AlertCircle : vaccine.status === 'due' ? Clock : Shield

  const statusColorClass =
    vaccine.status === 'overdue'
      ? 'text-[var(--status-error)]'
      : vaccine.status === 'due'
        ? 'text-[var(--status-warning)]'
        : 'text-gray-500'

  const bgColorClass =
    vaccine.status === 'overdue'
      ? 'bg-[var(--status-error-bg)]/50'
      : vaccine.status === 'due'
        ? 'bg-[var(--status-warning-bg)]/50'
        : 'bg-white/50'

  return (
    <div className={`rounded-xl border border-white/50 p-3 ${bgColorClass}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${statusColorClass}`}>
          <StatusIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">{vaccine.vaccine_name}</span>
            {!isOptional && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  vaccine.protocol_type === 'core'
                    ? 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
                    : 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
                }`}
              >
                {vaccine.protocol_type === 'core' ? t('protocolCore') : t('protocolRecommended')}
              </span>
            )}
          </div>

          {/* Diseases prevented */}
          <p className="mt-1 text-sm text-gray-600">
            {t('prevents')} {vaccine.diseases_prevented.join(', ')}
          </p>

          {/* Timing info */}
          <p className={`mt-1 text-xs ${statusColorClass} font-medium`}>{vaccine.reason}</p>

          {/* Notes */}
          {vaccine.notes && <p className="mt-1 text-xs italic text-gray-500">{vaccine.notes}</p>}
        </div>
      </div>
    </div>
  )
}
