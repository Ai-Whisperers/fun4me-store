/**
 * Landing Page Screenshot Configuration
 *
 * Defines all public marketing/landing pages for screenshot capture.
 * These pages are at root level (no tenant prefix) and don't require auth.
 */

export interface LandingPageConfig {
  /** Route path (from root) */
  path: string
  /** Human-readable name for the screenshot */
  name: string
  /** Wait for specific selector before screenshot */
  waitFor?: string
  /** Scroll positions to capture (for long pages) */
  scrollPositions?: ('top' | 'middle' | 'bottom')[]
  /** Description */
  description: string
}

// ============================================================================
// LANDING PAGES - Public marketing site
// ============================================================================

export const LANDING_PAGES: LandingPageConfig[] = [
  {
    path: '/',
    name: 'homepage',
    waitFor: 'main',
    scrollPositions: ['top', 'middle', 'bottom'],
    description: 'Main landing page with Hero, TrustBadges, PricingTeaser, CTA',
  },
  {
    path: '/funcionalidades',
    name: 'funcionalidades',
    waitFor: 'main',
    scrollPositions: ['top', 'middle', 'bottom'],
    description: 'Features showcase page with categorized feature cards',
  },
  {
    path: '/precios',
    name: 'precios',
    waitFor: 'main',
    scrollPositions: ['top', 'middle', 'bottom'],
    description: 'Pricing page with plan comparison, ROI calculator, payment methods',
  },
  {
    path: '/demo',
    name: 'demo',
    waitFor: 'main',
    scrollPositions: ['top', 'bottom'],
    description: 'Demo booking page with video placeholder and scheduling',
  },
  {
    path: '/faq',
    name: 'faq',
    waitFor: 'main',
    scrollPositions: ['top'],
    description: 'FAQ page with categorized questions',
  },
  {
    path: '/nosotros',
    name: 'nosotros',
    waitFor: 'main',
    scrollPositions: ['top', 'middle', 'bottom'],
    description: 'About us page with mission, story, values, and stats',
  },
  {
    path: '/red',
    name: 'red',
    waitFor: 'main',
    scrollPositions: ['top'],
    description: 'Clinic network page',
  },
]

// ============================================================================
// Viewport Configurations
// ============================================================================

export type ViewportName = 'desktop' | 'tablet' | 'mobile'

export const VIEWPORTS: Record<ViewportName, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
}

// ============================================================================
// Screenshot Settings
// ============================================================================

export const LANDING_SCREENSHOT_CONFIG = {
  /** Output directory for screenshots */
  outputDir: './screenshots/landing',
  /** Base URL */
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  /** Default viewports to capture */
  defaultViewports: ['desktop', 'tablet', 'mobile'] as ViewportName[],
  /** Full page screenshots */
  fullPage: true,
  /** Screenshot format */
  format: 'png' as const,
  /** Delay after page load (ms) */
  loadDelay: 1500,
  /** Max timeout per page (ms) */
  timeout: 30000,
}
