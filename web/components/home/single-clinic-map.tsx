'use client'

import { useEffect, useState } from 'react'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'

interface SingleClinicMapProps {
  clinicName: string
  address: string
  lat: number
  lng: number
  googleMapsId?: string
  mapButtonLabel?: string
}

export function SingleClinicMap({
  clinicName,
  address,
  lat,
  lng,
  googleMapsId,
  mapButtonLabel = 'Ver en Google Maps',
}: SingleClinicMapProps) {
  // Prop types for dynamically imported Leaflet components
  interface MapContainerProps {
    center: [number, number]
    zoom: number
    scrollWheelZoom?: boolean
    dragging?: boolean
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

  type LeafletComponents = {
    MapContainer: React.ComponentType<MapContainerProps>
    TileLayer: React.ComponentType<TileLayerProps>
    Marker: React.ComponentType<MarkerProps>
    Popup: React.ComponentType<PopupProps>
    L: typeof import('leaflet')
  }

  const [isMounted, setIsMounted] = useState(false)
  const [MapComponents, setMapComponents] = useState<LeafletComponents | null>(null)

  useEffect(() => {
    // Dynamically import Leaflet and react-leaflet on client side only
    const loadMap = async () => {
      const L = (await import('leaflet')).default
      const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet')

      // Fix default marker icon (common Next.js/Webpack issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      setMapComponents({ MapContainer, TileLayer, Marker, Popup, L })
      setIsMounted(true)
    }

    loadMap()
  }, [])

  // Loading state
  if (!isMounted || !MapComponents) {
    return (
      <div className="flex h-full min-h-[400px] w-full animate-pulse items-center justify-center rounded-2xl bg-slate-200">
        <div className="text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <span className="text-slate-400">Cargando mapa...</span>
        </div>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = MapComponents

  // Create custom clinic marker icon matching brand colors
  const clinicIcon = L.divIcon({
    className: 'custom-clinic-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, var(--primary, #0d9488) 0%, var(--primary-dark, #0f766e) 100%);
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 4px solid white;
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px;" viewBox="0 0 24 24" fill="white">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  })

  // Google Maps URL
  const googleMapsUrl = googleMapsId
    ? `https://www.google.com/maps/place/?q=place_id:${googleMapsId}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

  // Directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  return (
    <div className="relative h-full min-h-[400px] w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={true}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[lat, lng]} icon={clinicIcon}>
          <Popup>
            <div className="min-w-[220px] p-2">
              <h3 className="mb-1 text-base font-bold text-slate-900">{clinicName}</h3>
              <p className="mb-3 flex items-start gap-1.5 text-sm text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {address}
              </p>
              <div className="flex gap-2">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                >
                  <Navigation className="h-4 w-4" />
                  Cómo llegar
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Overlay button at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] bg-gradient-to-t from-black/60 via-black/30 to-transparent p-6 pt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-[var(--text-primary)] shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            <MapPin className="h-5 w-5 text-[var(--primary)]" />
            {mapButtonLabel}
            <ExternalLink className="h-4 w-4 text-[var(--text-muted)]" />
          </a>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:opacity-90"
          >
            <Navigation className="h-5 w-5" />
            Cómo llegar
          </a>
        </div>
      </div>

      {/* Clinic info card overlay */}
      <div className="absolute left-4 top-4 z-[1000] max-w-[250px] rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur-sm">
        <h3 className="mb-1 font-bold text-[var(--text-primary)]">{clinicName}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{address}</p>
      </div>
    </div>
  )
}
