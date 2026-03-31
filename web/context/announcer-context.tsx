/**
 * Announcer Context
 *
 * A11Y-003: Screen reader compatibility
 *
 * Provides a global announcement system for screen readers.
 * Use this to announce dynamic changes that happen anywhere in the app.
 *
 * @example
 * ```tsx
 * // In layout
 * <AnnouncerProvider>
 *   <App />
 * </AnnouncerProvider>
 *
 * // In component
 * const { announce, announcePolite, announceAssertive } = useAnnouncer()
 *
 * const handleSave = async () => {
 *   try {
 *     await save()
 *     announcePolite('Datos guardados exitosamente')
 *   } catch (error) {
 *     announceAssertive('Error al guardar los datos')
 *   }
 * }
 * ```
 */

'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

/**
 * Announcement object
 */
interface Announcement {
  id: string
  message: string
  politeness: 'polite' | 'assertive'
  timestamp: number
}

/**
 * Options for creating an announcement
 */
export interface AnnounceOptions {
  /** Clear previous announcements */
  clearPrevious?: boolean
  /** Delay before announcement (ms) */
  delay?: number
}

/**
 * Announcer context type
 */
interface AnnouncerContextType {
  /** Current polite announcements */
  politeAnnouncement: string
  /** Current assertive announcements */
  assertiveAnnouncement: string
  /** Announce with specific politeness */
  announce: (
    message: string,
    politeness?: 'polite' | 'assertive',
    options?: AnnounceOptions
  ) => void
  /** Polite announcement (waits for screen reader) */
  announcePolite: (message: string, options?: AnnounceOptions) => void
  /** Assertive announcement (interrupts) */
  announceAssertive: (message: string, options?: AnnounceOptions) => void
  /** Clear all announcements */
  clearAnnouncements: () => void
}

const AnnouncerContext = createContext<AnnouncerContextType | undefined>(undefined)

/**
 * Generate unique ID for announcements
 */
function generateId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Announcer Provider
 *
 * Wrap your app with this provider to enable global announcements.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [politeAnnouncement, setPoliteAnnouncement] = useState('')
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('')

  /**
   * Make an announcement
   */
  const announce = useCallback(
    (
      message: string,
      politeness: 'polite' | 'assertive' = 'polite',
      options: AnnounceOptions = {}
    ) => {
      const { clearPrevious = true, delay = 100 } = options
      const setter = politeness === 'assertive' ? setAssertiveAnnouncement : setPoliteAnnouncement

      // Clear first to ensure screen readers detect the change
      if (clearPrevious) {
        setter('')
      }

      // Slight delay ensures screen readers pick up the change
      setTimeout(() => {
        setter(message)

        // Auto-clear after announcement
        setTimeout(() => {
          setter('')
        }, 1000)
      }, delay)
    },
    []
  )

  const announcePolite = useCallback(
    (message: string, options?: AnnounceOptions) => {
      announce(message, 'polite', options)
    },
    [announce]
  )

  const announceAssertive = useCallback(
    (message: string, options?: AnnounceOptions) => {
      announce(message, 'assertive', { ...options, delay: options?.delay ?? 50 })
    },
    [announce]
  )

  const clearAnnouncements = useCallback(() => {
    setPoliteAnnouncement('')
    setAssertiveAnnouncement('')
  }, [])

  const contextValue = useMemo(
    () => ({
      politeAnnouncement,
      assertiveAnnouncement,
      announce,
      announcePolite,
      announceAssertive,
      clearAnnouncements,
    }),
    [
      politeAnnouncement,
      assertiveAnnouncement,
      announce,
      announcePolite,
      announceAssertive,
      clearAnnouncements,
    ]
  )

  return (
    <AnnouncerContext.Provider value={contextValue}>
      {children}
      {/* Polite announcer region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeAnnouncement}
      </div>
      {/* Assertive announcer region */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveAnnouncement}
      </div>
    </AnnouncerContext.Provider>
  )
}

/**
 * Hook to access the announcer
 *
 * @example
 * ```tsx
 * const { announcePolite, announceAssertive } = useAnnouncer()
 *
 * // Success message
 * announcePolite('Mascota guardada exitosamente')
 *
 * // Error message (interrupts)
 * announceAssertive('Error: No se pudo guardar')
 * ```
 */
export function useAnnouncer(): AnnouncerContextType {
  const context = useContext(AnnouncerContext)
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider')
  }
  return context
}

export default AnnouncerProvider
