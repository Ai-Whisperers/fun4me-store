import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import NewPrescriptionForm from './client'

export default async function NewPrescriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ pet_id?: string }>
}) {
  const { clinic } = await params
  const { pet_id } = await searchParams

  const data = await getClinicData(clinic)
  if (!data) notFound()

  // Verify Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  let patient = null
  if (pet_id) {
    const { data: pet } = await supabase
      .from('pets')
      .select('id, name, species, breed, weight_kg, owner_id')
      .eq('id', pet_id)
      .single()

    if (pet) {
      patient = pet
    }
  }

  // In a real app we'd fetch the Vet's name from their profile table linked to auth.users
  const vetName = user.email ? user.email.split('@')[0] : 'Veterinario'

  return <NewPrescriptionForm clinic={data} patient={patient} vetName={vetName} />
}
