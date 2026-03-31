/**
 * Pet Summary Tab Component
 *
 * Main orchestrator for pet profile summary view.
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { GrowthChart } from '@/components/clinical/growth-chart'
import { WeightRecordingModal } from '@/components/pets/weight-recording-modal'
import { usePetSummaryData } from './use-pet-summary-data'
import { QuickStatsGrid } from './QuickStatsGrid'
import { HealthAlerts } from './HealthAlerts'
import { VaccinesSidebar } from './VaccinesSidebar'
import { DietInfo } from './DietInfo'
import { EmergencyContacts } from './EmergencyContacts'
import type { PetSummaryTabProps } from './types'

export function PetSummaryTab({
  pet,
  weightHistory,
  clinic,
  onWeightUpdated,
}: PetSummaryTabProps): React.ReactElement {
  const t = useTranslations('pets.tabs.summary')
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false)

  const {
    missingMandatoryVaccines,
    isLoadingVaccines,
    displayedWeight,
    setDisplayedWeight,
    allergies,
    conditions,
    upcomingVaccines,
    overdueVaccines,
  } = usePetSummaryData({ pet })

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content - Left Column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Quick Stats */}
        <QuickStatsGrid
          pet={pet}
          displayedWeight={displayedWeight}
          isLoadingVaccines={isLoadingVaccines}
          overdueVaccines={overdueVaccines}
          missingMandatoryVaccines={missingMandatoryVaccines}
          onOpenWeightModal={() => setIsWeightModalOpen(true)}
        />

        {/* Health Alerts */}
        <HealthAlerts
          allergies={allergies}
          conditions={conditions}
          overdueVaccines={overdueVaccines}
          missingMandatoryVaccines={missingMandatoryVaccines}
        />

        {/* Growth Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h3 className="mb-4 font-bold text-[var(--text-primary)]">{t('growthChart')}</h3>
          <GrowthChart
            breed={pet.breed || t('mixedBreed')}
            gender={(pet.sex === 'male' || pet.sex === 'female' ? pet.sex : 'male') as 'male' | 'female'}
            patientRecords={weightHistory}
          />
        </div>
      </div>

      {/* Sidebar - Right Column */}
      <div className="space-y-6">
        {/* Upcoming Vaccines */}
        <VaccinesSidebar
          petId={pet.id}
          clinic={clinic}
          upcomingVaccines={upcomingVaccines}
          missingMandatoryVaccines={missingMandatoryVaccines}
        />

        {/* Diet Info */}
        <DietInfo dietCategory={pet.diet_category} dietNotes={pet.diet_notes} />

        {/* Emergency Contact */}
        <EmergencyContacts
          primaryVetName={pet.primary_vet_name}
          emergencyContactName={pet.emergency_contact_name}
          emergencyContactPhone={pet.emergency_contact_phone}
        />
      </div>

      {/* Weight Recording Modal */}
      <WeightRecordingModal
        petId={pet.id}
        petName={pet.name}
        currentWeight={displayedWeight}
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSuccess={(newWeight) => {
          setDisplayedWeight(newWeight)
          onWeightUpdated?.()
        }}
      />
    </div>
  )
}
