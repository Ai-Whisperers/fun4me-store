/**
 * Skip Links Component
 *
 * A11Y-002: Keyboard navigation accessibility
 *
 * Provides skip links for keyboard users to bypass repetitive content.
 * Links are visually hidden until focused for screen-reader and keyboard accessibility.
 */

'use client'

import { useTranslations } from 'next-intl'

export interface SkipLinksProps {
  /** ID of the main content area */
  mainContentId?: string
  /** ID of the main navigation */
  mainNavId?: string
  /** Additional skip link targets */
  additionalLinks?: Array<{
    targetId: string
    label: string
  }>
}

export function SkipLinks({
  mainContentId = 'main-content',
  mainNavId = 'main-navigation',
  additionalLinks = [],
}: SkipLinksProps) {
  const t = useTranslations('accessibility')

  // Fallback translations if not available
  const skipToContent = t?.('skipToContent') || 'Saltar al contenido principal'
  const skipToNav = t?.('skipToNavigation') || 'Saltar a la navegación'

  return (
    <div className="skip-links" role="navigation" aria-label="Skip links">
      <a
        href={`#${mainContentId}`}
        className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--primary)] focus:shadow-lg focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:rounded-md"
      >
        {skipToContent}
      </a>
      <a
        href={`#${mainNavId}`}
        className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-64 focus:z-[9999] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--primary)] focus:shadow-lg focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:rounded-md"
      >
        {skipToNav}
      </a>
      {additionalLinks.map((link) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-14 focus:left-4 focus:z-[9999] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--primary)] focus:shadow-lg focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:rounded-md"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export default SkipLinks
