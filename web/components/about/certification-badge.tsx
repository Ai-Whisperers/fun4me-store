'use client'

import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'

interface CertificationBadgeProps {
  name: string
  description: string
  logo?: string
}

export function CertificationBadge({ name, description, logo }: CertificationBadgeProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex min-w-[180px] max-w-[220px] flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="bg-[var(--primary)]/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        {logo && !imageError ? (
          <img
            src={logo}
            alt={`Logo de certificacion ${name}`}
            className="h-10 w-10 object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <BadgeCheck className="h-8 w-8 text-[var(--primary)]" aria-hidden="true" />
        )}
      </div>
      <h3 className="mb-1 text-center font-bold text-[var(--text-primary)]">{name}</h3>
      <p className="text-center text-xs text-[var(--text-muted)]">{description}</p>
    </div>
  )
}
