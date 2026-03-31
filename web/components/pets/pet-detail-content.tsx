'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PetDetailTabs, TabId } from './pet-detail-tabs'
import {
  PetSummaryTab,
  PetVaccinesTab,
  PetHistoryTab,
  PetAppointmentsTab,
  PetDocumentsTab,
  PetFinancesTab,
} from './tabs'
import { uploadPetDocuments, deletePetDocument } from '@/app/actions/pet-documents'

interface Vaccine {
  id: string
  name: string
  vaccine_code?: string | null
  administered_date?: string | null
  next_due_date?: string | null
  status: string
  lot_number?: string | null
  manufacturer?: string | null
  notes?: string | null
}

interface VaccineReaction {
  id: string
  vaccine_id: string
  reaction_type: string
  severity: string
  onset_hours?: number
  notes?: string
}

interface WeightRecord {
  date: string
  weight_kg: number
  age_weeks?: number
}

interface TimelineItem {
  id: string
  created_at: string
  type: 'record' | 'prescription'
  record_type?: string
  title: string
  diagnosis?: string | null
  notes?: string | null
  vitals?: {
    weight?: number
    temp?: number
    hr?: number
    rr?: number
  } | null
  medications?: Array<{
    name: string
    dose: string
    frequency: string
    duration: string
  }>
  attachments?: string[]
  vet_name?: string
}

interface Appointment {
  id: string
  start_time: string
  end_time?: string
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  service?: {
    id: string
    name: string
    category?: string
  } | null
  vet?: {
    id: string
    full_name: string
  } | null
  notes?: string | null
  cancellation_reason?: string | null
}

interface Document {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size?: number
  category: 'medical' | 'lab' | 'xray' | 'vaccine' | 'prescription' | 'other'
  description?: string
  uploaded_by?: string
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  total: number
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void' | 'refunded' | 'cancelled'
  due_date?: string | null
  created_at: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  invoice_id?: string
}

interface Pet {
  id: string
  name: string
  species: string
  breed?: string | null
  sex?: string | null
  birth_date?: string | null
  weight_kg?: number | null
  temperament?: string | null
  allergies?: string[] | string | null
  chronic_conditions?: string[] | null
  existing_conditions?: string | null
  diet_category?: string | null
  diet_notes?: string | null
  vaccines?: Vaccine[]
  vaccine_reactions?: VaccineReaction[]
  primary_vet_name?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
}

interface PetDetailContentProps {
  pet: Pet
  clinic: string
  clinicName?: string
  isStaff: boolean
  weightHistory: WeightRecord[]
  timelineItems: TimelineItem[]
  appointments: Appointment[]
  documents: Document[]
  invoices: Invoice[]
  payments: Payment[]
}

export function PetDetailContent({
  pet,
  clinic,
  clinicName,
  isStaff,
  weightHistory,
  timelineItems,
  appointments,
  documents,
  invoices,
  payments,
}: PetDetailContentProps) {
  const t = useTranslations('pets.detailContent')
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get initial tab from URL or default to summary
  const initialTab = (searchParams.get('tab') as TabId) || 'summary'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Update URL when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams.toString())
    if (tabId === 'summary') {
      params.delete('tab')
    } else {
      params.set('tab', tabId)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : ''
    router.replace(`/${clinic}/portal/pets/${pet.id}${newUrl}`, { scroll: false })
  }

  // Sync with URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabId
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  // Track documents locally for optimistic updates
  const [localDocuments, setLocalDocuments] = useState(documents)
  const [localWeightHistory, setLocalWeightHistory] = useState(weightHistory)

  // Update local documents when props change
  useEffect(() => {
    setLocalDocuments(documents)
  }, [documents])

  // Update local weight history when props change
  useEffect(() => {
    setLocalWeightHistory(weightHistory)
  }, [weightHistory])

  // Refresh weight history from API
  const refreshWeightHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/pets/${pet.id}/weight`)
      if (response.ok) {
        const data = await response.json()
        setLocalWeightHistory(data)
      }
    } catch (error) {
      console.error('Error refreshing weight history:', error)
    }
  }, [pet.id])

  // Handle document upload via server action
  const handleDocumentUpload = useCallback(
    async (files: File[], category: string) => {
      const formData = new FormData()
      formData.set('category', category)
      formData.set('clinic', clinic)
      files.forEach((file) => formData.append('files', file))

      const result = await uploadPetDocuments(pet.id, formData)

      if (!result.success) {
        throw new Error(result.error || t('uploadError'))
      }

      // Update local state with new documents
      if (result.data) {
        const newDocs = result.data
        setLocalDocuments((prev) => [...newDocs, ...prev])
      }
    },
    [pet.id, clinic]
  )

  // Handle document delete via server action
  const handleDocumentDelete = useCallback(
    async (documentId: string) => {
      const result = await deletePetDocument(documentId, clinic)

      if (!result.success) {
        throw new Error(result.error || t('deleteError'))
      }

      // Remove from local state
      setLocalDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    },
    [clinic]
  )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <PetDetailTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'summary' && (
          <PetSummaryTab
            pet={pet}
            weightHistory={localWeightHistory}
            clinic={clinic}
            clinicName={clinicName}
            onWeightUpdated={refreshWeightHistory}
          />
        )}

        {activeTab === 'history' && (
          <PetHistoryTab
            petId={pet.id}
            petName={pet.name}
            timelineItems={timelineItems}
            clinic={clinic}
            isStaff={isStaff}
          />
        )}

        {activeTab === 'vaccines' && (
          <PetVaccinesTab
            petId={pet.id}
            petName={pet.name}
            petSpecies={pet.species}
            petBirthDate={pet.birth_date}
            vaccines={pet.vaccines || []}
            reactions={pet.vaccine_reactions || []}
            clinic={clinic}
            isStaff={isStaff}
          />
        )}

        {activeTab === 'documents' && (
          <PetDocumentsTab
            petId={pet.id}
            petName={pet.name}
            documents={localDocuments}
            clinic={clinic}
            onUpload={handleDocumentUpload}
            onDelete={handleDocumentDelete}
          />
        )}

        {activeTab === 'appointments' && (
          <PetAppointmentsTab
            petId={pet.id}
            petName={pet.name}
            appointments={appointments}
            clinic={clinic}
          />
        )}

        {activeTab === 'finances' && (
          <PetFinancesTab
            petId={pet.id}
            petName={pet.name}
            invoices={invoices}
            payments={payments}
            clinic={clinic}
          />
        )}
      </div>
    </div>
  )
}
