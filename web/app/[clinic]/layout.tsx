import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { ClinicThemeProvider } from '@/components/clinic-theme-provider'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { MainNav } from '@/components/layout/main-nav'
import { HeaderProviders } from '@/components/layout/header-providers'
import { ToastProvider } from '@/components/ui/Toast'
import { CartProvider } from '@/context/cart-context'
import { CartLayoutWrapper } from '@/components/cart/cart-layout-wrapper'
import { TenantProviders } from '@/components/tenant-providers'
// Note: CommandPaletteProvider moved to portal/dashboard layouts
// Note: WishlistProvider moved to store layout
import { createClient } from '@/lib/supabase/server'
import { getTierById, type TierId } from '@/lib/pricing/tiers'
import {
  Facebook,
  Instagram,
  Youtube,
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
} from 'lucide-react'
import { FooterLogo } from '@/components/layout/footer-logo'
import { Copyright } from '@/components/ui/copyright'
import { NewsletterForm } from '@/components/layout/newsletter-form'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { getCanonicalUrl, getSiteUrl } from '@/lib/config'

// Generate metadata dynamically with full SEO support
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinic: string }>
}): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return { title: 'Clinic Not Found' }

  const { config, home } = data
  const seo = home?.seo
  const title = seo?.meta_title || config.name
  const description = seo?.meta_description || `Bienvenido a ${config.name}`
  const ogImage = config.branding?.og_image_url || '/branding/default-og.jpg'
  const canonicalUrl = getCanonicalUrl(clinic)

  return {
    title,
    description,
    keywords: seo?.keywords?.join(', '),
    authors: [{ name: config.name }],
    creator: config.name,
    publisher: config.name,
    icons: {
      icon: config.branding?.favicon_url || '/favicon.ico',
      apple: config.branding?.apple_touch_icon || '/apple-touch-icon.png',
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: seo?.og_locale || 'es_PY',
      url: canonicalUrl,
      title,
      description,
      siteName: config.name,
      images: [
        {
          url: ogImage.startsWith('/') ? getSiteUrl(ogImage) : ogImage,
          width: 1200,
          height: 630,
          alt: `${config.name} - ${config.tagline}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.startsWith('/') ? getSiteUrl(ogImage) : ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

// Generate LocalBusiness/VeterinaryCare structured data
function generateStructuredData(
  clinic: string,
  config: {
    name: string
    tagline?: string
    contact: {
      phone_display: string
      whatsapp_number: string
      email: string
      address: string
      city?: string
      country?: string
      coordinates?: { lat: number; lng: number }
      google_maps_id?: string
    }
    hours?: { weekdays?: string; saturday?: string; sunday?: string }
    branding?: { logo_url?: string; og_image_url?: string }
    social?: { facebook?: string; instagram?: string }
  }
) {
  const { contact, hours, branding, social } = config

  // Parse opening hours for schema
  const openingHours = []
  if (hours?.weekdays) {
    const [open, close] = hours.weekdays.split(' - ')
    openingHours.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: open,
      closes: close,
    })
  }
  if (hours?.saturday) {
    const [open, close] = hours.saturday.split(' - ')
    openingHours.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: open,
      closes: close,
    })
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
    '@id': `${getCanonicalUrl(clinic)}#organization`,
    name: config.name,
    description: config.tagline || `Clínica veterinaria ${config.name}`,
    url: getCanonicalUrl(clinic),
    telephone: contact.phone_display,
    email: contact.email,
    image: branding?.og_image_url ? getSiteUrl(branding.og_image_url) : undefined,
    logo: branding?.logo_url ? getSiteUrl(branding.logo_url) : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address,
      addressLocality: contact.city || 'Asunción',
      addressCountry: contact.country || 'PY',
    },
    geo: contact.coordinates
      ? {
          '@type': 'GeoCoordinates',
          latitude: contact.coordinates.lat,
          longitude: contact.coordinates.lng,
        }
      : undefined,
    openingHoursSpecification: openingHours,
    sameAs: [social?.facebook, social?.instagram].filter(Boolean),
    hasMap: contact.google_maps_id
      ? `https://www.google.com/maps/place/?q=place_id:${contact.google_maps_id}`
      : undefined,
    priceRange: '$$',
    currenciesAccepted: 'PYG',
    paymentAccepted: 'Cash, Credit Card, Debit Card',
    areaServed: {
      '@type': 'City',
      name: contact.city || 'Asunción',
    },
    medicalSpecialty: [
      'Veterinary Medicine',
      'Emergency Medicine',
      'Surgery',
      'Diagnostic Imaging',
    ],
  }
}

// Note: generateStaticParams removed to allow dynamic rendering
// Many child pages have client components that can't be serialized during static generation
// This allows all pages to be server-rendered on-demand

export default async function ClinicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clinic: string }>
}) {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data) {
    notFound()
  }

  const { config } = data
  const footerLabels = config.ui_labels?.footer || {}

  // Check if user is logged in for cart UI
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  // Detect if we're on a dashboard route (staff area) to hide public header/footer
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const isDashboardRoute = pathname.includes('/dashboard')
  const isPortalRoute = pathname.includes('/portal')

  // Fetch tenant subscription tier for feature flags and ads
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('subscription_tier, is_trial, trial_end_date')
    .eq('id', clinic)
    .single()

  const tier: TierId = (tenantData?.subscription_tier as TierId) || 'gratis'
  const tierConfig = getTierById(tier)
  const gratisTier = getTierById('gratis')
  // Gratis tier always exists, but provide complete fallback for type safety
  const tierFeatures = tierConfig?.features || gratisTier?.features || {
    website: true,
    petPortal: true,
    appointments: true,
    medicalRecords: true,
    vaccineTracking: true,
    clinicalTools: true,
    adFree: false,
    ecommerce: false,
    qrTags: false,
    bulkOrdering: false,
    analyticsBasic: false,
    analyticsAdvanced: false,
    analyticsAI: false,
    whatsappApi: false,
    hospitalization: false,
    laboratory: false,
    multiLocation: false,
    apiAccess: false,
    slaGuarantee: false,
    dedicatedSupport: false,
  }
  const isOnTrial = tenantData?.is_trial || false
  const trialEndsAt = tenantData?.trial_end_date || null

  // Show ads only on public pages for non-adFree tiers
  const showAds = !tierFeatures.adFree && !isDashboardRoute && !isPortalRoute

  // Generate structured data for SEO
  const structuredData = generateStructuredData(clinic, config)

  // Fetch i18n data
  const locale = await getLocale()
  const messages = await getMessages()

  // Dashboard routes get a minimal layout (no public header/footer)
  if (isDashboardRoute) {
    return (
      <ToastProvider>
        <CartProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <div className="font-body min-h-screen bg-[var(--bg-subtle)] font-sans text-[var(--text-main)]">
              <ClinicThemeProvider theme={data.theme} />
              {children}
            </div>
          </NextIntlClientProvider>
        </CartProvider>
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <CartProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* Leaflet CSS for interactive maps */}
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />
          <div className="font-body flex min-h-screen flex-col bg-[var(--bg-default)] font-sans text-[var(--text-main)]">
            <ClinicThemeProvider theme={data.theme} />

            {/* JSON-LD Structured Data for SEO */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />

            {/* Skip Link for Accessibility */}
            <a href="#main-content" className="skip-link">
              Saltar al contenido principal
            </a>

            {/* Header */}
            <header
              className="bg-[var(--bg-default)]/95 sticky top-0 z-50 w-full border-b border-[var(--border)] shadow-sm backdrop-blur-md"
              role="banner"
            >
              <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
                <Link
                  href={`/${clinic}`}
                  className="font-heading flex items-center gap-3 text-2xl font-black uppercase tracking-widest text-[var(--primary)] transition-opacity hover:opacity-80"
                >
                  {config.branding?.logo_url ? (
                    <div className="relative h-14 w-40">
                      <Image
                        src={config.branding.logo_url}
                        alt={`${config.name} Logo`}
                        fill
                        className="object-contain object-left"
                        sizes="160px"
                        priority
                      />
                    </div>
                  ) : (
                    <span>{config.name}</span>
                  )}
                </Link>
                <HeaderProviders>
                  <MainNav clinic={clinic} config={config} />
                </HeaderProviders>
              </div>
            </header>

            <TenantProviders
              tenantId={clinic}
              tier={tier}
              tierFeatures={tierFeatures}
              isOnTrial={isOnTrial}
              trialEndsAt={trialEndsAt}
              showAds={showAds}
            >
              <main id="main-content" tabIndex={-1} className="flex-1">
                {children}
              </main>
            </TenantProviders>

            {/* Footer - Enhanced */}
            <footer
              className="relative overflow-hidden bg-[var(--bg-dark,#1a1a1a)] text-white"
              role="contentinfo"
            >
              {/* Decorative top border */}
              <div
                className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary)]"
                aria-hidden="true"
              />

              <div className="container mx-auto px-4 py-16 md:px-6">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
                  {/* Brand Column */}
                  <div className="lg:col-span-1">
                    <FooterLogo
                      clinic={clinic}
                      logoUrl={config.branding?.logo_dark_url}
                      name={config.name}
                    />
                    <p className="mb-6 text-sm leading-relaxed text-gray-400">{config.tagline}</p>

                    {/* Social Links */}
                    <div className="flex gap-3">
                      {config.social?.facebook && (
                        <a
                          href={config.social.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[var(--primary)]"
                          aria-label="Facebook"
                        >
                          <Facebook className="h-5 w-5" />
                        </a>
                      )}
                      {config.social?.instagram && (
                        <a
                          href={config.social.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[var(--primary)]"
                          aria-label="Instagram"
                        >
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                      {config.social?.youtube && (
                        <a
                          href={config.social.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[var(--primary)]"
                          aria-label="YouTube"
                        >
                          <Youtube className="h-5 w-5" />
                        </a>
                      )}
                      {config.social?.tiktok && (
                        <a
                          href={config.social.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[var(--primary)]"
                          aria-label="TikTok"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                          </svg>
                        </a>
                      )}
                      {config.contact?.whatsapp_number && (
                        <a
                          href={`https://wa.me/${config.contact.whatsapp_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 transition-colors hover:bg-green-600"
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Quick Links */}
                  <nav aria-labelledby="footer-quick-links">
                    <h4
                      id="footer-quick-links"
                      className="mb-6 text-sm font-bold uppercase tracking-wider text-white"
                    >
                      Enlaces Rápidos
                    </h4>
                    <ul className="space-y-3">
                      <li>
                        <Link
                          href={`/${clinic}`}
                          className="text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          Inicio
                        </Link>
                      </li>
                      {config.settings?.modules?.services_page !== false && (
                        <li>
                          <Link
                            href={`/${clinic}/services`}
                            className="text-sm text-gray-400 transition-colors hover:text-white"
                          >
                            Servicios
                          </Link>
                        </li>
                      )}
                      <li>
                        <Link
                          href={`/${clinic}/about`}
                          className="text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          Nosotros
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${clinic}/store`}
                          className="text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          Tienda
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${clinic}/faq`}
                          className="text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          Preguntas Frecuentes
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`/${clinic}/portal/login`}
                          className="text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          Portal de Dueños
                        </Link>
                      </li>
                    </ul>
                  </nav>

                  {/* Tools Section - Only show if clinic has vet tools enabled */}
                  {(config.settings?.modules?.toxic_checker || config.settings?.modules?.age_calculator || config.settings?.modules?.booking) && (
                    <nav aria-labelledby="footer-tools">
                      <h4
                        id="footer-tools"
                        className="mb-6 text-sm font-bold uppercase tracking-wider text-white"
                      >
                        Herramientas
                      </h4>
                      <ul className="space-y-3">
                        {config.settings?.modules?.age_calculator && (
                          <li>
                            <Link
                              href={`/${clinic}/tools/age-calculator`}
                              className="text-sm text-gray-400 transition-colors hover:text-white"
                            >
                              Calculadora de Edad
                            </Link>
                          </li>
                        )}
                        {config.settings?.modules?.toxic_checker && (
                          <li>
                            <Link
                              href={`/${clinic}/tools/toxic-food`}
                              className="text-sm text-gray-400 transition-colors hover:text-white"
                            >
                              Alimentos Tóxicos
                            </Link>
                          </li>
                        )}
                        {config.settings?.modules?.booking && (
                          <li>
                            <Link
                              href={`/${clinic}/book`}
                              className="text-sm text-gray-400 transition-colors hover:text-white"
                            >
                              Agendar Cita
                            </Link>
                          </li>
                        )}
                      </ul>
                    </nav>
                  )}

                  {/* Contact Info */}
                  <div aria-labelledby="footer-contact">
                    <h4
                      id="footer-contact"
                      className="mb-6 text-sm font-bold uppercase tracking-wider text-white"
                    >
                      {footerLabels.contact_us || 'Contacto'}
                    </h4>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <MapPin
                          className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-gray-400">{config.contact.address}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Phone
                          className="h-5 w-5 flex-shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                        <a
                          href={`tel:${config.contact.whatsapp_number}`}
                          className="text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          {config.contact.phone_display}
                        </a>
                      </li>
                      <li className="flex items-center gap-3">
                        <Mail
                          className="h-5 w-5 flex-shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                        <a
                          href={`mailto:${config.contact.email}`}
                          className="text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          {config.contact.email}
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Hours */}
                  <div aria-labelledby="footer-hours">
                    <h4
                      id="footer-hours"
                      className="mb-6 text-sm font-bold uppercase tracking-wider text-white"
                    >
                      Horarios
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <Clock
                          className="h-5 w-5 flex-shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-white">Lun - Vie</p>
                          <p className="text-gray-400">
                            {config.hours?.weekdays || '8:00 - 18:00'}
                          </p>
                        </div>
                      </li>
                      <li className="flex items-center gap-3">
                        <Clock
                          className="h-5 w-5 flex-shrink-0 text-[var(--primary)]"
                          aria-hidden="true"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-white">Sábados</p>
                          <p className="text-gray-400">
                            {config.hours?.saturday || '8:00 - 12:00'}
                          </p>
                        </div>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <span
                            className="h-2 w-2 animate-pulse rounded-full bg-green-500"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="text-sm">
                          <p className="font-bold text-[var(--accent)]">Urgencias 24hs</p>
                          <p className="text-gray-400">Todos los días</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Newsletter Section - Client-only to prevent hydration mismatch from browser extensions */}
                <section
                  aria-labelledby="newsletter-heading"
                  className="from-[var(--primary)]/20 to-[var(--accent)]/20 mt-12 rounded-2xl border border-white/10 bg-gradient-to-r p-8"
                >
                  <NewsletterForm
                    clinic={clinic}
                    title={footerLabels.newsletter_title}
                    placeholder={footerLabels.newsletter_placeholder}
                    buttonText={footerLabels.newsletter_button}
                  />
                </section>

                {/* Bottom Bar */}
                <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
                  <Copyright
                    companyName={config.name}
                    rightsText={footerLabels.rights || 'Todos los derechos reservados.'}
                  />
                  <div className="flex gap-6 text-sm">
                    <Link
                      href={`/${clinic}/privacy`}
                      className="text-gray-500 transition-colors hover:text-white"
                    >
                      {footerLabels.privacy || 'Privacidad'}
                    </Link>
                    <Link
                      href={`/${clinic}/terms`}
                      className="text-gray-500 transition-colors hover:text-white"
                    >
                      {footerLabels.terms || 'Términos'}
                    </Link>
                  </div>
                </div>
              </div>
            </footer>

            {/* Cart UI (only for logged-in users) */}
            <CartLayoutWrapper isLoggedIn={isLoggedIn} />
          </div>
        </NextIntlClientProvider>
      </CartProvider>
    </ToastProvider>
  )
}
