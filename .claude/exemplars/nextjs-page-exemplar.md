# Next.js Page Pattern Exemplar

## Overview

Pattern for creating pages in the multi-tenant veterinary platform using Next.js 15 App Router.

## When to Use

- **Use for**: New clinic pages under `/[clinic]/`
- **Critical for**: Pages that need clinic theming and data

## Good Pattern

```tsx
// app/[clinic]/pets/page.tsx

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getClinicData, getAllClinicSlugs } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { PetList } from '@/components/pets/pet-list'

interface PageProps {
  params: Promise<{ clinic: string }>
}

// Generate static pages for all clinics
export async function generateStaticParams() {
  const slugs = await getAllClinicSlugs()
  return slugs.map((clinic) => ({ clinic }))
}

// Dynamic metadata per clinic
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) return {}

  return {
    title: `Mis Mascotas | ${clinicData.name}`,
    description: `Gestiona las mascotas registradas en ${clinicData.name}`,
  }
}

export default async function PetsPage({ params }: PageProps) {
  const { clinic } = await params

  // Load clinic data for theming/config
  const clinicData = await getClinicData(clinic)
  if (!clinicData) {
    notFound()
  }

  // Check if module is enabled for this clinic
  if (!clinicData.settings.modules.pets) {
    notFound()
  }

  // Fetch data server-side
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let pets = []
  if (user) {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.id)
      .order('name')

    pets = data || []
  }

  return (
    <main className="min-h-screen bg-[var(--bg-default)]">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">
          Mis Mascotas
        </h1>

        {user ? (
          <PetList pets={pets} clinic={clinic} />
        ) : (
          <p className="text-[var(--text-secondary)]">
            Inicia sesión para ver tus mascotas.
          </p>
        )}
      </div>
    </main>
  )
}
```

**Why this is good:**
- Server Component (default, no `'use client'`)
- Uses `generateStaticParams` for SSG multi-tenancy
- Dynamic metadata per clinic for SEO
- Checks module enablement per clinic
- Fetches data server-side (faster, secure)
- Uses theme CSS variables
- Spanish UI text for target market
- Handles unauthenticated state gracefully

## Bad Pattern

```tsx
// app/[clinic]/pets/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PetsPage({ params }) {
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPets() {
      const { data } = await supabase.from('pets').select('*')
      setPets(data)
      setLoading(false)
    }
    fetchPets()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: 'blue' }}>Pets</h1>
      {pets.map(pet => (
        <div key={pet.id}>{pet.name}</div>
      ))}
    </div>
  )
}
```

**Why this is bad:**
- Unnecessary `'use client'` - could be Server Component
- Client-side data fetching (slower, shows loading state)
- No `generateStaticParams` - pages not pre-rendered
- No metadata generation - poor SEO
- No clinic context - doesn't check if module enabled
- No tenant isolation - fetches ALL pets, not user's pets
- Inline styles instead of Tailwind
- Hardcoded colors break theming
- English text instead of Spanish
- No TypeScript types on params

## Page Types Reference

### Public Page (No Auth)
```tsx
// No auth check needed
export default async function ServicesPage({ params }: PageProps) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)
  // Render public content
}
```

### Protected Page (Auth Required)
```tsx
import { redirect } from 'next/navigation'

export default async function DashboardPage({ params }: PageProps) {
  const { clinic } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/auth/login`)
  }

  // Render protected content
}
```

### Role-Protected Page (Staff Only)
```tsx
export default async function AdminPage({ params }: PageProps) {
  const { clinic } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/auth/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    redirect(`/${clinic}`)
  }

  // Render admin content
}
```

## Final Must-Pass Checklist

- [ ] Server Component (no `'use client'` unless interactive)
- [ ] `generateStaticParams` returns all clinic slugs
- [ ] `generateMetadata` returns clinic-specific SEO
- [ ] Clinic data loaded with `getClinicData()`
- [ ] Module enablement checked if applicable
- [ ] Authentication checked for protected pages
- [ ] Role checked for staff-only pages
- [ ] Theme CSS variables used (no hardcoded colors)
- [ ] Spanish text for user-facing content
- [ ] TypeScript props interface defined
