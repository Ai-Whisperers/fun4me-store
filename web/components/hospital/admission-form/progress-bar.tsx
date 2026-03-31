'use client'

import type { JSX } from 'react'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps): JSX.Element {
  return (
    <div className="mb-8 flex items-center gap-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded ${
            currentStep >= i + 1 ? 'bg-[var(--primary)]' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  )
}
