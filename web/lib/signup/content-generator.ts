/**
 * Content Generator for Clinic Signup
 *
 * Generates JSON content files from signup form data.
 * Creates all necessary files in .content_data/[slug]/
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { ConfigGeneratorInput, ThemeGeneratorInput, ColorScale } from './types'
import {
  generateColorScaleFromMain,
  generateInteractiveColors,
  generateInputColors,
  generateGradients,
  generateShadows,
} from './color-utils'

// ============================================================================
// Paths
// ============================================================================

const CONTENT_DATA_PATH = path.join(process.cwd(), '.content_data')
const TEMPLATE_PATH = path.join(CONTENT_DATA_PATH, '_TEMPLATE')

// ============================================================================
// Template Loading
// ============================================================================

/**
 * Read a template JSON file
 */
async function readTemplate<T>(filename: string): Promise<T> {
  const filePath = path.join(TEMPLATE_PATH, filename)
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Write JSON to the new clinic folder
 */
async function writeClinicFile(slug: string, filename: string, data: unknown): Promise<void> {
  const clinicPath = path.join(CONTENT_DATA_PATH, slug)
  const filePath = path.join(clinicPath, filename)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ============================================================================
// Config Generator
// ============================================================================

interface ConfigJson {
  id: string
  name: string
  contact: {
    whatsapp_number: string
    phone_display: string
    email: string
    address: string
    google_maps_id: string
  }
  settings: {
    currency: string
    emergency_24h: boolean
    modules: {
      toxic_checker: boolean
      age_calculator: boolean
    }
    inventory_template_google_sheet_url: string | null
  }
  branding: {
    logo_url: string
    logo_width: number
    logo_height: number
    favicon_url: string
    hero_image_url: string
    og_image_url: string
  }
  ui_labels: unknown
}

/**
 * Generate config.json from signup data
 */
export function generateConfig(input: ConfigGeneratorInput): ConfigJson {
  return {
    id: input.slug,
    name: input.clinicName,
    contact: {
      whatsapp_number: input.whatsapp,
      phone_display: input.phone,
      email: input.email,
      address: `${input.address}, ${input.city}`,
      google_maps_id: '', // Can be configured later
    },
    settings: {
      currency: 'PYG',
      emergency_24h: false, // Default off, can enable later
      modules: {
        toxic_checker: true,
        age_calculator: true,
      },
      inventory_template_google_sheet_url: null,
    },
    branding: {
      logo_url: input.logoUrl || '',
      logo_width: 150,
      logo_height: 40,
      favicon_url: '/favicon.ico',
      hero_image_url: '',
      og_image_url: '',
    },
    ui_labels: {
      nav: {
        home: 'Inicio',
        services: 'Servicios',
        about: 'Nosotros',
        book_btn: 'Agendar',
      },
      footer: {
        rights: 'Todos los derechos reservados.',
      },
      home: {
        visit_us: 'Visitanos',
      },
      services: {
        online_badge: 'Reservable Online',
        description_label: 'Descripcion:',
        includes_label: 'Incluye:',
        table_variant: 'Variante / Tipo',
        table_price: 'Precio',
        book_floating_btn: 'Agendar Turno',
      },
      about: {
        team_title: 'Nuestro Equipo',
      },
    },
  }
}

// ============================================================================
// Theme Generator
// ============================================================================

interface ThemeJson {
  colors: {
    primary: ColorScale
    secondary: ColorScale
    accent: string
    background: Record<string, string>
    text: Record<string, string>
    border: Record<string, string>
    status: Record<string, unknown>
    neutral: Record<string, string>
    interactive: Record<string, string>
    input: Record<string, string>
    chart: Record<string, string>
    accents: Record<string, string>
  }
  gradients: Record<string, string>
  fonts: Record<string, string>
  typography: Record<string, unknown>
  ui: Record<string, string>
  spacing: Record<string, string>
  animations: Record<string, string>
}

/**
 * Generate theme.json from color inputs
 */
export async function generateTheme(input: ThemeGeneratorInput): Promise<ThemeJson> {
  // Read template for structure we don't need to customize
  const template = await readTemplate<ThemeJson>('theme.json')

  // Generate color scales from primary and secondary
  const primaryScale = generateColorScaleFromMain(input.primaryColor)
  const secondaryScale = generateColorScaleFromMain(input.secondaryColor)

  // Generate interactive and input colors based on primary
  const interactiveColors = generateInteractiveColors(input.primaryColor)
  const inputColors = generateInputColors(input.primaryColor)
  const gradients = generateGradients(primaryScale)
  const shadows = generateShadows(input.primaryColor)

  // Update background colors that reference primary
  const background = {
    ...template.colors.background,
    hero: primaryScale.main,
  }

  // Update text colors that reference primary
  const text = {
    ...template.colors.text,
    link: primaryScale.main,
    linkHover: primaryScale.dark,
  }

  // Update border colors
  const border = {
    ...template.colors.border,
    focus: primaryScale.main,
  }

  // Update status info to use primary
  const status = {
    ...template.colors.status,
    info: {
      main: primaryScale.main,
      light: primaryScale.light,
      dark: primaryScale.dark,
      bg: primaryScale['50'],
      border: primaryScale['200'],
    },
  }

  // Update chart colors with new primary/secondary
  const chart = {
    ...template.colors.chart,
    '1': primaryScale.main,
    '2': secondaryScale.main,
  }

  // Update accents with secondary
  const accents = {
    ...template.colors.accents,
    emerald: secondaryScale.main,
  }

  return {
    colors: {
      primary: primaryScale,
      secondary: secondaryScale,
      accent: template.colors.accent,
      background,
      text,
      border,
      status,
      neutral: template.colors.neutral,
      interactive: interactiveColors,
      input: inputColors,
      chart,
      accents,
    },
    gradients,
    fonts: template.fonts,
    typography: template.typography,
    ui: {
      ...template.ui,
      ...shadows,
    },
    spacing: template.spacing,
    animations: template.animations,
  }
}

// ============================================================================
// Home Generator
// ============================================================================

interface HomeJson {
  hero: {
    headline: string
    subhead: string
    cta_primary: string
    cta_secondary: string
  }
  features: Array<{
    icon: string
    title: string
    text: string
  }>
  promo_banner: {
    enabled: boolean
    text: string
    link: string
  }
  interactive_tools_section: {
    title: string
    subtitle: string
    toxic_food_cta: string
    age_calc_cta: string
  }
  testimonials_section: {
    enabled: boolean
    title: string
    subtitle: string
  }
  seo: {
    meta_title: string
    meta_description: string
  }
}

/**
 * Generate home.json customized with clinic name
 */
export function generateHome(clinicName: string, city: string): HomeJson {
  return {
    hero: {
      headline: `Bienvenido a ${clinicName}`,
      subhead: `Tu clinica veterinaria de confianza en ${city}. Cuidamos a tu mascota como parte de nuestra familia.`,
      cta_primary: 'Agendar Cita',
      cta_secondary: 'Conocenos',
    },
    features: [
      {
        icon: 'heart-pulse',
        title: 'Atencion Profesional',
        text: 'Veterinarios certificados con anos de experiencia.',
      },
      {
        icon: 'shield-check',
        title: 'Equipo Moderno',
        text: 'Tecnologia de vanguardia para el mejor diagnostico.',
      },
      {
        icon: 'clock',
        title: 'Horarios Flexibles',
        text: 'Nos adaptamos a tu agenda para mayor comodidad.',
      },
    ],
    promo_banner: {
      enabled: false,
      text: '',
      link: '#',
    },
    interactive_tools_section: {
      title: 'Herramientas Interactivas',
      subtitle: 'Recursos utiles para el cuidado de tu mascota',
      toxic_food_cta: 'Verificar Alimentos',
      age_calc_cta: 'Calcular Edad',
    },
    testimonials_section: {
      enabled: true,
      title: 'Lo Que Dicen Nuestros Clientes',
      subtitle: 'Experiencias reales de quienes confian en nosotros.',
    },
    seo: {
      meta_title: `${clinicName} | Clinica Veterinaria en ${city}`,
      meta_description: `${clinicName} - Servicios veterinarios profesionales en ${city}. Consultas, vacunacion, cirugia, emergencias y mas. Agenda tu cita hoy.`,
    },
  }
}

// ============================================================================
// About Generator
// ============================================================================

interface AboutJson {
  intro: {
    title: string
    text: string
  }
  team: Array<{
    name: string
    role: string
    bio: string
  }>
}

/**
 * Generate about.json customized with clinic name
 */
export function generateAbout(clinicName: string): AboutJson {
  return {
    intro: {
      title: `Sobre ${clinicName}`,
      text: `En ${clinicName} nos dedicamos al cuidado integral de tus mascotas. Nuestro compromiso es brindar atencion veterinaria de calidad con un equipo profesional y dedicado.`,
    },
    team: [], // Empty team, to be filled by clinic admin
  }
}

// ============================================================================
// Legal Generator
// ============================================================================

interface LegalJson {
  privacy_policy: {
    title: string
    content: string
    effective_date: string
  }
  terms_of_service: {
    title: string
    content: string
    effective_date: string
  }
}

/**
 * Generate legal.json with placeholder content
 */
export function generateLegal(clinicName: string): LegalJson {
  const today = new Date().toISOString().split('T')[0]

  return {
    privacy_policy: {
      title: 'Politica de Privacidad',
      content: `${clinicName} se compromete a proteger la privacidad de sus usuarios. Esta politica describe como recopilamos, usamos y protegemos su informacion personal.\n\nRecopilamos informacion que usted nos proporciona directamente, como datos de contacto y informacion de sus mascotas. Esta informacion se utiliza unicamente para brindar nuestros servicios veterinarios.\n\nNo compartimos su informacion personal con terceros, excepto cuando sea necesario para proporcionar nuestros servicios o cuando la ley lo requiera.`,
      effective_date: today,
    },
    terms_of_service: {
      title: 'Terminos de Servicio',
      content: `Al utilizar los servicios de ${clinicName}, usted acepta estos terminos y condiciones.\n\nNuestros servicios veterinarios se proporcionan de acuerdo con las mejores practicas profesionales. Las citas pueden ser reprogramadas con al menos 24 horas de anticipacion.\n\nNos reservamos el derecho de modificar estos terminos en cualquier momento. Los cambios seran efectivos inmediatamente despues de su publicacion.`,
      effective_date: today,
    },
  }
}

// ============================================================================
// Main Generator
// ============================================================================

export interface GenerateContentInput {
  slug: string
  clinicName: string
  email: string
  phone: string
  whatsapp: string
  address: string
  city: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
}

/**
 * Generate all content files for a new clinic
 */
export async function generateAllContent(input: GenerateContentInput): Promise<void> {
  const clinicPath = path.join(CONTENT_DATA_PATH, input.slug)

  // Create clinic directory
  await fs.mkdir(clinicPath, { recursive: true })

  // Generate config.json
  const config = generateConfig({
    slug: input.slug,
    clinicName: input.clinicName,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    address: input.address,
    city: input.city,
    logoUrl: input.logoUrl,
  })
  await writeClinicFile(input.slug, 'config.json', config)

  // Generate theme.json
  const theme = await generateTheme({
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
  })
  await writeClinicFile(input.slug, 'theme.json', theme)

  // Generate home.json
  const home = generateHome(input.clinicName, input.city)
  await writeClinicFile(input.slug, 'home.json', home)

  // Generate about.json
  const about = generateAbout(input.clinicName)
  await writeClinicFile(input.slug, 'about.json', about)

  // Generate legal.json
  const legal = generateLegal(input.clinicName)
  await writeClinicFile(input.slug, 'legal.json', legal)

  // Copy template files that don't need customization
  const templateOnlyFiles = ['services.json', 'faq.json', 'testimonials.json', 'images.json', 'showcase.json']

  for (const file of templateOnlyFiles) {
    try {
      const template = await readTemplate(file)
      await writeClinicFile(input.slug, file, template)
    } catch (_error: unknown) {
      // If template doesn't exist, create empty array/object
      const emptyContent = file.includes('services') ? { categories: [] } : []
      await writeClinicFile(input.slug, file, emptyContent)
    }
  }
}

/**
 * Delete all content files for a clinic (cleanup on error)
 */
export async function deleteClinicContent(slug: string): Promise<void> {
  const clinicPath = path.join(CONTENT_DATA_PATH, slug)

  try {
    await fs.rm(clinicPath, { recursive: true, force: true })
  } catch (_error: unknown) {
    // Ignore errors during cleanup
  }
}

/**
 * Check if a clinic content folder exists
 */
export async function clinicContentExists(slug: string): Promise<boolean> {
  const clinicPath = path.join(CONTENT_DATA_PATH, slug)

  try {
    await fs.access(clinicPath)
    return true
  } catch (_error: unknown) {
    return false
  }
}
