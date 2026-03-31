import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { EditPetForm } from '@/components/pets/edit-pet-form'
import Link from 'next/link'
import * as Icons from 'lucide-react'

interface Props {
  params: Promise<{ clinic: string; id: string }>
}

export default async function EditPetPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic, id } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Get user profile for role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  // Fetch pet
  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!pet) {
    notFound()
  }

  // Verify access: must be owner or staff of same tenant
  const isOwner = pet.owner_id === user.id
  const isStaff = profile?.role === 'vet' || profile?.role === 'admin'
  const sameTenant = profile?.tenant_id === pet.tenant_id

  if (!isOwner && !(isStaff && sameTenant)) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Transform database fields to form-expected format
  const formPet = {
    ...pet,
    // Map microchip_number to microchip_id (form field name)
    microchip_id: pet.microchip_number || pet.microchip_id || null,
    // Convert allergies array to comma-separated string
    allergies: Array.isArray(pet.allergies) ? pet.allergies.join(', ') : pet.allergies || null,
    // Convert chronic_conditions array to string (as existing_conditions)
    existing_conditions: Array.isArray(pet.chronic_conditions)
      ? pet.chronic_conditions.join(', ')
      : pet.existing_conditions || pet.chronic_conditions || null,
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${clinic}/portal/pets/${id}`}
          className="rounded-xl p-2 transition-colors hover:bg-white"
        >
          <Icons.ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
        </Link>
        <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">
          Editar Mascota
        </h1>
      </div>

      <EditPetForm pet={formPet} clinic={clinic} />
    </div>
  )
}
