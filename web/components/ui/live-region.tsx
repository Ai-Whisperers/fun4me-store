/**
 * Live Region Component
 *
 * A11Y-003: Screen reader compatibility
 *
 * Renders an ARIA live region for dynamic content announcements.
 * Screen readers will announce changes to the content within this region.
 *
 * @example
 * ```tsx
 * // Polite announcement (waits for screen reader to finish current content)
 * <LiveRegion message="Cita guardada exitosamente" />
 *
 * // Assertive announcement (interrupts current content)
 * <LiveRegion message="Error: No se pudo guardar" politeness="assertive" />
 *
 * // With custom content
 * <LiveRegion politeness="polite">
 *   <p>Se encontraron {count} resultados</p>
 * </LiveRegion>
 * ```
 */

'use client'

import { useEffect, useState, type ReactNode } from 'react'

export interface LiveRegionProps {
  /** Message to announce (use this OR children, not both) */
  message?: string
  /** Child content to announce */
  children?: ReactNode
  /**
   * ARIA live politeness level:
   * - 'polite': Waits for screen reader to finish (default)
   * - 'assertive': Interrupts immediately (use for errors)
   * - 'off': No announcements
   */
  politeness?: 'off' | 'polite' | 'assertive'
  /**
   * Whether the region should announce the entire content
   * when any part changes (default: true)
   */
  atomic?: boolean
  /**
   * What types of changes should be announced:
   * - 'additions': Only new nodes
   * - 'removals': Only removed nodes
   * - 'text': Only text changes
   * - 'all': All changes (default)
   */
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text'
  /**
   * Role for the region:
   * - 'status': General status (default for polite)
   * - 'alert': Important, time-sensitive (default for assertive)
   * - 'log': Sequential information
   * - 'timer': Time information
   */
  role?: 'status' | 'alert' | 'log' | 'timer'
  /**
   * Delay before announcing (ms) - helps with React state updates
   */
  announceDelay?: number
  /**
   * Whether to visually hide the region (default: true)
   */
  visuallyHidden?: boolean
  /** Optional className for custom styling */
  className?: string
}

/**
 * Live Region Component for screen reader announcements
 */
export function LiveRegion({
  message,
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'all',
  role,
  announceDelay = 100,
  visuallyHidden = true,
  className,
}: LiveRegionProps): React.ReactElement {
  const [content, setContent] = useState<string | ReactNode>('')

  // Determine role based on politeness if not specified
  const effectiveRole = role || (politeness === 'assertive' ? 'alert' : 'status')

  // Handle delayed announcement for message prop
  useEffect(() => {
    const value = message ?? children

    if (value && announceDelay > 0) {
      // Clear first, then set - ensures screen readers detect the change
      setContent('')
      const timer = setTimeout(() => setContent(value), announceDelay)
      return () => clearTimeout(timer)
    }

    setContent(value || '')
  }, [message, children, announceDelay])

  const srOnlyStyles = visuallyHidden
    ? 'sr-only'
    : ''

  return (
    <div
      role={effectiveRole}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={`${srOnlyStyles} ${className || ''}`}
    >
      {content}
    </div>
  )
}

/**
 * Alert Live Region - Assertive announcements for errors and warnings
 *
 * @example
 * ```tsx
 * <AlertLiveRegion message={error} />
 * ```
 */
export function AlertLiveRegion({
  message,
  children,
  ...props
}: Omit<LiveRegionProps, 'politeness' | 'role'>): React.ReactElement {
  return (
    <LiveRegion
      message={message}
      politeness="assertive"
      role="alert"
      announceDelay={50}
      {...props}
    >
      {children}
    </LiveRegion>
  )
}

/**
 * Status Live Region - Polite announcements for status updates
 *
 * @example
 * ```tsx
 * <StatusLiveRegion message="Guardado exitosamente" />
 * ```
 */
export function StatusLiveRegion({
  message,
  children,
  ...props
}: Omit<LiveRegionProps, 'politeness' | 'role'>): React.ReactElement {
  return (
    <LiveRegion
      message={message}
      politeness="polite"
      role="status"
      {...props}
    >
      {children}
    </LiveRegion>
  )
}

/**
 * Loading Live Region - Announces loading states
 *
 * @example
 * ```tsx
 * <LoadingLiveRegion isLoading={isLoading} />
 * <LoadingLiveRegion
 *   isLoading={isLoading}
 *   loadingMessage="Cargando datos de mascota..."
 *   completeMessage="Datos cargados"
 * />
 * ```
 */
export interface LoadingLiveRegionProps {
  /** Whether loading is in progress */
  isLoading: boolean
  /** Message to announce when loading starts */
  loadingMessage?: string
  /** Message to announce when loading completes */
  completeMessage?: string
  /** Additional props */
  className?: string
}

export function LoadingLiveRegion({
  isLoading,
  loadingMessage = 'Cargando...',
  completeMessage,
  className,
}: LoadingLiveRegionProps): React.ReactElement {
  const [announced, setAnnounced] = useState<string>('')

  useEffect(() => {
    if (isLoading) {
      setAnnounced(loadingMessage)
    } else if (completeMessage) {
      setAnnounced(completeMessage)
    } else {
      setAnnounced('')
    }
  }, [isLoading, loadingMessage, completeMessage])

  return (
    <StatusLiveRegion
      message={announced}
      className={className}
    />
  )
}

export default LiveRegion
