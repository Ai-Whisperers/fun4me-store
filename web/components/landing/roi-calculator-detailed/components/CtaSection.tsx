'use client'

/**
 * CTA Section Component
 *
 * REF-006: CTA button extracted from client component
 */

import { ArrowRight } from 'lucide-react'
import { trialConfig } from '@/lib/pricing/tiers'
import { brandConfig } from '@/lib/branding/config'
import { getWhatsAppUrl } from '@/lib/whatsapp'
import type { DerivedPlanConfig, ClinicInputs } from '../types'

interface CtaSectionProps {
  currentPlan: DerivedPlanConfig
  inputs: ClinicInputs
}

export function CtaSection({ currentPlan, inputs }: CtaSectionProps): React.ReactElement {
  return (
    <div className="mt-8 text-center">
      <a
        href={getWhatsAppUrl(
          `Hola! Vi los precios de ${brandConfig.name}.\n\nMi clinica tiene aproximadamente ${inputs.monthlyConsultations} consultas/mes.\n\nMe interesa el Plan ${currentPlan.name}.\n\nQuiero saber mas!`
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-bold text-white transition-all hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(135deg, ${currentPlan.color}, ${currentPlan.color}CC)`,
          boxShadow: `0 10px 40px ${currentPlan.color}30`,
        }}
      >
        {currentPlan.id === 'gratis' ? 'Empezar Gratis' : `Quiero el Plan ${currentPlan.name}`}
        <ArrowRight className="h-5 w-5" />
      </a>
      {currentPlan.monthlyCost > 0 && (
        <p className="mt-3 text-sm text-[var(--landing-text-light)]">
          {trialConfig.freeMonths} meses gratis • Sin tarjeta de credito
        </p>
      )}
    </div>
  )
}
