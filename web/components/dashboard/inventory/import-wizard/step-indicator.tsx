'use client'

import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
  steps: string[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
              idx < currentStep ? 'bg-[var(--status-success)] text-white' : ''
            } ${idx === currentStep ? 'bg-[var(--primary)] text-white' : ''} ${
              idx > currentStep ? 'bg-gray-200 text-gray-400' : ''
            }`}
          >
            {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`mx-2 h-1 w-12 rounded ${
                idx < currentStep ? 'bg-[var(--status-success)]' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
