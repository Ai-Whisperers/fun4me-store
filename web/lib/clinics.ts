import fs from 'node:fs'
import path from 'node:path'
import merge from 'lodash.merge'
import { validateConfig, validateTheme } from './schemas/clinic-config'

// Import all types from the centralized types file
export type {
  // Config types
  ClinicConfig,
  ContactInfo,
  SocialLinks,
  HoursInfo,
  ModuleSettings,
  ClinicSettings,
  BrandingAssets,
  StatsInfo,

  // UI Labels types
  UiLabels,
  NavLabels,
  FooterLabels,
  HomeLabels,
  ServicesLabels,
  AboutLabels,
  PortalLabels,
  StoreLabels,
  CartLabels,
  CheckoutLabels,
  BookingLabels,
  CommonLabels,
  AuthLabels,
  ToolsLabels,
  ErrorLabels,

  // Home data types
  HomeData,
  HeroSection,
  FeatureItem,
  PromoBanner,
  StatsSection,
  InteractiveToolsSection,
  ServicesPreview,
  TestimonialsSection,
  PartnersSection,
  CtaSection,
  SeoMetadata,

  // Services data types
  ServicesData,
  Service,
  ServiceVariant,
  ServiceDetails,
  ServiceBooking,

  // About data types
  AboutData,
  TeamMember,
  ValueItem,
  FacilitiesInfo,
  Certification,
  TimelineEvent,

  // Testimonials types
  TestimonialsData,
  Testimonial,

  // FAQ types
  FaqData,
  FaqItem,

  // Legal types
  LegalData,
  PrivacyPolicy,
  TermsOfService,
  CookiePolicy,

  // Theme types
  ClinicTheme,

  // Images types
  ClinicImages,
  ClinicImage,
  ImageCategory,

  // Complete clinic data
  ClinicData,
} from './types/clinic-config'

import type {
  ClinicData,
  UiLabels,
  ClinicConfig,
  ClinicTheme,
  ClinicImages,
  ClinicImage,
  HomeData,
  ServicesData,
  AboutData,
  TestimonialsData,
  FaqData,
  LegalData,
} from './types/clinic-config'

const CONTENT_DIR = path.join(process.cwd(), '.content_data')

export async function getClinicData(slug: string): Promise<ClinicData | null> {
  const clinicDir = path.join(CONTENT_DIR, slug)

  // Check if clinic exists
  if (!fs.existsSync(clinicDir)) {
    return null
  }

  // Helper to read JSON with proper typing
  const readJson = <T>(file: string): T | null => {
    const filePath = path.join(clinicDir, file)
    if (fs.existsSync(filePath)) {
      const fileContents = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(fileContents) as T
    }
    return null
  }

  // Read and validate config
  let config: ClinicConfig | null = null
  try {
    const rawConfig = readJson<unknown>('config.json')
    if (rawConfig) {
      // Zod schema validates and returns ZodClinicConfig, cast to manual ClinicConfig
      config = validateConfig(rawConfig) as unknown as ClinicConfig
    }
  } catch (error) {
    console.error(`❌ [${slug}] config.json validation failed:`, error)
    // In production, fail fast. In dev, we want to see the error.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid config.json for clinic: ${slug}`)
    }
    return null // In dev, return null to show error page
  }

  // Read and validate theme
  let theme: ClinicTheme | null = null
  try {
    const rawTheme = readJson<unknown>('theme.json')
    if (rawTheme) {
      theme = validateTheme(rawTheme) // Validates and throws if invalid
    }
  } catch (error) {
    console.error(`❌ [${slug}] theme.json validation failed:`, error)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid theme.json for clinic: ${slug}`)
    }
    return null
  }
  const images = readJson<ClinicImages>('images.json')
  const home = readJson<HomeData>('home.json')
  const services = readJson<ServicesData>('services.json')
  const about = readJson<AboutData>('about.json')
  const testimonials = readJson<TestimonialsData>('testimonials.json')
  const faq = readJson<FaqData>('faq.json')
  const legal = readJson<LegalData>('legal.json')

  // Load global UI labels
  const globalUiLabelsPath = path.join(CONTENT_DIR, 'ui_labels.json')
  let ui_labels: Partial<UiLabels> = {}
  if (fs.existsSync(globalUiLabelsPath)) {
    ui_labels = JSON.parse(fs.readFileSync(globalUiLabelsPath, 'utf8')) as UiLabels
  }

  if (!config || !theme) {
    return null // Essential data missing
  }

  // Allow clinic specific override (deep merge)
  if (config.ui_labels) {
    merge(ui_labels, config.ui_labels)
  }

  // Ensure config has the merged ui_labels
  config.ui_labels = ui_labels as UiLabels

  // Check that required data is present
  if (!home || !services || !about) {
    return null // Essential content missing
  }

  return {
    config,
    theme,
    images: images || undefined,
    home,
    services,
    about,
    testimonials: testimonials || undefined,
    faq: faq || undefined,
    legal: legal || undefined,
  }
}

export async function getAllClinics(): Promise<string[]> {
  if (!fs.existsSync(CONTENT_DIR)) return []
  return fs.readdirSync(CONTENT_DIR).filter((file) => {
    // Exclude template folders (prefixed with _ or .), hidden files, and non-directories
    if (file.startsWith('_') || file.startsWith('.')) return false
    const fullPath = path.join(CONTENT_DIR, file)
    if (!fs.statSync(fullPath).isDirectory()) return false
    // Also verify it has required config files to be a valid clinic
    const configPath = path.join(fullPath, 'config.json')
    const themePath = path.join(fullPath, 'theme.json')
    return fs.existsSync(configPath) && fs.existsSync(themePath)
  })
}

/**
 * Get the full URL for a clinic image
 * @param images - The clinic images manifest
 * @param category - Image category (e.g., 'hero', 'team', 'services')
 * @param key - Image key within the category
 * @returns Full URL path or null if not found
 */
export function getClinicImageUrl(
  images: ClinicImages | undefined,
  category: string,
  key: string
): string | null {
  if (!images?.images?.[category]?.[key]) {
    return null
  }

  const image = images.images[category][key] as ClinicImage
  return `${images.basePath}/${image.src}`
}

/**
 * Get full image data for a clinic image
 * @param images - The clinic images manifest
 * @param category - Image category (e.g., 'hero', 'team', 'services')
 * @param key - Image key within the category
 * @returns Image data with full URL or null if not found
 */
export function getClinicImage(
  images: ClinicImages | undefined,
  category: string,
  key: string
): (ClinicImage & { url: string }) | null {
  if (!images?.images?.[category]?.[key]) {
    return null
  }

  const image = images.images[category][key] as ClinicImage
  return {
    ...image,
    url: `${images.basePath}/${image.src}`,
  }
}

/**
 * Get all images in a category
 * @param images - The clinic images manifest
 * @param category - Image category (e.g., 'hero', 'team', 'services')
 * @returns Array of images with full URLs
 */
export function getClinicImagesByCategory(
  images: ClinicImages | undefined,
  category: string
): Array<ClinicImage & { key: string; url: string }> {
  if (!images?.images?.[category]) {
    return []
  }

  const categoryImages = images.images[category]
  if (!categoryImages) {
    return []
  }

  return Object.entries(categoryImages).map(([key, image]: [string, ClinicImage]) => ({
    key,
    ...image,
    url: `${images.basePath}/${image.src}`,
  }))
}

/**
 * Get placeholder image URL
 * @param images - The clinic images manifest
 * @param type - Placeholder type (e.g., 'pet', 'product', 'team')
 * @returns Placeholder URL or default
 */
export function getPlaceholderUrl(
  images: ClinicImages | undefined,
  type: 'pet' | 'product' | 'team' | 'service'
): string {
  if (images?.placeholders?.[type]) {
    return images.placeholders[type] as string
  }

  // Default placeholders
  const defaults: Record<string, string> = {
    pet: '/images/placeholders/pet-placeholder.jpg',
    product: '/images/placeholders/product-placeholder.jpg',
    team: '/images/placeholders/team-placeholder.jpg',
    service: '/images/placeholders/service-placeholder.jpg',
  }

  return defaults[type] || '/images/placeholders/default.jpg'
}
