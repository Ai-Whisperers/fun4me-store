/**
 * Clinic Detail Panel Component
 *
 * Overlay panel showing detailed clinic information.
 */

'use client'

import Link from 'next/link'
import { MapPin, Clock, Phone, ExternalLink, Star, Navigation, X, Stethoscope } from 'lucide-react'
import { specialtyIcons } from './data'
import type { ClinicLocation } from './types'

interface ClinicDetailPanelProps {
  clinic: ClinicLocation
  onClose: () => void
}

export function ClinicDetailPanel({ clinic, onClose }: ClinicDetailPanelProps) {
  return (
    <div className="bg-[var(--bg-dark)]/95 absolute inset-0 z-20 overflow-y-auto p-4 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/60 hover:bg-white/20 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="pt-8">
        <h3 className="mb-2 text-2xl font-bold text-white">{clinic.name}</h3>
        <p className="mb-6 flex items-center gap-1 text-white/50">
          <MapPin className="h-4 w-4" />
          {clinic.address}, {clinic.city}
        </p>

        {/* Rating */}
        <div className="mb-6 flex items-center gap-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                i < Math.floor(clinic.rating)
                  ? 'fill-[var(--primary)] text-[var(--primary)]'
                  : 'text-white/20'
              }`}
            />
          ))}
          <span className="font-bold text-white">{clinic.rating}</span>
        </div>

        {/* Hours */}
        <div className="mb-6">
          <h4 className="mb-2 flex items-center gap-2 font-bold text-white">
            <Clock className="h-4 w-4 text-[var(--primary)]" />
            Horarios
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Lun - Vie</span>
              <span className="text-white">{clinic.hours.weekdays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Sabado</span>
              <span className="text-white">{clinic.hours.saturday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Domingo</span>
              <span className="text-white">{clinic.hours.sunday}</span>
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div className="mb-6">
          <h4 className="mb-2 font-bold text-white">Especialidades</h4>
          <div className="flex flex-wrap gap-2">
            {clinic.specialties.map((spec, idx) => {
              const Icon = specialtyIcons[spec] || Stethoscope
              return (
                <span
                  key={idx}
                  className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-sm text-white/70"
                >
                  <Icon className="h-3 w-3" />
                  {spec}
                </span>
              )
            })}
          </div>
        </div>

        {/* Contact */}
        <div className="mb-6">
          <h4 className="mb-2 flex items-center gap-2 font-bold text-white">
            <Phone className="h-4 w-4 text-[var(--primary)]" />
            Contacto
          </h4>
          <a
            href={`tel:${clinic.phone.replace(/\s/g, '')}`}
            className="text-[var(--primary)] hover:underline"
          >
            {clinic.phone}
          </a>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href={`/${clinic.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-3 font-bold text-[var(--bg-dark)]"
          >
            Visitar Sitio
            <ExternalLink className="h-4 w-4" />
          </Link>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.coordinates.lat},${clinic.coordinates.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-bold text-white transition-all hover:bg-white/20"
          >
            <Navigation className="h-4 w-4" />
            Como Llegar
          </a>
        </div>
      </div>
    </div>
  )
}
