/**
 * Results Panel Component
 *
 * Displays ROI calculation results and metrics.
 */

'use client'

import { TrendingUp, Gift, Sparkles, Info, ArrowRight } from 'lucide-react'
import { trialConfig } from '@/lib/pricing/tiers'
import { brandConfig } from '@/lib/branding/config'
import { getWhatsAppUrl, pricingMessages } from '@/lib/whatsapp'
import { formatCurrency, formatCurrencyShort } from './utils'
import type { DerivedPlanConfig, ROICalculations } from './types'

interface ResultsPanelProps {
  currentPlan: DerivedPlanConfig
  calculations: ROICalculations
  monthlyConsultations: number
}

export function ResultsPanel({
  currentPlan,
  calculations,
  monthlyConsultations,
}: ResultsPanelProps) {
  return (
    <div
      className="rounded-2xl border-2 bg-gradient-to-br from-white/10 to-white/5 p-6 lg:col-span-2"
      style={{ borderColor: `${currentPlan.color}30` }}
    >
      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
        <TrendingUp className="h-5 w-5" style={{ color: currentPlan.color }} />
        Resultados con Plan {currentPlan.name}
      </h3>

      {/* Free tier notice */}
      {currentPlan.id === 'gratis' && (
        <div className="mb-6 rounded-xl border border-[#2DCEA3]/30 bg-[#2DCEA3]/10 p-4">
          <div className="flex items-start gap-3">
            <Gift className="h-5 w-5 flex-shrink-0 text-[#2DCEA3]" />
            <div className="text-sm">
              <p className="font-bold text-white">Plan Gratis</p>
              <p className="text-white/60">
                Empeza gratis con sitio web y reservas por WhatsApp.
                Cuando estes listo, podes subir al Plan Profesional.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white/5 p-4">
          <div
            className="text-2xl font-black md:text-3xl"
            style={{ color: currentPlan.color }}
          >
            +{calculations.newClientsPerMonth}
          </div>
          <div className="text-sm text-white/50">Clientes nuevos/mes</div>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <div className="text-2xl font-black text-white md:text-3xl">
            {formatCurrencyShort(calculations.additionalRevenuePerMonth)}
          </div>
          <div className="text-sm text-white/50">Ingreso extra/mes</div>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <div
            className="text-2xl font-black md:text-3xl"
            style={{
              color: calculations.netMonthlyBenefit >= 0 ? currentPlan.color : '#EF4444'
            }}
          >
            {calculations.netMonthlyBenefit >= 0 ? '+' : ''}
            {formatCurrencyShort(calculations.netMonthlyBenefit)}
          </div>
          <div className="text-sm text-white/50">Ganancia neta/mes</div>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <div className="text-2xl font-black text-white md:text-3xl">
            {currentPlan.monthlyCost === 0 ? '0' : calculations.breakEvenClients}
          </div>
          <div className="text-sm text-white/50">
            {currentPlan.monthlyCost === 0 ? 'Sin costo' : 'Clientes para empatar'}
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-white/70">Costo anual</span>
            <span className="font-bold text-white">
              {currentPlan.monthlyCost === 0 ? 'Gratis' : formatCurrency(calculations.yearlyVeticCost)}
            </span>
          </div>
          {currentPlan.monthlyCost > 0 && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>Con plan anual: {formatCurrency(calculations.annualPrice)}</span>
              <span className="rounded-full bg-[#2DCEA3]/20 px-2 py-0.5 text-xs font-bold text-[#2DCEA3]">
                Ahorras {formatCurrencyShort(calculations.annualSavings)}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-white/70">Ganancia año 1</span>
            <span
              className="font-bold"
              style={{
                color: calculations.yearlyNetProfit >= 0 ? currentPlan.color : '#EF4444',
              }}
            >
              {calculations.yearlyNetProfit >= 0 ? '+' : ''}
              {formatCurrency(calculations.yearlyNetProfit)}
            </span>
          </div>
          <div className="text-xs text-white/40">
            Despues de pagar {brandConfig.name}
          </div>
        </div>
      </div>

      {/* ROI Highlight */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: `${currentPlan.color}10`,
          borderColor: `${currentPlan.color}30`,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 text-sm text-white/70">Retorno de inversion año 1</div>
            <div
              className="text-4xl font-black md:text-5xl"
              style={{ color: currentPlan.color }}
            >
              {currentPlan.monthlyCost === 0 ? '∞' : (
                <>
                  {calculations.yearlyROI > 0 ? '+' : ''}
                  {calculations.yearlyROI}%
                </>
              )}
            </div>
          </div>
          {currentPlan.hasEcommerce && (
            <div className="text-right">
              <div className="mb-1 text-sm text-white/70">Tienda online</div>
              <div className="text-lg font-bold text-white">
                + Ingresos por ventas
              </div>
              <div className="text-xs text-white/40">3-5% comision</div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            style={{ color: currentPlan.color }}
          />
          <div className="text-sm">
            <p className="mb-1 text-white">
              Con {monthlyConsultations} pacientes/mes y el Plan {currentPlan.name}:
            </p>
            {currentPlan.id === 'gratis' ? (
              <p className="text-white/60">
                Empezas <strong className="text-[#2DCEA3]">gratis</strong> con sitio web y reservas por WhatsApp.
                Cuando estes listo, podes subir a Profesional.
              </p>
            ) : (
              <p className="text-white/60">
                {brandConfig.name} te da presencia digital profesional por solo{' '}
                <strong style={{ color: currentPlan.color }}>
                  {formatCurrency(currentPlan.monthlyCost)}/mes
                </strong>.
                Con {calculations.breakEvenClients} cliente{calculations.breakEvenClients === 1 ? '' : 's'} nuevo{calculations.breakEvenClients === 1 ? '' : 's'} al mes, se paga solo.
                {currentPlan.hasEcommerce && (
                  <span> Incluye tienda online (comision 3% sobre ventas).</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2026 Promotion notice for paid plans */}
      {currentPlan.monthlyCost > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-white/5 p-3">
          <Gift className="h-4 w-4 text-[#2DCEA3]" />
          <span className="text-sm text-white/70">
            {trialConfig.freeMonths} meses GRATIS - {trialConfig.promotionDescription}
          </span>
        </div>
      )}

      {/* Assumptions */}
      <div className="mt-4 flex items-start gap-2 text-xs text-white/40">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Crecimiento estimado basado en clinicas con presencia digital. Resultados pueden
          variar segun ubicacion, marketing y servicios.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <a
          href={getWhatsAppUrl(pricingMessages.roiCalculator({ planName: currentPlan.name, monthlyConsultations }))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-bold text-[var(--bg-dark)] transition-all hover:-translate-y-0.5"
          style={{
            background: `linear-gradient(135deg, ${currentPlan.color}, ${currentPlan.color}CC)`,
            boxShadow: `0 10px 40px ${currentPlan.color}30`,
          }}
        >
          {currentPlan.id === 'gratis' ? 'Empezar Gratis' : `Quiero el Plan ${currentPlan.name}`}
          <ArrowRight className="h-5 w-5" />
        </a>
        {currentPlan.monthlyCost > 0 && (
          <p className="mt-3 text-sm text-white/40">
            {trialConfig.freeMonths} meses gratis • Sin tarjeta de credito
          </p>
        )}
      </div>
    </div>
  )
}
