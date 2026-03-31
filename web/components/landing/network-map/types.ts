/**
 * Network Map Types
 *
 * Type definitions for clinic network map components.
 */

export interface ClinicLocation {
  id: string
  name: string
  address: string
  city: string
  neighborhood: string
  coordinates: { lat: number; lng: number }
  phone: string
  hours: {
    weekdays: string
    saturday: string
    sunday: string
  }
  specialties: string[]
  rating: number
  isOpen?: boolean
  distance?: string
  emergency24h: boolean
}
