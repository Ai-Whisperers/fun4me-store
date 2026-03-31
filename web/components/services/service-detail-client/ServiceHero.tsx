/**
 * Service Hero Component
 *
 * Hero section with service title, icon, and category navigation.
 */

'use client'

import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DynamicIcon } from '@/lib/icons'
import type { Service, ServiceNavItem } from './types'

interface ServiceHeroProps {
  service: Service
  allServices: ServiceNavItem[]
  clinic: string
}

export function ServiceHero({ service, allServices, clinic }: ServiceHeroProps) {
  const t = useTranslations('services')

  return (
    <div className="relative overflow-hidden pb-6 pt-20 lg:pb-8 lg:pt-28">
      {/* Background - Image or Gradient */}
      {service.image ? (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${service.image}')` }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 z-0"
            style={{ background: 'var(--gradient-primary)' }}
          />
          <div
            className="absolute inset-0 z-0 opacity-10 mix-blend-overlay"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
        </>
      )}

      <div className="container relative z-10 px-4 md:px-6">
        <Link
          href={`/${clinic}/services`}
          className="mb-8 inline-flex items-center text-sm font-bold uppercase tracking-wider text-white/80 transition-colors hover:text-white"
        >
          <Icons.ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToServices')}
        </Link>

        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-lg backdrop-blur-md">
            <DynamicIcon name={service.icon} className="h-12 w-12" />
          </div>
          <div>
            <h1 className="font-heading mb-4 text-balance text-4xl font-black text-white drop-shadow-md md:text-6xl">
              {service.title}
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-white/90">
              {service.summary}
            </p>
          </div>
        </div>

        {/* Service Category Navigation */}
        {allServices.length > 1 && (
          <div className="mt-10">
            <div className="flex flex-wrap gap-2">
              {allServices.map((s) => (
                <Link
                  key={s.id}
                  href={`/${clinic}/services/${s.id}`}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                    service.id === s.id
                      ? 'bg-white text-[var(--primary)] shadow-lg'
                      : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
                  }`}
                >
                  {s.icon && <DynamicIcon name={s.icon} className="h-4 w-4 shrink-0" />}
                  <span>{s.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
