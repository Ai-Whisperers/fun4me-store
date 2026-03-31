# React Component Pattern Exemplar

## Overview

Patterns for creating React components in the veterinary platform with proper theming, TypeScript, and multi-tenant support.

## When to Use

- **Use for**: Any new UI component
- **Critical for**: Components that need theme colors or clinic data

## Good Pattern - Server Component

```tsx
// components/pets/pet-card.tsx

import { Calendar, Weight } from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: 'dog' | 'cat' | 'bird' | 'other'
  breed?: string
  birth_date?: string
  weight_kg?: number
}

interface PetCardProps {
  pet: Pet
  clinic: string
  showActions?: boolean
}

// Server Component - no 'use client' needed
export function PetCard({ pet, clinic, showActions = true }: PetCardProps) {
  const speciesEmoji = {
    dog: '🐕',
    cat: '🐱',
    bird: '🐦',
    other: '🐾',
  }

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()

    if (years > 0) return `${years} año${years > 1 ? 's' : ''}`
    return `${months} mes${months !== 1 ? 'es' : ''}`
  }

  return (
    <article
      className="p-6 rounded-xl bg-[var(--bg-paper)] shadow-md
                 hover:shadow-lg transition-shadow duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
            {speciesEmoji[pet.species]} {pet.name}
          </h3>
          {pet.breed && (
            <p className="text-sm text-[var(--text-secondary)]">
              {pet.breed}
            </p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {pet.birth_date && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Calendar className="w-4 h-4 text-[var(--primary)]" />
            <span>{calculateAge(pet.birth_date)}</span>
          </div>
        )}

        {pet.weight_kg && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Weight className="w-4 h-4 text-[var(--primary)]" />
            <span>{pet.weight_kg} kg</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <a
            href={`/${clinic}/pets/${pet.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-[var(--primary)] text-[var(--primary-contrast)]
                       hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Ver Detalles
          </a>
        </div>
      )}
    </article>
  )
}
```

**Why this is good:**
- Server Component (default, better performance)
- TypeScript interface for props
- Theme CSS variables for all colors
- Semantic HTML (`article`, proper headings)
- Accessible (good contrast, meaningful text)
- Spanish text for target market
- Optional props with defaults
- Lucide icons with theme colors
- Hover/transition states

## Good Pattern - Client Component

```tsx
// components/pets/pet-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createPet } from '@/app/actions/pets'

interface PetFormProps {
  clinic: string
  onSuccess?: () => void
}

export function PetForm({ clinic, onSuccess }: PetFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setError(null)

    startTransition(async () => {
      const result = await createPet(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      onSuccess?.()
      router.push(`/${clinic}/pets/${result.data.id}`)
    })
  }

  return (
    <motion.form
      action={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-[var(--error-light)] text-[var(--error)]"
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          Nombre *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full px-4 py-2 rounded-lg border border-[var(--border)]
                     bg-[var(--bg-paper)] text-[var(--text-primary)]
                     focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
                     placeholder:text-[var(--text-muted)]"
          placeholder="Nombre de tu mascota"
        />
      </div>

      <div>
        <label
          htmlFor="species"
          className="block text-sm font-medium text-[var(--text-primary)] mb-2"
        >
          Especie *
        </label>
        <select
          id="species"
          name="species"
          required
          className="w-full px-4 py-2 rounded-lg border border-[var(--border)]
                     bg-[var(--bg-paper)] text-[var(--text-primary)]
                     focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Seleccionar...</option>
          <option value="dog">Perro</option>
          <option value="cat">Gato</option>
          <option value="bird">Ave</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-lg font-medium
                   bg-[var(--primary)] text-[var(--primary-contrast)]
                   hover:opacity-90 transition-opacity
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Guardando...' : 'Guardar Mascota'}
      </button>
    </motion.form>
  )
}
```

**Why this is good:**
- `'use client'` only because it needs interactivity
- Uses Server Action for mutation
- `useTransition` for pending state
- Framer Motion for smooth animation
- Accessible form (labels, required, role="alert")
- Error handling with user feedback
- Spanish text and placeholders
- Theme CSS variables
- Disabled state during submission

## Bad Pattern

```tsx
// components/pets/pet-card.tsx
'use client'

import { useEffect, useState } from 'react'

export default function PetCard({ pet }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`/api/pets/${pet.id}`)
      .then(r => r.json())
      .then(setData)
  }, [pet.id])

  return (
    <div style={{ padding: 20, background: 'white', borderRadius: 8 }}>
      <h3 style={{ color: '#333', fontSize: 18 }}>
        {data?.name || 'Loading...'}
      </h3>
      <p style={{ color: '#666' }}>{data?.breed}</p>
      <button
        style={{ background: 'blue', color: 'white', padding: '8px 16px' }}
        onClick={() => window.location.href = `/pets/${pet.id}`}
      >
        View
      </button>
    </div>
  )
}
```

**Why this is bad:**
- Unnecessary `'use client'` - pet data already passed
- Client-side fetch for data already available
- `useEffect` causes loading state
- No TypeScript (no prop types)
- Inline styles break theming
- Hardcoded colors
- No accessibility (no semantic HTML)
- `window.location` instead of Next.js navigation
- English text
- Default export (named exports better for tree-shaking)

## Component Composition Pattern

```tsx
// components/ui/card.tsx
interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`p-6 rounded-xl bg-[var(--bg-paper)] shadow-md ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
      {children}
    </h3>
  )
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      {children}
    </div>
  )
}

// Usage:
<Card>
  <CardHeader>
    <CardTitle>Mi Mascota</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Contenido aquí</p>
  </CardContent>
  <CardFooter>
    <Button>Acción</Button>
  </CardFooter>
</Card>
```

## Final Must-Pass Checklist

- [ ] Server Component unless interactivity required
- [ ] TypeScript interface for all props
- [ ] Theme CSS variables for colors (`var(--primary)`)
- [ ] No inline styles (use Tailwind)
- [ ] No hardcoded hex colors
- [ ] Semantic HTML (article, section, headings)
- [ ] Accessibility (labels, roles, focus states)
- [ ] Spanish text for user-facing content
- [ ] Named export (not default)
- [ ] Mobile-first responsive classes
- [ ] Lucide icons (not other icon libraries)
