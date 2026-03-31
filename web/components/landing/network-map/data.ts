/**
 * Network Map Data
 *
 * Clinic location data and specialty configurations.
 */

import { Stethoscope, Clock, Syringe, TestTube } from 'lucide-react'
import type { ClinicLocation } from './types'

export const clinicLocations: ClinicLocation[] = [
  {
    id: 'terrapet',
    name: 'Veterinaria Adris',
    address: 'Av. Santa Teresa 1234',
    city: 'Asuncion',
    neighborhood: 'Villa Morra',
    coordinates: { lat: -25.2637, lng: -57.5759 },
    phone: '+595 981 123 456',
    hours: {
      weekdays: '08:00 - 20:00',
      saturday: '08:00 - 18:00',
      sunday: 'Urgencias 24hs',
    },
    specialties: ['Clinica General', 'Urgencias', 'Cirugia', 'Vacunacion'],
    rating: 4.9,
    emergency24h: true,
  },
  {
    id: 'petlife',
    name: 'PetLife Center',
    address: 'Ruta 2 Km 14',
    city: 'Mariano Roque Alonso',
    neighborhood: 'Centro',
    coordinates: { lat: -25.215, lng: -57.518 },
    phone: '+595 971 999 888',
    hours: {
      weekdays: '07:00 - 19:00',
      saturday: '08:00 - 14:00',
      sunday: 'Cerrado',
    },
    specialties: ['Diagnostico', 'Ecografia', 'Radiologia', 'Laboratorio'],
    rating: 4.8,
    emergency24h: false,
  },
]

export const specialtyIcons: Record<string, React.ElementType> = {
  'Clinica General': Stethoscope,
  Urgencias: Clock,
  Cirugia: Stethoscope,
  Vacunacion: Syringe,
  Diagnostico: TestTube,
  Ecografia: TestTube,
  Radiologia: TestTube,
  Laboratorio: TestTube,
}

export const allCities = [...new Set(clinicLocations.map((c) => c.city))]
export const allSpecialties = [...new Set(clinicLocations.flatMap((c) => c.specialties))]
