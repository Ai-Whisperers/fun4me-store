import Link from 'next/link'
import { MessageCircle, ArrowRight, ChevronDown, Zap } from 'lucide-react'
import { HeroImage } from '@/components/seo/hero-image'
import type { HomeData, ClinicConfig } from '@/lib/clinics'

interface PublicHeroProps {
  clinic: string
  home: HomeData
  config: ClinicConfig
}

export function PublicHero({ clinic, home, config }: PublicHeroProps): React.ReactElement {
  // Determine secondary CTA link - support "whatsapp", "store", or custom paths
  const getSecondaryCTALink = (): string => {
    const link = home.hero.cta_secondary_link
    if (!link) return `/${clinic}/services` // Default for vets
    if (link === 'whatsapp') return `https://wa.me/${config.contact.whatsapp_number}`
    if (link === 'store') return `/${clinic}/store`
    if (link.startsWith('/')) return `/${clinic}${link}`
    if (link.startsWith('http')) return link
    return `/${clinic}/${link}`
  }

  const secondaryCTALink = getSecondaryCTALink()
  const isExternalLink = secondaryCTALink.startsWith('http')

  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      {/* Background Image with optimized next/image */}
      {config.branding?.hero_image_url ? (
        <HeroImage
          src={config.branding.hero_image_url}
          alt={`${config.name} - ${home.hero.headline}`}
        />
      ) : (
        <div className="absolute inset-0 z-0" style={{ background: 'var(--gradient-hero)' }} />
      )}

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Emergency Badge - Positioned as corner ribbon */}
      <div className="absolute right-0 top-24 z-20 md:top-28">
        <div className="flex items-center gap-2 rounded-l-full bg-[var(--accent)] px-6 py-2 pr-8 text-sm font-bold tracking-wide text-[var(--secondary-contrast)] shadow-lg">
          <Zap className="h-4 w-4" />
          {home.hero.badge_text || 'Urgencias 24hs'}
        </div>
      </div>

      <div className="container relative z-10 mx-auto px-4 py-20 md:px-6">
        <div className="max-w-4xl">
          <h1 className="font-heading animate-fade-in mb-6 text-balance text-3xl font-black leading-[1.1] tracking-tight text-white drop-shadow-2xl sm:text-4xl md:text-6xl lg:text-7xl">
            {home.hero.headline}
          </h1>
          <p className="animate-fade-in stagger-1 mb-10 max-w-2xl text-balance text-lg font-medium leading-relaxed text-white/90 drop-shadow-md md:text-xl">
            {home.hero.subhead}
          </p>

          {/* CTAs - Improved visual hierarchy */}
          <div className="animate-fade-in stagger-2 flex flex-col gap-4 sm:flex-row">
            <a
              href={`https://wa.me/${config.contact.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-8 text-base font-bold text-[var(--secondary-contrast)] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-95 md:h-16 md:px-10 md:text-lg"
            >
              <MessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
              {home.hero.cta_primary}
            </a>
            {isExternalLink ? (
              <a
                href={secondaryCTALink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-white/50 bg-white/10 px-8 text-base font-bold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white hover:bg-white/20 active:scale-95 md:h-16 md:px-10 md:text-lg"
              >
                {home.hero.cta_secondary}
                <ArrowRight className="h-5 w-5" />
              </a>
            ) : (
              <Link
                href={secondaryCTALink}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-white/50 bg-white/10 px-8 text-base font-bold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white hover:bg-white/20 active:scale-95 md:h-16 md:px-10 md:text-lg"
              >
                {home.hero.cta_secondary}
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 animate-bounce md:block">
        <ChevronDown className="h-8 w-8 text-white/60" />
      </div>
    </section>
  )
}
