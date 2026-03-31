'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FooterLogoProps {
  clinic: string
  logoUrl?: string
  name: string
}

export function FooterLogo({ clinic, logoUrl, name }: FooterLogoProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <Link href={`/${clinic}`} className="mb-6 inline-block">
      {logoUrl && !imageError ? (
        <img src={logoUrl} alt={name} className="h-12 w-auto" onError={() => setImageError(true)} />
      ) : (
        <span className="font-heading text-2xl font-black text-white">{name}</span>
      )}
    </Link>
  )
}
