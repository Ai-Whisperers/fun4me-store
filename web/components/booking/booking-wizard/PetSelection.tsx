'use client'

import React from 'react'
import { ArrowLeft, ChevronRight, Dog } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useBookingStore } from '@/lib/store/booking-store'

/**
 * Step 2: Pet selection component
 */
export function PetSelection() {
  const router = useRouter()
  const { pets, clinicId, updateSelection, setStep } = useBookingStore()
  const t = useTranslations('booking.wizard.petSelection')

  const handlePetSelect = (petId: string) => {
    updateSelection({ petId })
    setStep('confirm') // Go directly to confirm (no datetime step - clinic will schedule)
  }

  return (
    <div className="animate-in slide-in-from-right-8 relative z-10 duration-500">
      <div className="mb-10 flex items-center gap-4">
        <button
          onClick={() => setStep('service')}
          aria-label={t('backLabel')}
          className="rounded-2xl bg-gray-50 p-3 text-gray-400 transition-all hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="text-3xl font-black text-gray-900">{t('title')}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {pets.length > 0 ? (
          pets.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePetSelect(p.id)}
              className="group flex items-center gap-5 rounded-[2rem] border border-gray-100 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-xl"
            >
              <div className="shadow-[var(--primary)]/20 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[var(--primary)] text-2xl font-black text-white shadow-lg">
                {p.name[0]}
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-xl font-black text-gray-900">{p.name}</h3>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500">
                  {p.species} • {p.breed}
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-gray-200 transition-all group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
            </button>
          ))
        ) : (
          <div className="col-span-2 rounded-[2.5rem] border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
            <Dog className="mx-auto mb-6 h-16 w-16 text-gray-200" />
            <p className="mb-8 text-lg font-bold text-gray-500">{t('emptyTitle')}</p>
            <button
              onClick={() => router.push(`/${clinicId}/portal/pets/new`)}
              className="rounded-2xl bg-[var(--primary)] px-8 py-4 font-black text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              {t('registerPet')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
