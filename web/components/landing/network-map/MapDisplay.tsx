/**
 * Map Display Component
 *
 * Visual map representation with clinic markers.
 */

'use client'

import { MapPin, Navigation } from 'lucide-react'
import { ClinicDetailPanel } from './ClinicDetailPanel'
import type { ClinicLocation } from './types'

interface MapDisplayProps {
  clinics: ClinicLocation[]
  selectedClinic: ClinicLocation | null
  onSelectClinic: (clinic: ClinicLocation | null) => void
}

// Static marker positions for the visual map
const MARKER_POSITIONS = [
  { top: '35%', left: '45%' },
  { top: '55%', left: '60%' },
]

export function MapDisplay({ clinics, selectedClinic, onSelectClinic }: MapDisplayProps) {
  return (
    <div className="relative order-1 lg:order-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#1a2744] lg:aspect-auto lg:h-[500px]">
        {/* Map Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-full w-full">
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />

            {/* Clinic Markers */}
            {clinics.map((clinic, idx) => {
              const pos = MARKER_POSITIONS[idx] || { top: '50%', left: '50%' }

              return (
                <button
                  key={clinic.id}
                  onClick={() => onSelectClinic(clinic)}
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 transform transition-all ${
                    selectedClinic?.id === clinic.id ? 'scale-125' : 'hover:scale-110'
                  }`}
                  style={{ top: pos.top, left: pos.left }}
                >
                  <div
                    className={`relative ${selectedClinic?.id === clinic.id ? 'animate-pulse' : ''}`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ${
                        selectedClinic?.id === clinic.id ? 'bg-[var(--primary)]' : 'bg-[var(--secondary)]'
                      }`}
                    >
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    {/* Pulse Effect */}
                    <div
                      className={`absolute inset-0 animate-ping rounded-full opacity-20 ${
                        selectedClinic?.id === clinic.id ? 'bg-[var(--primary)]' : 'bg-[var(--secondary)]'
                      }`}
                    />
                  </div>
                  {/* Marker Label */}
                  <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-[var(--bg-dark)]/90 rounded px-2 py-1 text-xs font-medium text-white">
                      {clinic.name}
                    </span>
                  </div>
                </button>
              )
            })}

            {/* Paraguay Outline Hint */}
            <div className="absolute inset-4 rounded-3xl border-2 border-dashed border-white/5" />

            {/* Asuncion Label */}
            <div className="absolute left-1/3 top-1/4 text-sm font-medium text-white/20">Asuncion</div>
          </div>
        </div>

        {/* Selected Clinic Detail Overlay */}
        {selectedClinic && (
          <ClinicDetailPanel clinic={selectedClinic} onClose={() => onSelectClinic(null)} />
        )}

        {/* No Selection Hint */}
        {!selectedClinic && (
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-sm text-white/40">Selecciona una clinica para ver detalles</p>
          </div>
        )}
      </div>

      {/* Google Maps Link */}
      <div className="mt-4 text-center">
        <a
          href="https://www.google.com/maps/search/veterinaria+Vetic+paraguay"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-[var(--primary)]"
        >
          <Navigation className="h-4 w-4" />
          Ver en Google Maps
        </a>
      </div>
    </div>
  )
}
