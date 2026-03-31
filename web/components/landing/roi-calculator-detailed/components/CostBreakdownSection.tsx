'use client'

/**
 * Cost Breakdown Section Component
 *
 * REF-006: Cost breakdown extracted from client component
 */

import { MinusCircle, Receipt, Percent, Package, AlertCircle, ArrowRight } from 'lucide-react'
import { commissionConfig } from '@/lib/pricing/tiers'
import { brandConfig } from '@/lib/branding/config'
import type { DerivedPlanConfig, ROICalculations, ClinicInputs } from '../types'
import { formatCurrency } from '../utils'

interface CostBreakdownSectionProps {
  currentPlan: DerivedPlanConfig
  calculations: ROICalculations
  inputs: ClinicInputs
}

export function CostBreakdownSection({
  currentPlan,
  calculations,
  inputs,
}: CostBreakdownSectionProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <h4 className="mb-4 flex items-center gap-2 font-bold text-red-600">
        <MinusCircle className="h-5 w-5" />
        Lo que nos pagas a nosotros
      </h4>
      <div className="space-y-3">
        {calculations.costBreakdown.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg bg-white p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                {item.type === 'subscription' && <Receipt className="h-4 w-4" />}
                {item.type === 'commission' && <Percent className="h-4 w-4" />}
                {item.type === 'markup' && <Package className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--landing-text-primary)]">{item.label}</div>
                <div className="text-xs text-[var(--landing-text-muted)]">{item.description}</div>
              </div>
            </div>
            <div className="text-lg font-bold text-red-600">
              -{formatCurrency(item.amount)}
            </div>
          </div>
        ))}

        {/* Commission Timeline */}
        {currentPlan.hasEcommerce && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                Cronograma de Comisiones
              </span>
            </div>
            <div className="space-y-2">
              {/* Timeline visual */}
              <div className="flex items-center gap-2 text-xs">
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                  inputs.monthsOnPlatform < commissionConfig.monthsUntilIncrease
                    ? 'bg-green-100 text-green-700 font-bold ring-2 ring-green-300'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <span>Meses 1-6:</span>
                  <span>{Math.round(commissionConfig.initialRate * 100)}%</span>
                </div>
                <ArrowRight className="h-3 w-3 text-amber-400" />
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                  inputs.monthsOnPlatform >= commissionConfig.monthsUntilIncrease
                    ? 'bg-amber-100 text-amber-700 font-bold ring-2 ring-amber-300'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <span>Mes 7+:</span>
                  <span>{Math.round(commissionConfig.standardRate * 100)}%</span>
                </div>
              </div>

              {/* Cost comparison */}
              <div className="text-xs text-amber-700 mt-2">
                {inputs.monthsOnPlatform < commissionConfig.monthsUntilIncrease ? (
                  <div className="flex flex-col gap-1">
                    <span>
                      <span className="font-bold text-green-700">Ahora ({Math.round(commissionConfig.initialRate * 100)}%):</span>
                      {' '}-{formatCurrency(inputs.currentMonthlyStoreSales * commissionConfig.initialRate)}/mes
                    </span>
                    <span>
                      <span className="font-bold text-amber-700">Despues de 6 meses ({Math.round(commissionConfig.standardRate * 100)}%):</span>
                      {' '}-{formatCurrency(inputs.currentMonthlyStoreSales * commissionConfig.standardRate)}/mes
                    </span>
                    <span className="text-amber-600 italic">
                      Aumento de {formatCurrency(inputs.currentMonthlyStoreSales * (commissionConfig.standardRate - commissionConfig.initialRate))}/mes
                    </span>
                  </div>
                ) : (
                  <span>
                    Tarifa estandar del {Math.round(commissionConfig.standardRate * 100)}% sobre ventas de tienda online.
                  </span>
                )}
              </div>

              {/* Clarification */}
              <p className="text-[10px] text-amber-600 mt-2 pt-2 border-t border-amber-200">
                La comision aplica solo a ventas de la tienda online, no a consultas ni servicios veterinarios.
              </p>
            </div>
          </div>
        )}

        {/* Total Costs */}
        <div className="mt-2 flex items-center justify-between border-t border-red-200 pt-3">
          <span className="font-bold text-[var(--landing-text-primary)]">Total costos {brandConfig.name}</span>
          <span className="text-xl font-black text-red-600">
            -{formatCurrency(calculations.totalVeticCosts)}
          </span>
        </div>
      </div>
    </div>
  )
}
