/**
 * Service Description Component
 *
 * Service description card with included items list.
 */

'use client'

import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Service, ServiceDetailConfig } from './types'

interface ServiceDescriptionProps {
  service: Service
  config: ServiceDetailConfig
}

export function ServiceDescription({ service, config }: ServiceDescriptionProps) {
  const t = useTranslations('services')

  return (
    <div className="rounded-[var(--radius)] border border-gray-100 bg-white p-8 shadow-[var(--shadow-sm)]">
      <h2 className="font-heading mb-4 text-2xl font-bold text-[var(--text-primary)]">
        {config.ui_labels?.services?.description_label || t('serviceDescription')}
      </h2>
      <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
        {service.details?.description}
      </p>

      {service.details?.includes && service.details.includes.length > 0 && (
        <div className="mt-8 border-t border-gray-100 pt-8">
          <h3 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
            {config.ui_labels?.services?.includes_label || t('whatsIncluded')}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {service.details.includes.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg bg-[var(--bg-subtle)] p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                <span className="font-medium text-[var(--text-secondary)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
