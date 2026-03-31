import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HospitalDashboard } from '@/components/hospital/hospital-dashboard'
import { requireFeature } from '@/lib/features/server'
import { UpgradePromptServer } from '@/components/dashboard/upgrade-prompt-server'

interface Props {
  params: Promise<{ clinic: string }>
}

type AcuityLevel = 'critical' | 'urgent' | 'routine'

interface HospitalizationRaw {
  id: string
  hospitalization_number: string
  hospitalization_type: string
  acuity_level: AcuityLevel
  admission_date: string
  status: string
  pets: { name: string; species: string } | { name: string; species: string }[]
  kennels:
    | { kennel_number: string; location: string }
    | { kennel_number: string; location: string }[]
    | null
}

interface TransformedHospitalization {
  id: string
  hospitalization_number: string
  hospitalization_type: string
  acuity_level: AcuityLevel
  admission_date: string
  pet: { name: string; species: string }
  kennel: { kennel_number: string; location: string } | null
}

export default async function HospitalPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Staff check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role) || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Feature gate: Hospitalization requires 'hospitalization' feature
  const featureError = await requireFeature(profile.tenant_id, 'hospitalization')
  if (featureError) {
    return (
      <UpgradePromptServer
        feature="hospitalization"
        title="Módulo de Hospitalización"
        description="Gestiona pacientes hospitalizados, monitorea signos vitales y lleva registro de tratamientos."
        clinic={clinic}
      />
    )
  }

  // Fetch initial data server-side
  const { data: hospitalizations } = await supabase
    .from('hospitalizations')
    .select(
      `
      id,
      hospitalization_number,
      hospitalization_type,
      acuity_level,
      admission_date,
      status,
      pets!inner (
        name,
        species
      ),
      kennels (
        kennel_number,
        location
      )
    `
    )
    .eq('tenant_id', clinic)
    .eq('status', 'admitted')
    .order('admission_date', { ascending: false })

  // Fetch kennel stats
  const { data: kennels } = await supabase
    .from('kennels')
    .select('id, kennel_status')
    .eq('tenant_id', clinic)

  const availableKennels = kennels?.filter((k) => k.kennel_status === 'available').length || 0

  // Transform data
  const transformedHospitalizations: TransformedHospitalization[] = (
    (hospitalizations || []) as HospitalizationRaw[]
  )
    .filter((h: HospitalizationRaw) => {
      // Ensure pet exists before including
      const pet = Array.isArray(h.pets) ? h.pets[0] : h.pets
      return pet !== undefined && pet !== null
    })
    .map((h: HospitalizationRaw) => ({
      id: h.id,
      hospitalization_number: h.hospitalization_number,
      hospitalization_type: h.hospitalization_type,
      acuity_level: h.acuity_level,
      admission_date: h.admission_date,
      pet: (Array.isArray(h.pets) ? h.pets[0] : h.pets) as { name: string; species: string },
      kennel: Array.isArray(h.kennels) ? h.kennels[0] : h.kennels,
    }))

  // Calculate stats
  const stats = {
    total_active: transformedHospitalizations.length,
    by_acuity: {
      critical: transformedHospitalizations.filter(
        (h: TransformedHospitalization) => h.acuity_level === 'critical'
      ).length,
      urgent: transformedHospitalizations.filter(
        (h: TransformedHospitalization) => h.acuity_level === 'urgent'
      ).length,
      routine: transformedHospitalizations.filter(
        (h: TransformedHospitalization) => h.acuity_level === 'routine'
      ).length,
    },
    available_kennels: availableKennels,
  }

  return (
    <HospitalDashboard
      clinic={clinic}
      initialHospitalizations={transformedHospitalizations}
      initialStats={stats}
    />
  )
}
