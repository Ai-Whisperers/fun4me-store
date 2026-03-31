/**
 * Content Data Types
 * Types for JSON-CMS content (home, services, about, etc.)
 */

// ============================================================================
// Home Page Data Types
// ============================================================================

export interface TrustBadge {
  icon: string
  text: string
}

export interface HeroSection {
  badge_text: string
  headline: string
  subhead: string
  cta_primary: string
  cta_secondary: string
  cta_secondary_link?: string // Optional: "whatsapp", "store", "/custom-path", or full URL
  trust_badges: TrustBadge[]
}

export interface FeatureItem {
  icon: string
  title: string
  text: string
}

export interface PromoBanner {
  enabled: boolean
  text: string
  link: string
  expires: string
}

export interface StatItem {
  value: string
  label: string
}

export interface StatsSection {
  enabled: boolean
  title: string
  stats: StatItem[]
}

export interface InteractiveTool {
  id: string
  icon: string
  title: string
  description: string
  color: string
}

export interface InteractiveToolsSection {
  enabled: boolean
  title: string
  subtitle: string
  toxic_food_cta: string
  age_calc_cta: string
  tools: InteractiveTool[]
}

export interface ServicesPreview {
  enabled: boolean
  title: string
  subtitle: string
  featured_services: string[]
  cta_text: string
}

export interface TestimonialsSection {
  enabled: boolean
  title: string
  subtitle: string
  show_count: number
}

export interface BrandLogo {
  name: string
  image: string
}

export interface PartnersSection {
  enabled: boolean
  title: string
  logos: BrandLogo[]
}

export interface CtaSection {
  enabled: boolean
  title: string
  subtitle: string
  primary_cta: string
  secondary_cta: string
}

export interface SeoMetadata {
  meta_title: string
  meta_description: string
  keywords: string[]
  og_type: string
  og_locale: string
}

export interface HomeData {
  hero: HeroSection
  features: FeatureItem[]
  promo_banner: PromoBanner
  stats_section: StatsSection
  interactive_tools_section: InteractiveToolsSection
  services_preview: ServicesPreview
  testimonials_section: TestimonialsSection
  partners_section: PartnersSection
  cta_section: CtaSection
  seo: SeoMetadata
}

// ============================================================================
// Services Data Types
// ============================================================================

export interface ServiceVariant {
  name: string
  description?: string
  price_display: string
  price_value: number
  image?: string
  size_pricing?: Record<string, unknown>
}

export interface ServiceDetails {
  description: string
  duration_minutes: number
  includes: string[]
}

export interface ServiceBooking {
  online_enabled: boolean
  emergency_available: boolean
}

export interface Service {
  id: string
  visible: boolean
  category: string
  title: string
  icon: string
  summary: string
  image: string
  details: ServiceDetails
  variants: ServiceVariant[]
  booking: ServiceBooking
}

export interface ServicesMeta {
  title: string
  subtitle: string
}

export interface ServicesData {
  meta: ServicesMeta
  services: Service[]
}

// ============================================================================
// About Page Data Types
// ============================================================================

export interface AboutIntro {
  title: string
  text: string
  founded_year: number
  image: string
}

export interface MissionVision {
  title: string
  text: string
}

export interface ValueItem {
  icon: string
  title: string
  description: string
}

export interface TeamMember {
  name: string
  role: string
  image: string
  bio: string
  specialties: string[]
  education: string[]
}

export interface FacilityFeature {
  icon: string
  title: string
  text: string
}

export interface FacilitiesInfo {
  title: string
  description: string
  features: FacilityFeature[]
  images: string[]
}

export interface Certification {
  name: string
  description: string
  logo: string
}

export interface TimelineEvent {
  year: string
  event: string
}

export interface AboutData {
  intro: AboutIntro
  mission: MissionVision
  vision: MissionVision
  values: ValueItem[]
  team: TeamMember[]
  facilities: FacilitiesInfo
  certifications: Certification[]
  timeline: TimelineEvent[]
}

// ============================================================================
// Testimonials Data Types
// ============================================================================

export interface Testimonial {
  id: number
  author: string
  pet_name: string
  pet_type: string
  rating: number
  pet_image: string
  text: string
  date: string
  source: string
  verified: boolean
  service_used: string
}

export type TestimonialsData = Testimonial[]

// ============================================================================
// FAQ Data Types
// ============================================================================

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
}

export type FaqData = FaqItem[]

// ============================================================================
// Legal Data Types
// ============================================================================

export interface LegalSection {
  title: string
  content: string
}

export interface PrivacyPolicy {
  title: string
  last_updated: string
  sections: LegalSection[]
}

export interface TermsOfService {
  title: string
  last_updated: string
  sections: LegalSection[]
}

export interface CookiePolicy {
  title: string
  last_updated: string
  content: string
}

export interface LegalData {
  privacy_policy: PrivacyPolicy
  terms_of_service: TermsOfService
  cookie_policy: CookiePolicy
}

// ============================================================================
// Images Types
// ============================================================================

export interface ClinicImage {
  src: string
  alt: string
  width: number
  height: number
}

export interface ImageCategory {
  [key: string]: ClinicImage
}

export interface ClinicImages {
  version: string
  basePath: string
  images: {
    hero?: ImageCategory
    team?: ImageCategory
    facilities?: ImageCategory
    services?: ImageCategory
    features?: ImageCategory
    store?: ImageCategory
    tools?: ImageCategory
    patterns?: ImageCategory
    branding?: ImageCategory
    brands?: ImageCategory
    [category: string]: ImageCategory | undefined
  }
  placeholders?: {
    pet?: string
    product?: string
    team?: string
    service?: string
  }
}
