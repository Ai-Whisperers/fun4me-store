import { getClinicData } from '@/lib/clinics'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { AppointmentForm } from '@/components/forms/appointment-form'
import { createClient } from '@/lib/supabase/server'
import { PublicHero } from '@/components/home/public-hero'
import { ClinicLocationMap } from '@/components/home/clinic-location-map'
import { getTranslations } from 'next-intl/server'

// Dynamic Icon Component - safely handles icon name lookup
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  if (!name || typeof name !== 'string') {
    return <Icons.HelpCircle className={className} />
  }

  // Convert kebab-case to PascalCase for Lucide icon lookup
  const iconName =
    name.charAt(0).toUpperCase() +
    name.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())

  const IconsMap = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>
  const Icon = IconsMap[iconName] || Icons.HelpCircle
  return <Icon className={className} />
}

export default async function ClinicHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ public?: string }>
}) {
  const { clinic } = await params
  const { public: showPublic } = await searchParams
  const data = await getClinicData(clinic)

  if (!data) notFound()

  const { home, config } = data
  const tHome = await getTranslations('home')

  // Allow viewing public page with ?public=true query param
  const forcePublic = showPublic === 'true'

  // Check if user is authenticated - redirect to portal (unless forcing public view)
  if (!forcePublic) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Check if user belongs to this clinic
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      // Redirect authenticated users to their portal
      if (profile?.tenant_id === clinic) {
        redirect(`/${clinic}/portal`)
      }
    }
  }

  // Public landing page for visitors
  return (
    <div className="flex min-h-screen flex-col">
      {/* PUBLIC HERO SECTION */}
      <PublicHero clinic={clinic} home={home} config={config} />

      {/* PROMO BANNER - Improved as floating card */}
      {home.promo_banner?.enabled && (
        <div className="relative z-20 mx-4 -mt-6 md:mx-auto md:max-w-4xl">
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary-light)] px-6 py-4 text-center text-sm font-bold text-[var(--secondary-contrast)] shadow-xl md:px-8 md:text-base">
            <Icons.Sparkles className="h-5 w-5 flex-shrink-0" />
            <span>{home.promo_banner.text}</span>
          </div>
        </div>
      )}

      {/* FEATURES GRID - Improved cards and layout */}
      <section className="section-padding bg-[var(--bg-subtle)]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center md:mb-16">
<span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
              {config.ui_labels?.home?.features_badge || tHome('ourServices')}
            </span>
            <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
              {config.ui_labels?.home?.features_title}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[var(--text-secondary)]">
              {config.ui_labels?.home?.features_subtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {(home.features ?? []).map(
              (feature: { icon: string; title: string; text: string }, idx: number) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[var(--shadow-card-hover)] md:p-8"
                >
                  {/* Icon with gradient background */}
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-lg transition-transform duration-300 group-hover:scale-110 md:h-16 md:w-16">
                    <DynamicIcon name={feature.icon} className="h-7 w-7 md:h-8 md:w-8" />
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
                    {feature.title}
                  </h3>
                  <p className="leading-relaxed text-[var(--text-secondary)]">{feature.text}</p>

                  {/* Decorative corner accent */}
                  <div className="from-[var(--primary)]/5 absolute right-0 top-0 h-20 w-20 rounded-bl-[100px] bg-gradient-to-bl to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* INTERACTIVE TOOLS */}
      {home.interactive_tools_section?.enabled && (
        <section className="section-padding relative overflow-hidden bg-white">
          {/* Decorative blobs */}
          <div className="bg-[var(--primary)]/5 absolute right-0 top-0 h-48 w-48 -translate-y-1/2 translate-x-1/2 rounded-full blur-3xl sm:h-72 sm:w-72 lg:h-96 lg:w-96" />
          <div className="bg-[var(--accent)]/10 absolute bottom-0 left-0 h-32 w-32 -translate-x-1/2 translate-y-1/2 rounded-full blur-3xl sm:h-48 sm:w-48 lg:h-64 lg:w-64" />

          <div className="container relative z-10 mx-auto px-4 text-center">
            <span className="bg-[var(--accent)]/10 mb-4 inline-block rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--secondary-dark)]">
              {config.ui_labels?.home?.tools_badge}
            </span>
            <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
              {home.interactive_tools_section.title}
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-[var(--text-secondary)]">
              {home.interactive_tools_section.subtitle}
            </p>

            <Link
              href={`/${clinic}/tools/toxic-food`}
              className="group inline-flex transform items-center gap-3 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:opacity-90 hover:shadow-xl"
            >
              <Icons.Search className="h-6 w-6 transition-transform group-hover:scale-110" />
              {home.interactive_tools_section.toxic_food_cta}
              <Icons.ArrowRight className="-ml-2 h-5 w-5 opacity-0 transition-all group-hover:ml-0 group-hover:opacity-100" />
            </Link>
          </div>
        </section>
      )}

      {/* TESTIMONIALS - Completely redesigned */}
      {home.testimonials_section?.enabled && data.testimonials && (
        <section className="section-padding relative overflow-hidden bg-gradient-to-b from-[var(--bg-subtle)] to-white">
          {/* Decorative elements */}
          <div className="via-[var(--primary)]/20 absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent to-transparent" />

          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center md:mb-16">
<span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                {config.ui_labels?.home?.testimonials_badge || tHome('testimonials')}
              </span>
              <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                {home.testimonials_section.title}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-[var(--text-secondary)]">
                {home.testimonials_section.subtitle}
              </p>
            </div>

            {/* Testimonials Grid - Show 3 max on desktop */}
            <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {(data.testimonials ?? []).slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] md:p-8"
                >
                  {/* Quote icon */}
                  <div className="absolute -top-3 left-6 rounded-xl bg-[var(--primary)] p-2.5 shadow-lg">
                    <Icons.Quote className="h-4 w-4 text-white" />
                  </div>

                  {/* Stars */}
                  <div className="mb-4 mt-2 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Icons.Star
                        key={i}
                        className={`h-5 w-5 ${i < t.rating ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>

                  {/* Testimonial text */}
                  <p className="mb-6 line-clamp-4 text-base leading-relaxed text-[var(--text-primary)]">
                    &ldquo;{t.text}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-sm font-bold text-white">
                        {t.author.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{t.author}</span>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      {t.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION / CONTACT - Improved layout */}
      <section className="section-padding bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Contact Form Side */}
            <div>
              <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                {config.ui_labels?.home?.contact_badge}
              </span>
              <h2 className="font-heading mb-8 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                {config.ui_labels?.home?.visit_us || tHome('visitUs')}
              </h2>

              {/* Contact Info Cards */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-4 rounded-xl bg-[var(--bg-subtle)] p-4">
                  <div className="bg-[var(--primary)]/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                    <Icons.MapPin className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{tHome('address')}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{config.contact.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl bg-[var(--bg-subtle)] p-4">
                  <div className="bg-[var(--primary)]/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                    <Icons.Phone className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{tHome('phone')}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {config.contact.phone_display}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl bg-[var(--bg-subtle)] p-4">
                  <div className="bg-[var(--primary)]/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                    <Icons.Clock className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{tHome('schedule')}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {tHome('weekdaysSchedule', { hours: config.hours?.weekdays || '---' })}
                    </p>
                  </div>
                </div>
{config.settings?.emergency_24h ? (
                  <div className="bg-[var(--accent)]/10 border-[var(--accent)]/20 flex items-center gap-4 rounded-xl border p-4">
                    <div className="bg-[var(--accent)]/20 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                      <Icons.Zap className="h-6 w-6 text-[var(--secondary-dark)]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{tHome('emergency')}</p>
                      <p className="text-sm font-medium text-[var(--secondary-dark)]">
                        {tHome('emergencyHours')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--accent)]/10 border-[var(--accent)]/20 flex items-center gap-4 rounded-xl border p-4">
                    <div className="bg-[var(--accent)]/20 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                      <Icons.MessageCircle className="h-6 w-6 text-[var(--secondary-dark)]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {config.ui_labels?.home?.whatsapp_label || 'WhatsApp'}
                      </p>
                      <p className="text-sm font-medium text-[var(--secondary-dark)]">
                        {config.ui_labels?.home?.whatsapp_text || 'Atencion personalizada'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {config.settings?.modules?.booking !== false ? (
                <AppointmentForm />
              ) : (
                /* WhatsApp Contact Card for non-booking tenants */
                <div className="rounded-2xl border border-gray-100 bg-[var(--bg-subtle)] p-6 shadow-[var(--shadow-card)]">
                  <h3 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
                    {config.ui_labels?.home?.emergency_title || 'Contactanos'}
                  </h3>
                  <p className="mb-6 text-[var(--text-secondary)]">
                    {config.ui_labels?.home?.emergency_text || 'Escribinos por WhatsApp para atencion personalizada.'}
                  </p>
                  <a
                    href={`https://wa.me/${config.contact.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <Icons.MessageCircle className="h-5 w-5" />
                    {config.ui_labels?.home?.emergency_cta || 'Enviar Mensaje'}
                  </a>
                </div>
              )}
            </div>

            {/* Map Side - Interactive Map */}
            <div className="h-[300px] w-full sm:h-[400px] lg:h-full lg:min-h-[600px]">
              {config.contact?.coordinates?.lat && config.contact?.coordinates?.lng ? (
                <ClinicLocationMap
                  clinicName={config.name}
                  address={config.contact.address}
                  lat={config.contact.coordinates.lat}
                  lng={config.contact.coordinates.lng}
                  googleMapsId={config.contact.google_maps_id}
                  mapButtonLabel={config.ui_labels?.home?.map_button}
                />
              ) : (
                // Fallback to static image if no coordinates
                <div className="group relative h-full w-full overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url('/branding/${clinic}/images/static-map.jpg')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-end justify-center p-8">
                    <a
                      href={`https://www.google.com/maps/place/?q=place_id:${config.contact?.google_maps_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-full bg-white px-8 py-4 font-bold text-[var(--text-primary)] shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
                    >
                      <Icons.MapPin className="h-5 w-5 text-[var(--primary)]" />
                      {config.ui_labels?.home?.map_button}
                      <Icons.ExternalLink className="h-4 w-4 text-[var(--text-muted)]" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
