'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

// Dynamic import to avoid SSR issues with Leaflet
const SingleClinicMap = dynamic(
  () => import('./single-clinic-map').then((mod) => mod.SingleClinicMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] w-full animate-pulse items-center justify-center rounded-2xl bg-slate-200">
        <div className="text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <span className="text-slate-400">Cargando mapa...</span>
        </div>
      </div>
    ),
  }
)

interface ClinicLocationMapProps {
  clinicName: string
  address: string
  lat: number
  lng: number
  googleMapsId?: string
  mapButtonLabel?: string
}

export function ClinicLocationMap(props: ClinicLocationMapProps) {
  return <SingleClinicMap {...props} />
}
