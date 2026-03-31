/**
 * Network Map Component
 *
 * Main orchestrator for the clinic network map section.
 */

'use client'

import { useState, useMemo } from 'react'
import { MapPin } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/whatsapp'
import { clinicLocations } from './data'
import { ClinicListItem } from './ClinicListItem'
import { SearchFilters } from './SearchFilters'
import { MapDisplay } from './MapDisplay'
import type { ClinicLocation } from './types'

export function NetworkMap() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null)
  const [selectedClinic, setSelectedClinic] = useState<ClinicLocation | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filteredClinics = useMemo(() => {
    return clinicLocations.filter((clinic) => {
      const matchesSearch =
        searchQuery === '' ||
        clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clinic.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clinic.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCity = !selectedCity || clinic.city === selectedCity
      const matchesSpecialty = !selectedSpecialty || clinic.specialties.includes(selectedSpecialty)

      return matchesSearch && matchesCity && matchesSpecialty
    })
  }, [searchQuery, selectedCity, selectedSpecialty])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCity(null)
    setSelectedSpecialty(null)
  }

  const hasActiveFilters = Boolean(searchQuery || selectedCity || selectedSpecialty)

  return (
    <section
      id="mapa"
      className="relative overflow-hidden bg-gradient-to-b from-[var(--bg-dark)] to-[var(--bg-dark-alt)] py-20 md:py-28"
    >
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
            Encuentra tu Veterinaria
          </span>
          <h2 className="mb-6 text-3xl font-black text-white md:text-4xl lg:text-5xl">
            Red de Clinicas Vetic
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Busca la clinica mas cercana a vos. Todas con el mismo nivel de tecnologia y
            profesionalismo.
          </p>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          selectedSpecialty={selectedSpecialty}
          onSpecialtyChange={setSelectedSpecialty}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Map and List Container */}
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          {/* Clinic List */}
          <div className="order-2 lg:order-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-white">
                {filteredClinics.length}{' '}
                {filteredClinics.length === 1 ? 'clinica encontrada' : 'clinicas encontradas'}
              </h3>
            </div>

            <div className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-h-[500px] space-y-3 overflow-y-auto pr-2">
              {filteredClinics.length > 0 ? (
                filteredClinics.map((clinic) => (
                  <ClinicListItem
                    key={clinic.id}
                    clinic={clinic}
                    isSelected={selectedClinic?.id === clinic.id}
                    onClick={() => setSelectedClinic(clinic)}
                  />
                ))
              ) : (
                <div className="py-12 text-center">
                  <MapPin className="mx-auto mb-4 h-12 w-12 text-white/20" />
                  <p className="text-white/50">No se encontraron clinicas con esos criterios.</p>
                  <button onClick={clearFilters} className="mt-4 text-[var(--primary)] hover:underline">
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map Display */}
          <MapDisplay
            clinics={filteredClinics}
            selectedClinic={selectedClinic}
            onSelectClinic={setSelectedClinic}
          />
        </div>

        {/* Pet Owner CTA */}
        <div className="mt-12 text-center">
          <p className="mb-4 text-white/50">¿Tu veterinaria favorita no esta en la red?</p>
          <a
            href={getWhatsAppUrl('Hola! Me gustaria que mi veterinaria use Vetic')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 font-medium text-white transition-all hover:bg-white/10"
          >
            Recomendala
          </a>
        </div>
      </div>
    </section>
  )
}
