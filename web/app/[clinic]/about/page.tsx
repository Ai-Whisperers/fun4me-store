import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import {
  Award,
  Heart,
  Users,
  Stethoscope,
  Building2,
  Target,
  Eye,
  ShieldCheck,
  HeartPulse,
  Microscope,
  ImageIcon,
  BedDouble,
  Scissors,
  Calendar,
  BadgeCheck,
  ArrowRight,
  Phone,
  Clock,
} from 'lucide-react'
import { TeamMemberCard } from '@/components/about/team-member-card'
import { FacilitiesGallery } from '@/components/about/facilities-gallery'
import { CertificationBadge } from '@/components/about/certification-badge'
import { TeamSchema, BreadcrumbSchema } from '@/components/seo/structured-data'
import { getCanonicalUrl, getSiteUrl } from '@/lib/config'
import { getTranslations } from 'next-intl/server'

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinic: string }>
}): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return { title: 'Página no encontrada' }

  const { about, config } = data
  const title = `Conoce a ${config.name} | Equipo y Historia`
  const description =
    about?.intro?.text?.substring(0, 160) ||
    `Conoce al equipo de profesionales de ${config.name}. Años de experiencia en medicina veterinaria.`
  const canonicalUrl = getCanonicalUrl(clinic, '/about')
  const ogImage = config.branding?.og_image_url || '/branding/default-og.jpg'

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: canonicalUrl,
      title,
      description,
      siteName: config.name,
      images: [
        {
          url: ogImage.startsWith('/') ? getSiteUrl(ogImage) : ogImage,
          width: 1200,
          height: 630,
          alt: `Equipo de ${config.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

// Icon mapping for dynamic facility icons
const FACILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  stethoscope: Stethoscope,
  'heart-pulse': HeartPulse,
  microscope: Microscope,
  image: ImageIcon,
  bed: BedDouble,
  scissors: Scissors,
}

// Icon mapping for values
const VALUE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  award: Award,
  users: Users,
  'shield-check': ShieldCheck,
}

export default async function AboutPage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data) notFound()

  const { about, config } = data
  const t = await getTranslations('about')
  const tNav = await getTranslations('nav')
  const heroImage = about.intro?.image

  // Default stats that can be overridden by config
  const stats = {
    pets_served: config.stats?.pets_served || '+15K',
    years_experience: config.stats?.years_experience || '9+',
    emergency_hours: config.stats?.emergency_hours || '24/7',
    rating: config.stats?.rating || '4.9',
  }

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: tNav('home'), url: `/${clinic}` },
    { name: tNav('about'), url: `/${clinic}/about` },
  ]

  // Team members for Person schema
  const teamMembers =
    about.team?.map(
      (member: {
        name: string
        role: string
        bio?: string
        photo_url?: string
        specialties?: string[]
      }) => ({
        name: member.name,
        role: member.role,
        bio: member.bio,
        photo_url: member.photo_url,
        specialties: member.specialties,
      })
    ) || []

  // Role to gradient/color mapping for visual variety
  const getRoleStyle = (role: string) => {
    const roleLC = role.toLowerCase()
    if (roleLC.includes('director') || roleLC.includes('fundador')) {
      return {
        gradient: 'from-[var(--primary)] to-[var(--primary-dark)]',
        badge: 'bg-[var(--primary)]/10 text-[var(--primary)]',
        icon: 'Award',
      }
    }
    if (roleLC.includes('cirugía') || roleLC.includes('cirujano')) {
      return {
        gradient: 'from-blue-600 to-blue-700',
        badge: 'bg-blue-50 text-blue-700',
        icon: 'Stethoscope',
      }
    }
    if (roleLC.includes('diagnóstico') || roleLC.includes('imagen')) {
      return {
        gradient: 'from-purple-600 to-purple-700',
        badge: 'bg-purple-50 text-purple-700',
        icon: 'Stethoscope',
      }
    }
    return {
      gradient: 'from-[var(--accent)] to-[var(--secondary-dark)]',
      badge: 'bg-[var(--accent)]/10 text-[var(--secondary-dark)]',
      icon: 'Heart',
    }
  }

  // Get facility icon component
  const getFacilityIcon = (iconName: string) => {
    return FACILITY_ICONS[iconName] || Stethoscope
  }

  // Get value icon component
  const getValueIcon = (iconName: string) => {
    return VALUE_ICONS[iconName] || Heart
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbSchema items={breadcrumbItems} />
      {teamMembers.length > 0 && (
        <TeamSchema clinic={clinic} clinicName={config.name} members={teamMembers} />
      )}

      <div className="min-h-screen bg-[var(--bg-default)]">
        {/* Hero Section - With visual interest */}
        <section className="relative overflow-hidden py-20 md:py-28">
          {/* Background - Image or Pattern */}
          {heroImage ? (
            <>
              <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${heroImage}')` }}
              />
              {/* Reduced opacity overlay for better image visibility */}
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/70 via-white/60 to-white/90" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-[var(--bg-subtle)] via-white to-[var(--bg-subtle)]" />
              <div
                className="absolute inset-0 z-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 2px 2px, var(--primary) 1px, transparent 0)',
                  backgroundSize: '32px 32px',
                }}
              />
            </>
          )}

          {/* Decorative shapes */}
          <div className="bg-[var(--primary)]/5 absolute right-0 top-0 h-[200px] w-[200px] -translate-y-1/2 translate-x-1/2 rounded-full blur-3xl sm:h-[350px] sm:w-[350px] lg:h-[500px] lg:w-[500px]" />
          <div className="bg-[var(--accent)]/10 absolute bottom-0 left-0 h-[150px] w-[150px] -translate-x-1/2 translate-y-1/2 rounded-full blur-3xl sm:h-[280px] sm:w-[280px] lg:h-[400px] lg:w-[400px]" />

          <div className="container relative z-10 mx-auto max-w-4xl px-4 text-center">
            <span className="bg-[var(--primary)]/10 mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--primary)] backdrop-blur-sm">
              <Heart className="h-4 w-4" />
              {data.config.ui_labels?.about?.intro_badge || t('ourHistory')}
            </span>

            <h1 className="font-heading mb-8 text-4xl font-black leading-tight text-[var(--text-primary)] md:text-5xl lg:text-6xl">
              {about.intro.title}
            </h1>

            {/* Story text with better formatting - split into paragraphs */}
            <div className="relative rounded-2xl bg-white/50 p-6 backdrop-blur-sm md:p-8">
              <div className="absolute -left-2 top-6 h-[calc(100%-3rem)] w-1 rounded-full bg-gradient-to-b from-[var(--primary)] via-[var(--accent)] to-transparent md:-left-4" />
              <div className="space-y-4 text-left md:pl-6">
                {about.intro.text.split('\n\n').map((paragraph: string, idx: number) => (
                  <p
                    key={idx}
                    className="text-base leading-relaxed text-[var(--text-secondary)] md:text-lg"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Stats row - configurable from config.stats */}
            <div className="mt-12 grid grid-cols-2 gap-4 border-t border-gray-200 pt-12 md:grid-cols-4 md:gap-6">
              <div className="rounded-xl bg-white/60 p-3 text-center backdrop-blur-sm sm:p-4">
                <p className="mb-1 text-2xl font-black text-[var(--primary)] sm:text-3xl md:text-4xl">
                  {stats.pets_served}
                </p>
                <p className="text-xs font-medium text-[var(--text-muted)] sm:text-sm">
                  {t('petsServed')}
                </p>
              </div>
              <div className="rounded-xl bg-white/60 p-3 text-center backdrop-blur-sm sm:p-4">
                <p className="mb-1 text-2xl font-black text-[var(--primary)] sm:text-3xl md:text-4xl">
                  {stats.years_experience}
                </p>
                <p className="text-xs font-medium text-[var(--text-muted)] sm:text-sm">
                  {t('yearsExperience')}
                </p>
              </div>
              <div className="rounded-xl bg-white/60 p-3 text-center backdrop-blur-sm sm:p-4">
                <p className="mb-1 text-2xl font-black text-[var(--primary)] sm:text-3xl md:text-4xl">
                  {stats.emergency_hours}
                </p>
                <p className="text-xs font-medium text-[var(--text-muted)] sm:text-sm">
                  {t('emergencyAttention')}
                </p>
              </div>
              <div className="rounded-xl bg-white/60 p-3 text-center backdrop-blur-sm sm:p-4">
                <p className="mb-1 text-2xl font-black text-[var(--primary)] sm:text-3xl md:text-4xl">
                  {stats.rating}
                </p>
                <p className="text-xs font-medium text-[var(--text-muted)] sm:text-sm">
                  {t('googleRating')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        {(about.mission || about.vision) && (
          <section className="section-padding relative bg-white">
            <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
                {/* Mission */}
                {about.mission && (
                  <div className="from-[var(--primary)]/5 to-[var(--primary)]/10 border-[var(--primary)]/10 relative rounded-3xl border bg-gradient-to-br p-8">
                    <div className="absolute -top-4 left-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] shadow-lg">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="pt-6">
                      <h2 className="font-heading mb-4 text-2xl font-black text-[var(--text-primary)]">
                        {about.mission.title}
                      </h2>
                      <p className="leading-relaxed text-[var(--text-secondary)]">
                        {about.mission.text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Vision */}
                {about.vision && (
                  <div className="from-[var(--accent)]/5 to-[var(--accent)]/10 border-[var(--accent)]/10 relative rounded-3xl border bg-gradient-to-br p-8">
                    <div className="absolute -top-4 left-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary-dark)] shadow-lg">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="pt-6">
                      <h2 className="font-heading mb-4 text-2xl font-black text-[var(--text-primary)]">
                        {about.vision.title}
                      </h2>
                      <p className="leading-relaxed text-[var(--text-secondary)]">
                        {about.vision.text}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Timeline Section */}
        {about.timeline && about.timeline.length > 0 && (
          <section className="section-padding bg-[var(--bg-subtle)]">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <span className="bg-[var(--primary)]/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                  <Calendar className="h-4 w-4" />
                  {t('history')}
                </span>
                <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                  {t('ourJourney')}
                </h2>
              </div>

              {/* Timeline - Horizontal scroll on mobile */}
              <div className="relative mx-auto max-w-4xl">
                {/* Timeline line */}
                <div className="to-[var(--primary)]/30 absolute bottom-0 left-4 top-0 w-0.5 bg-gradient-to-b from-[var(--primary)] via-[var(--accent)] md:left-1/2 md:-translate-x-1/2" />

                <div className="space-y-8">
                  {about.timeline.map((item: { year: string; event: string }, idx: number) => (
                    <div
                      key={idx}
                      className={`relative flex items-center gap-4 md:gap-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    >
                      {/* Year bubble */}
                      <div className="absolute left-4 z-10 h-3 w-3 rounded-full bg-[var(--primary)] shadow-md ring-4 ring-white md:left-1/2 md:-translate-x-1/2" />

                      {/* Content card */}
                      <div
                        className={`ml-12 md:ml-0 md:w-[calc(50%-2rem)] ${idx % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8'}`}
                      >
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                          <span className="bg-[var(--primary)]/10 mb-2 inline-block rounded-full px-3 py-1 text-sm font-black text-[var(--primary)]">
                            {item.year}
                          </span>
                          <p className="text-[var(--text-secondary)]">{item.event}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Team Grid */}
        <section className="section-padding relative bg-white">
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center md:mb-16">
              <span className="bg-[var(--primary)]/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                <Users className="h-4 w-4" />
                {t('team')}
              </span>
              <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                {data.config.ui_labels?.about?.team_title || t('ourTeam')}
              </h2>
              <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
                {t('teamDescription')}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
              {about.team.map(
                (
                  member: {
                    name: string
                    role: string
                    bio: string
                    photo_url?: string
                    image?: string
                    specialties?: string[]
                  },
                  index: number
                ) => {
                  const style = getRoleStyle(member.role)

                  return (
                    <TeamMemberCard
                      key={index}
                      member={member}
                      gradient={style.gradient}
                      badgeClass={style.badge}
                      iconName={style.icon}
                    />
                  )
                }
              )}
            </div>
          </div>
        </section>

        {/* Values Section - Using JSON data */}
        <section className="section-padding bg-[var(--bg-subtle)]">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <span className="bg-[var(--primary)]/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                <Heart className="h-4 w-4" />
                {t('values')}
              </span>
              <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                {t('ourValues')}
              </h2>
            </div>

            <div
              className={`mx-auto grid max-w-5xl gap-8 ${
                about.values && about.values.length === 4
                  ? 'md:grid-cols-2 lg:grid-cols-4'
                  : 'md:grid-cols-3'
              }`}
            >
              {about.values && about.values.length > 0 ? (
                // Use values from JSON
                about.values.map(
                  (value: { icon: string; title: string; description: string }, idx: number) => {
                    const IconComponent = getValueIcon(value.icon)
                    return (
                      <div key={idx} className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] shadow-lg">
                          <IconComponent className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="mb-2 font-bold text-[var(--text-primary)]">{value.title}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{value.description}</p>
                      </div>
                    )
                  }
                )
              ) : (
                // Fallback hardcoded values
                <>
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] shadow-lg">
                      <Heart className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mb-2 font-bold text-[var(--text-primary)]">
                      {t('animalLove')}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t('animalLoveText')}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] shadow-lg">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mb-2 font-bold text-[var(--text-primary)]">
                      {t('professionalExcellence')}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t('professionalExcellenceText')}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mb-2 font-bold text-[var(--text-primary)]">
                      {t('familyCommitment')}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t('familyCommitmentText')}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Facilities Section */}
        {about.facilities && (
          <section className="section-padding bg-white">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center md:mb-16">
                <span className="bg-[var(--primary)]/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                  <Building2 className="h-4 w-4" />
                  {t('facilities')}
                </span>
                <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                  {about.facilities.title || t('ourFacilities')}
                </h2>
                <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
                  {about.facilities.description}
                </p>
              </div>

              {/* Facilities Gallery */}
              {about.facilities.images && about.facilities.images.length > 0 && (
                <FacilitiesGallery images={about.facilities.images} />
              )}

              {/* Features Grid - With dynamic icons */}
              {about.facilities.features && (
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {about.facilities.features.map(
                    (feature: { icon: string; title: string; text: string }, idx: number) => {
                      const IconComponent = getFacilityIcon(feature.icon)
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-4 rounded-2xl bg-[var(--bg-subtle)] p-6 transition-shadow hover:shadow-md"
                        >
                          <div className="bg-[var(--primary)]/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                            <IconComponent className="h-6 w-6 text-[var(--primary)]" />
                          </div>
                          <div>
                            <h3 className="mb-1 font-bold text-[var(--text-primary)]">
                              {feature.title}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">{feature.text}</p>
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Certifications Section */}
        {about.certifications && about.certifications.length > 0 && (
          <section className="section-padding bg-[var(--bg-subtle)]">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <span className="bg-[var(--primary)]/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--primary)]">
                  <BadgeCheck className="h-4 w-4" />
                  {t('certifications')}
                </span>
                <h2 className="font-heading mb-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
                  {t('certificationsTitle')}
                </h2>
                <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
                  {t('certificationsText')}
                </p>
              </div>

              <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-6 md:gap-8">
                {about.certifications.map(
                  (cert: { name: string; description: string; logo?: string }, idx: number) => (
                    <CertificationBadge
                      key={idx}
                      name={cert.name}
                      description={cert.description}
                      logo={cert.logo}
                    />
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="section-padding relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)]">
          {/* Decorative elements */}
          <div className="absolute right-0 top-0 h-48 w-48 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5 blur-3xl sm:h-72 sm:w-72 lg:h-96 lg:w-96" />
          <div className="absolute bottom-0 left-0 h-36 w-36 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/5 blur-3xl sm:h-56 sm:w-56 lg:h-72 lg:w-72" />

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-heading mb-4 text-3xl font-black text-white md:text-4xl">
                {t('readyToMeetUs')}
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
                {t('ctaDescription')}
              </p>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href={`/${clinic}/book`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-[var(--primary)] shadow-lg transition-colors hover:bg-gray-100"
                >
                  <Calendar className="h-5 w-5" />
                  {t('bookAppointment')}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href={`tel:${config.contact?.phone_display?.replace(/\s/g, '') || ''}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 font-bold text-white transition-colors hover:bg-white/20"
                >
                  <Phone className="h-5 w-5" />
                  {t('callNow')}
                </a>
              </div>

              {/* Quick info */}
              <div className="mt-10 flex flex-wrap justify-center gap-8 border-t border-white/20 pt-8 text-white/80">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{t('emergency247')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <span>{config.contact?.phone_display || '+595 981 123 456'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
