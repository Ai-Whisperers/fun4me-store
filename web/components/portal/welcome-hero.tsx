'use client'

import { useTranslations } from 'next-intl'

interface PortalWelcomeHeroProps {
  clinicName: string
}

export function PortalWelcomeHero({ clinicName }: PortalWelcomeHeroProps): React.ReactElement {
  const t = useTranslations('portal.welcome')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening')

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] py-6 text-white md:py-8">
      {/* Decorative elements */}
      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-black/10 blur-3xl" />

      {/* Paw print pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M11 14c-.5 2.5-2 4.5-4 6-2-1.5-3.5-3.5-4-6 1-1 2.5-1 3.5 0 .5.5.5 1.5.5 2.5.5-1 1-2 2-2.5 1 0 2 1 2 2.5 0-1 0-2 .5-2.5 1-1 2.5-1 3.5 0'/%3E%3Ccircle cx='7' cy='7' r='2'/%3E%3Ccircle cx='13' cy='5' r='2'/%3E%3Ccircle cx='17' cy='9' r='2'/%3E%3Ccircle cx='5' cy='12' r='2'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <h1 className="text-2xl font-bold md:text-3xl">{greeting}</h1>
        <p className="mt-1 text-white/80">
          {t('welcomePrefix')} <span className="font-semibold text-white">{clinicName}</span>
        </p>
      </div>
    </section>
  )
}
