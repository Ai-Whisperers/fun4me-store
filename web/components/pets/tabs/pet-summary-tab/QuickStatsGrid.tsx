/**
 * Quick Stats Grid Component
 *
 * Displays age, weight, temperament, and vaccine stats.
 */

'use client'

import { Calendar, Weight, Heart, Syringe, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { PetData, MissingVaccine, Vaccine } from './types'

interface QuickStatsGridProps {
  pet: PetData
  displayedWeight: number | null
  isLoadingVaccines: boolean
  overdueVaccines: Vaccine[]
  missingMandatoryVaccines: MissingVaccine[]
  onOpenWeightModal: () => void
}

export function QuickStatsGrid({
  pet,
  displayedWeight,
  isLoadingVaccines,
  overdueVaccines,
  missingMandatoryVaccines,
  onOpenWeightModal,
}: QuickStatsGridProps) {
  const t = useTranslations('pets.tabs.summary')
  const tCard = useTranslations('pets.card')

  // Calculate age
  const calculateAge = (): string => {
    if (!pet.birth_date) return t('unknownAge')
    const birth = new Date(pet.birth_date)
    const today = new Date()
    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()
    if (months < 0) {
      years--
      months += 12
    }
    if (years > 0) {
      if (months > 0) {
        return `${years} ${years === 1 ? tCard('year') : tCard('years')}, ${months} ${months === 1 ? tCard('month') : tCard('months')}`
      }
      return `${years} ${years === 1 ? tCard('year') : tCard('years')}`
    }
    return months > 0 ? `${months} ${months === 1 ? tCard('month') : tCard('months')}` : tCard('baby')
  }

  const temperamentLabels: Record<string, string> = {
    friendly: t('temperamentFriendly'),
    shy: t('temperamentShy'),
    aggressive: t('temperamentAggressive'),
    calm: t('temperamentCalm'),
    unknown: t('temperamentUnknown'),
  }

  const renderVaccineStatus = () => {
    if (isLoadingVaccines) {
      return <p className="font-bold text-gray-400">{t('checking')}</p>
    }

    const overdueCount = overdueVaccines.length
    const missingOverdueCount = missingMandatoryVaccines.filter((v) => v.status === 'overdue').length
    const missingDueCount = missingMandatoryVaccines.filter((v) => v.status === 'due').length
    const missingCount = missingMandatoryVaccines.filter((v) => v.status === 'missing').length
    const totalOverdue = overdueCount + missingOverdueCount

    if (totalOverdue > 0) {
      return (
        <p className="font-bold text-[var(--status-error)]">
          {totalOverdue > 1 ? t('overdueCountPlural', { count: totalOverdue }) : t('overdueCount', { count: totalOverdue })}
        </p>
      )
    }
    if (missingDueCount > 0) {
      return (
        <p className="font-bold text-[var(--status-warning)]">
          {missingDueCount > 1 ? t('pendingCountPlural', { count: missingDueCount }) : t('pendingCount', { count: missingDueCount })}
        </p>
      )
    }
    if (missingCount > 0) {
      return (
        <p className="font-bold text-[var(--status-info)]">
          {t('toApply', { count: missingCount })}
        </p>
      )
    }
    const appliedCount = pet.vaccines?.filter((v) => v.status === 'verified').length || 0
    if (appliedCount > 0) {
      return (
        <p className="font-bold text-[var(--status-success)]">
          {appliedCount > 1 ? t('appliedCountPlural', { count: appliedCount }) : t('appliedCount', { count: appliedCount })}
        </p>
      )
    }
    return <p className="font-bold text-[var(--status-success)]">{t('upToDate')}</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Age */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="mb-1 flex items-center gap-2 text-gray-500">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium">{t('age')}</span>
        </div>
        <p className="font-bold text-[var(--text-primary)]">{calculateAge()}</p>
      </div>

      {/* Weight */}
      <button
        type="button"
        onClick={onOpenWeightModal}
        className="group rounded-xl border border-gray-100 bg-white p-4 text-left transition-all hover:border-[var(--primary)] hover:shadow-md"
      >
        <div className="mb-1 flex items-center justify-between text-gray-500">
          <div className="flex items-center gap-2">
            <Weight className="h-4 w-4" />
            <span className="text-xs font-medium">{t('weight')}</span>
          </div>
          <Plus className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="font-bold text-[var(--text-primary)]">
          {displayedWeight ? `${displayedWeight} kg` : t('notRecorded')}
        </p>
      </button>

      {/* Temperament */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="mb-1 flex items-center gap-2 text-gray-500">
          <Heart className="h-4 w-4" />
          <span className="text-xs font-medium">{t('temperament')}</span>
        </div>
        <p className="font-bold text-[var(--text-primary)]">
          {pet.temperament
            ? temperamentLabels[pet.temperament] || pet.temperament
            : t('notDefined')}
        </p>
      </div>

      {/* Vaccines */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="mb-1 flex items-center gap-2 text-gray-500">
          <Syringe className="h-4 w-4" />
          <span className="text-xs font-medium">{t('vaccines')}</span>
        </div>
        {renderVaccineStatus()}
      </div>
    </div>
  )
}
