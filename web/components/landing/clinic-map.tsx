'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ExternalLink, MapPin, Navigation, Loader2 } from 'lucide-react'

export interface ClinicLocation {
  id: string
  name: string
  city?: string
  department?: string
  lat: number
  lng: number
  specialties?: string[]
  distance?: number // Distance in km from user
}

interface ClinicMapProps {
  clinics: ClinicLocation[]
}

// Paraguay center coordinates
const PARAGUAY_CENTER: [number, number] = [-23.4425, -58.4438]
const DEFAULT_ZOOM = 7
const USER_LOCATION_ZOOM = 12

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Prop types for dynamically imported Leaflet components
interface MapContainerProps {
  center: [number, number]
  zoom: number
  scrollWheelZoom?: boolean
  style?: React.CSSProperties
  children?: React.ReactNode
}

interface TileLayerProps {
  attribution: string
  url: string
}

interface MarkerProps {
  position: [number, number]
  icon?: L.DivIcon
  children?: React.ReactNode
}

interface PopupProps {
  children?: React.ReactNode
}

interface CircleProps {
  center: [number, number]
  radius: number
  pathOptions?: {
    color?: string
    fillColor?: string
    fillOpacity?: number
    weight?: number
  }
}

// Leaflet component types (dynamically imported)
type LeafletComponents = {
  MapContainer: React.ComponentType<MapContainerProps>
  TileLayer: React.ComponentType<TileLayerProps>
  Marker: React.ComponentType<MarkerProps>
  Popup: React.ComponentType<PopupProps>
  Circle: React.ComponentType<CircleProps>
  useMap: () => L.Map
  L: typeof import('leaflet')
}

export function ClinicMap({ clinics }: ClinicMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [MapComponents, setMapComponents] = useState<LeafletComponents | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [sortedClinics, setSortedClinics] = useState<ClinicLocation[]>(clinics)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    // Dynamically import Leaflet and react-leaflet on client side only
    const loadMap = async () => {
      const L = (await import('leaflet')).default
      const { MapContainer, TileLayer, Marker, Popup, Circle, useMap } = await import('react-leaflet')

      // Fix default marker icon (common Next.js/Webpack issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      setMapComponents({ MapContainer, TileLayer, Marker, Popup, Circle, useMap, L })
      setIsMounted(true)
    }

    loadMap()
  }, [])

  // Request user location on mount
  useEffect(() => {
    if (!isMounted) return

    const requestLocation = () => {
      if (!navigator.geolocation) {
        setLocationStatus('error')
        return
      }

      setLocationStatus('loading')

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(userPos)
          setLocationStatus('success')

          // Sort clinics by distance from user
          const clinicsWithDistance = clinics.map((clinic) => ({
            ...clinic,
            distance: calculateDistance(userPos[0], userPos[1], clinic.lat, clinic.lng),
          }))
          clinicsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0))
          setSortedClinics(clinicsWithDistance)
        },
        () => {
          setLocationStatus('error')
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      )
    }

    // Small delay to let map render first
    const timer = setTimeout(requestLocation, 500)
    return () => clearTimeout(timer)
  }, [isMounted, clinics])

  // Don't render map on server or before Leaflet is loaded
  if (!isMounted || !MapComponents) {
    return (
      <div className="h-[500px] w-full animate-pulse rounded-2xl bg-slate-200 flex items-center justify-center">
        <span className="text-slate-400">Cargando mapa...</span>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, Circle, useMap, L } = MapComponents

  // Map controller component to handle view changes
  function MapController() {
    const map = useMap()

    useEffect(() => {
      if (userLocation && sortedClinics.length > 0) {
        // Get the closest clinic
        const closestClinic = sortedClinics[0]

        // Create bounds that include user location and closest clinics
        const bounds = L.latLngBounds([userLocation])

        // Include closest 3 clinics in bounds (or all if less than 3)
        const clinicsToShow = sortedClinics.slice(0, 3)
        clinicsToShow.forEach((clinic: ClinicLocation) => {
          bounds.extend([clinic.lat, clinic.lng])
        })

        // Fit map to bounds with padding
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
      } else if (userLocation) {
        // Just zoom to user if no clinics nearby
        map.setView(userLocation, USER_LOCATION_ZOOM)
      }
    }, [map])

    return null
  }

  // Create custom teal marker icon for clinics
  const clinicIcon = L.divIcon({
    className: 'custom-clinic-marker',
    html: `
      <div style="
        background-color: #0d9488;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <svg style="transform: rotate(45deg); width: 14px; height: 14px;" viewBox="0 0 24 24" fill="white">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="white" stroke-width="2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

  // Create user location marker icon
  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        background-color: #3b82f6;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })

  // Format distance for display
  const formatDistance = (km: number | undefined): string => {
    if (!km) return ''
    if (km < 1) return `${Math.round(km * 1000)} m`
    return `${km.toFixed(1)} km`
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-200">
      <MapContainer
        center={userLocation || PARAGUAY_CENTER}
        zoom={userLocation ? USER_LOCATION_ZOOM : DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: '500px', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map controller for view updates */}
        <MapController />

        {/* User location marker */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="p-1 text-center">
                  <p className="font-medium text-slate-900">Tu ubicación</p>
                </div>
              </Popup>
            </Marker>
            {/* Optional: accuracy circle */}
            <Circle
              center={userLocation}
              radius={500}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </>
        )}

        {/* Clinic markers */}
        {sortedClinics.map((clinic) => (
          <Marker
            key={clinic.id}
            position={[clinic.lat, clinic.lng]}
            icon={clinicIcon}
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <h3 className="mb-1 font-bold text-slate-900">{clinic.name}</h3>
                {clinic.city && (
                  <p className="mb-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {clinic.city}
                    {clinic.department && `, ${clinic.department}`}
                  </p>
                )}
                {clinic.distance && (
                  <p className="mb-2 flex items-center gap-1 text-sm font-medium text-blue-600">
                    <Navigation className="h-3 w-3" />
                    {formatDistance(clinic.distance)} de distancia
                  </p>
                )}
                {clinic.specialties && clinic.specialties.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {clinic.specialties.slice(0, 3).map((specialty, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/${clinic.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                >
                  Visitar sitio
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Location status indicator */}
      <div className="absolute top-4 right-4 z-[1000]">
        {locationStatus === 'loading' && (
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-slate-600">Buscando ubicación...</span>
          </div>
        )}
        {locationStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 shadow-lg ring-1 ring-blue-200">
            <Navigation className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Mostrando clínicas cercanas</span>
          </div>
        )}
      </div>

      {/* Clinic counter overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-full bg-teal-600 px-4 py-2 shadow-lg">
        <span className="font-bold text-white">{sortedClinics.length}</span>
        <span className="ml-1 text-teal-100">
          {sortedClinics.length === 1 ? 'clínica' : 'clínicas'} en la red
        </span>
      </div>

      {/* Closest clinic indicator (when location available) */}
      {userLocation && sortedClinics.length > 0 && sortedClinics[0].distance && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-white px-4 py-2 shadow-lg ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">Clínica más cercana</p>
          <p className="font-bold text-slate-900">{sortedClinics[0].name}</p>
          <p className="text-sm text-blue-600">{formatDistance(sortedClinics[0].distance)}</p>
        </div>
      )}
    </div>
  )
}
