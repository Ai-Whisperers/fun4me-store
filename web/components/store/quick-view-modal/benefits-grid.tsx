'use client'

import { Truck, Shield, RotateCcw } from 'lucide-react'
import type { BenefitsGridProps } from './types'

interface Benefit {
  icon: typeof Truck
  title: string
  subtitle: string
}

const BENEFITS: Benefit[] = [
  { icon: Truck, title: 'Envío Gratis', subtitle: '+150k Gs' },
  { icon: Shield, title: 'Garantía', subtitle: 'Calidad' },
  { icon: RotateCcw, title: 'Devolución', subtitle: '7 días' },
]

export function BenefitsGrid({ className = '' }: BenefitsGridProps): React.ReactElement {
  return (
    <div className={`mb-6 grid grid-cols-3 gap-3 ${className}`}>
      {BENEFITS.map(({ icon: Icon, title, subtitle }) => (
        <div
          key={title}
          className="flex flex-col items-center rounded-xl bg-[var(--bg-subtle)] p-3 text-center"
        >
          <Icon className="mb-1 h-5 w-5 text-[var(--primary)]" />
          <span className="text-xs text-[var(--text-secondary)]">{title}</span>
          <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
        </div>
      ))}
    </div>
  )
}
