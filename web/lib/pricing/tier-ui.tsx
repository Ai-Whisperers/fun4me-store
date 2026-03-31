/**
 * Tier UI Elements
 *
 * React-specific UI elements for pricing tiers.
 * These are separated from the main config because they contain JSX (not serializable).
 *
 * Single source of truth for all tier-related UI elements across landing pages.
 *
 * Simple 2-tier model:
 * - Gratis: Website + WhatsApp booking only
 * - Profesional: Everything included
 */

import { Gift, Stethoscope } from 'lucide-react'
import type { TierId } from './tiers'
import { brandConfig } from '@/lib/branding/config'

// ============================================================================
// Tier Icons
// ============================================================================

/**
 * Standard size icons (h-5 w-5) for cards and selectors
 */
export const tierIcons: Record<TierId, React.ReactNode> = {
  gratis: <Gift className="h-5 w-5" />,
  profesional: <Stethoscope className="h-5 w-5" />,
}

/**
 * Large icons (h-8 w-8) for hero sections and quiz results
 */
export const tierIconsLarge: Record<TierId, React.ReactNode> = {
  gratis: <Gift className="h-8 w-8" />,
  profesional: <Stethoscope className="h-8 w-8" />,
}

/**
 * Get tier icon by size
 */
export function getTierIcon(tierId: TierId, size: 'sm' | 'lg' = 'sm'): React.ReactNode {
  return size === 'lg' ? tierIconsLarge[tierId] : tierIcons[tierId]
}

// ============================================================================
// Feature Descriptions (Marketing Copy)
// ============================================================================

/**
 * Feature descriptions for pricing cards
 * Used in PricingSection and other pricing displays
 */
export const tierFeatureDescriptions: Record<TierId, string[]> = {
  gratis: [
    'Sitio web profesional',
    'Reservas por WhatsApp',
    'Muestra anuncios',
  ],
  profesional: [
    'Todo incluido',
    'Agenda online 24/7',
    'Historial clínico digital',
    'Portal para dueños',
    'Control de vacunas',
    'Tienda online (3% comisión)',
    'WhatsApp Business API',
    'Hospitalización y laboratorio',
    'Usuarios ilimitados',
    'Soporte prioritario 24/7',
  ],
}

/**
 * Detailed features with included/not included lists
 * Used in ROI calculator detailed view
 */
export const tierDetailedFeatures: Record<TierId, { included: string[]; notIncluded: string[] }> = {
  gratis: {
    included: [
      'Sitio web profesional',
      'Reservas por WhatsApp',
    ],
    notIncluded: [
      'Muestra anuncios',
      'Sin portal de mascotas',
      'Sin historial clinico',
      'Sin tienda online',
      'Sin soporte prioritario',
    ],
  },
  profesional: {
    included: [
      'Sitio web profesional',
      'Agenda online 24/7',
      'Historial clinico digital',
      'Portal para duenos',
      'Control de vacunas',
      'Herramientas clinicas',
      'Sin anuncios',
      'Tienda online (3% comision)',
      'Placas QR de identificacion',
      'Pedidos mayoristas',
      'WhatsApp Business API',
      'Recordatorios automaticos',
      'Modulo de hospitalizacion',
      'Laboratorio clinico',
      'Reportes avanzados',
      'Multiples sucursales',
      'Acceso API completo',
      'Analisis con IA',
      'Garantia SLA 99.9%',
      'Soporte prioritario 24/7',
      'Usuarios ilimitados',
    ],
    notIncluded: [],
  },
}

// ============================================================================
// Quiz Reasons (Persuasive Copy)
// ============================================================================

/**
 * Reasons shown in quiz results explaining why the plan was recommended
 */
export const tierQuizReasons: Record<TierId, string[]> = {
  gratis: [
    'Sitio web profesional para tu clinica',
    'Reservas por WhatsApp integradas',
    'Muestra anuncios - asi se financia',
    'Podes subir a Profesional cuando quieras',
  ],
  profesional: [
    'Todas las funciones incluidas',
    'Portal de mascotas para tus clientes',
    'Tienda online (3% comision)',
    'WhatsApp Business API integrado',
    'Hospitalizacion y laboratorio',
    'Usuarios ilimitados',
    'Soporte prioritario 24/7',
  ],
}

// ============================================================================
// CTA Messages (WhatsApp)
// ============================================================================

/**
 * Call-to-action button labels and WhatsApp pre-filled messages
 */
export const tierCtaMessages: Record<TierId, { cta: string; message: string }> = {
  gratis: {
    cta: 'Empezar Gratis',
    message: `Hola! Quiero crear mi cuenta gratuita en ${brandConfig.name}`,
  },
  profesional: {
    cta: 'Elegir Profesional',
    message: `Hola! Me interesa el plan Profesional de ${brandConfig.name}`,
  },
}

/**
 * Extended CTA messages for quiz results
 */
export const tierQuizCtaMessages: Record<TierId, string> = {
  gratis: `Hola! Hice el quiz de ${brandConfig.name} y quiero empezar con el Plan Gratis. Me pueden ayudar?`,
  profesional: `Hola! Hice el quiz de ${brandConfig.name} y me recomendaron el Plan Profesional. Me gustaria saber mas!`,
}

// ============================================================================
// Taglines
// ============================================================================

/**
 * Short taglines for each tier
 */
export const tierTaglines: Record<TierId, string> = {
  gratis: 'Empieza sin pagar nada',
  profesional: 'Todo incluido para clinicas profesionales',
}

// ============================================================================
// Teaser Highlights
// ============================================================================

/**
 * Single-line highlights for compact pricing cards
 */
export const tierHighlights: Record<TierId, string> = {
  gratis: 'Sin costo',
  profesional: 'Todo incluido',
}

/**
 * Short feature lists for teaser cards (3 items max)
 */
export const tierTeaserFeatures: Record<TierId, string[]> = {
  gratis: ['Sitio web propio', 'Reservas WhatsApp', 'Con anuncios'],
  profesional: ['Todo incluido', 'Sin anuncios', 'Usuarios ilimitados'],
}

// ============================================================================
// Upgrade Prompts
// ============================================================================

/**
 * What the next tier offers (for upgrade prompts)
 * With only 2 tiers, only gratis can upgrade to profesional
 */
export const tierUpgradePrompts: Record<'gratis', string[]> = {
  gratis: [
    'Sin anuncios en tu sitio',
    'Portal completo para duenos',
    'Historial clinico digital',
    'Tienda online (3% comision)',
    'WhatsApp Business API',
    'Hospitalizacion y laboratorio',
    'Soporte prioritario 24/7',
  ],
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the next tier for upgrade prompts
 * With only 2 tiers: gratis → profesional, profesional → null
 */
export function getNextTierId(currentTierId: TierId): TierId | null {
  if (currentTierId === 'gratis') {
    return 'profesional'
  }
  return null // profesional is the highest tier
}

/**
 * Get upgrade cost difference (monthly)
 */
export function getUpgradeCostDifference(
  currentTierId: TierId,
  currentPrice: number,
  nextPrice: number
): number {
  if (currentTierId === 'profesional') return 0
  return nextPrice - currentPrice
}
