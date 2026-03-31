'use client'

import { DynamicIcon } from '@/lib/icons'
import Link from 'next/link'
import { Check, ArrowRight, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Service } from '@/lib/types/services'
import { hasSizeBasedPricing } from '@/lib/utils/pet-size'

interface ServiceCardConfig {
  id?: string
  ui_labels?: {
    services?: {
      includes_label?: string
      book_btn?: string
    }
  }
  contact?: {
    whatsapp_number?: string
  }
}

interface ServiceCardProps {
  readonly service: Service
  readonly config: ServiceCardConfig
  readonly clinic: string
}

export const ServiceCard = ({ service, config }: ServiceCardProps) => {
  const t = useTranslations('services')
  const isBookable = service.booking?.online_enabled

  // Get first variant for display
  const firstVariant = service.variants?.[0]
  const hasSizePricing = service.variants?.some((v) => hasSizeBasedPricing(v.size_pricing))

  if (!service.visible) return null

  return (
    <Link
      href={`./services/${service.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border-light,#f3f4f6)] bg-[var(--bg-paper)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
    >
      {/* Card Image */}
      {service.image && (
        <div className="relative h-36 overflow-hidden sm:h-40">
          <img
            src={service.image}
            alt={service.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {/* Icon overlay on image */}
          <div className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-xl bg-white/90 text-[var(--primary)] shadow-lg backdrop-blur-sm">
            <DynamicIcon name={service.icon} className="h-5 w-5" />
          </div>
          {isBookable && (
            <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[var(--status-success,#15803d)] shadow-lg backdrop-blur-sm">
              Online
            </span>
          )}
        </div>
      )}

      {/* Card Header */}
      <div className="p-6 pb-2">
        {/* Only show icon row if no image */}
        {!service.image && (
          <div className="mb-4 flex items-start justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--bg-subtle)] text-[var(--primary)] transition-colors duration-300 group-hover:bg-[var(--primary)] group-hover:text-white">
              <DynamicIcon name={service.icon} className="h-6 w-6" />
            </div>
            {isBookable && (
              <span className="ring-[var(--status-success,#22c55e)]/20 inline-flex items-center rounded-full bg-[var(--status-success-bg,#dcfce7)] px-2.5 py-1 text-xs font-bold text-[var(--status-success,#15803d)] ring-1 ring-inset">
                Online
              </span>
            )}
          </div>
        )}
        <h3 className="font-heading mb-2 text-2xl font-bold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
          {service.title}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {service.summary}
        </p>
      </div>

      {/* Card Body - Content */}
      <div className="flex-grow px-6 py-2">
        {/* Includes List - Compact */}
        <div className="my-4">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            {config.ui_labels?.services?.includes_label || t('includes')}
          </span>
          <ul className="space-y-1.5">
            {service.details?.includes?.slice(0, 3).map((item: string) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
            {(service.details?.includes?.length || 0) > 3 && (
              <li className="pl-6 text-xs font-medium text-[var(--primary)]">
                {t('moreItems', { count: (service.details?.includes?.length || 0) - 3 })}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Card Footer - Price & Action */}
      <div className="bg-[var(--bg-subtle)]/30 mt-auto border-t border-[var(--border-light,#f9fafb)] p-6 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {hasSizePricing ? t('priceFrom') : t('price')}
            </span>
            <span className="text-xl font-black text-[var(--primary)]">
              {firstVariant?.price_display || t('priceOnRequest')}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white transition-all group-hover:opacity-90">
            {isBookable ? (
              <>
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {config.ui_labels?.services?.book_btn || t('viewOptions')}
                </span>
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                <span className="hidden sm:inline">{t('viewDetails')}</span>
              </>
            )}
            <ArrowRight className="h-4 w-4 sm:hidden" />
          </div>
        </div>
      </div>
    </Link>
  )
}
