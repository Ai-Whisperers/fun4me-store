'use client'

/**
 * Upgrade Comparison Component
 *
 * REF-006: Upgrade comparison section extracted from client component
 */

import { ArrowRight, Check } from 'lucide-react'
import type { DerivedPlanConfig } from '../types'
import { formatCurrency } from '../utils'

interface UpgradeComparisonProps {
  currentPlan: DerivedPlanConfig
}

export function UpgradeComparison({ currentPlan }: UpgradeComparisonProps): React.ReactElement | null {
  if (currentPlan.id !== 'gratis') {
    return null
  }

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-800">
        <ArrowRight className="h-4 w-4" />
        Con Plan Profesional obtienes:
      </h4>
      <div className="grid gap-2 text-sm text-blue-700">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-blue-500" />
          <span>Sin anuncios en tu sitio</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-blue-500" />
          <span>Tienda online para vender productos (3% comision)</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-blue-500" />
          <span>WhatsApp automatico - recupera citas perdidas</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-blue-500" />
          <span>Modulo de hospitalizacion y laboratorio</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-blue-500" />
          <span>Usuarios ilimitados</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-blue-600">
        Por solo{' '}
        <span className="font-bold">{formatCurrency(250000)}</span>{' '}
        por mes
      </p>
    </div>
  )
}
