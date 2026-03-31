'use client'

import dynamic from 'next/dynamic'
import { MapPin, ExternalLink, Building2, Navigation } from 'lucide-react'
import Link from 'next/link'
import type { ClinicLocation } from '@/components/landing/clinic-map'

// Dynamic import to avoid SSR issues with Leaflet
const ClinicMap = dynamic(
  () => import('@/components/landing/clinic-map').then((mod) => mod.ClinicMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full animate-pulse rounded-2xl bg-slate-200" />
    ),
  }
)

// Format distance for display
function formatDistance(km: number | undefined): string {
  if (!km) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function ClinicCard({ clinic, showDistance }: { clinic: ClinicLocation; showDistance?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-bold text-slate-900">{clinic.name}</h3>
          {clinic.city && (
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {clinic.city}
              {clinic.department && `, ${clinic.department}`}
            </p>
          )}
          {showDistance && clinic.distance && (
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-blue-600">
              <Navigation className="h-3.5 w-3.5" />
              {formatDistance(clinic.distance)} de distancia
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
          <Building2 className="h-5 w-5 text-teal-600" />
        </div>
      </div>

      {clinic.specialties && clinic.specialties.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {clinic.specialties.slice(0, 3).map((specialty, index) => (
            <span
              key={index}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {specialty}
            </span>
          ))}
        </div>
      )}

      <Link
        href={`/${clinic.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 transition-colors hover:text-teal-700"
      >
        Visitar sitio
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

interface RedClientProps {
  clinics: ClinicLocation[]
}

export function RedClient({ clinics }: RedClientProps) {
  return (
    <>
      {/* Map Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-5xl">
            {/* Interactive Map */}
            <ClinicMap clinics={clinics} />

            {/* Stats below map */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-center">
                <div className="mb-1 text-3xl font-bold text-teal-600">
                  {clinics.length}+
                </div>
                <div className="text-sm text-slate-600">Clínicas activas</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-center">
                <div className="mb-1 text-3xl font-bold text-teal-600">17</div>
                <div className="text-sm text-slate-600">Departamentos</div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-center">
                <div className="mb-1 text-3xl font-bold text-teal-600">24/7</div>
                <div className="text-sm text-slate-600">Soporte disponible</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinic List */}
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">
              Clínicas en la Red
            </h2>
            <p className="text-slate-600">
              Haz clic en cualquier clínica para visitar su sitio web.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {clinics.map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
