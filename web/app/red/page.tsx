import { createClient } from '@/lib/supabase/server'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
  PageHeader,
} from '@/components/landing'
import type { ClinicLocation } from '@/components/landing/clinic-map'
import { RedClient } from './client'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

interface ClinicFromDB {
  id: string
  name: string
  city?: string
  department?: string
  latitude?: number
  longitude?: number
  specialties?: string[]
  is_active: boolean
}

// Demo clinic data with real coordinates in Paraguay
const demoClinics: ClinicLocation[] = [
  {
    id: 'terrapet',
    name: 'Veterinaria Adris',
    city: 'Asunción',
    department: 'Central',
    lat: -25.2867,
    lng: -57.5802,
    specialties: ['Consulta General', 'Cirugía', 'Tienda'],
  },
  {
    id: 'petlife',
    name: 'PetLife Center',
    city: 'San Lorenzo',
    department: 'Central',
    lat: -25.3389,
    lng: -57.5092,
    specialties: ['Consulta General', 'Peluquería', 'Guardería'],
  },
]

async function getClinics(): Promise<ClinicLocation[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, city, department, latitude, longitude, specialties, is_active')
      .eq('is_active', true)
      .order('name')

    if (error || !data || data.length === 0) {
      return demoClinics
    }

    // Map DB results to ClinicLocation format
    // Non-null assertions safe: filter ensures latitude and longitude exist
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const clinicsWithCoords: ClinicLocation[] = (data as ClinicFromDB[])
      .filter((clinic) => clinic.latitude && clinic.longitude)
      .map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        city: clinic.city,
        department: clinic.department,
        lat: clinic.latitude!,
        lng: clinic.longitude!,
        specialties: clinic.specialties,
      }))
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    // If no clinics have coordinates, fall back to demo data
    if (clinicsWithCoords.length === 0) {
      return demoClinics
    }

    return clinicsWithCoords
  } catch (_error: unknown) {
    return demoClinics
  }
}

export default async function RedPage() {
  const clinics = await getClinics()

  return (
    <main className="min-h-screen bg-slate-50">
      <LandingNav />

      <PageHeader
        badge="Red de Clínicas"
        title="Veterinarias que usan"
        highlight="Vetic."
        description="Conoce las clínicas que ya confían en Vetic para gestionar su día a día. Cada mes se suman más."
      />

      {/* Client component with map and clinic list */}
      <RedClient clinics={clinics} />

      {/* CTA */}
      <section className="bg-teal-600 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center md:px-6">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            ¿Querés que tu clínica aparezca aquí?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-teal-100">
            Unite a la red de veterinarias que eligen Vetic para crecer.
          </p>
          <a
            href={getWhatsAppUrl(landingMessages.joinNetwork())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-teal-600 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            Unirme a Vetic
          </a>
        </div>
      </section>

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
