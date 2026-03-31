'use client'

/**
 * Calendar Global Styles
 *
 * Provides CSS module class names for calendar theming.
 * Migrated from styled-jsx to CSS modules for better maintainability.
 */

import styles from './calendar.module.css'

// =============================================================================
// Exported Class Names for Calendar Components
// =============================================================================

/**
 * Calendar wrapper class names for use in calendar components.
 * Use calendarWrapperClasses for the main wrapper div.
 * Use resourceModeClass when resource view is active.
 */
export const calendarStyles = {
  // Main wrapper
  calendarWrapper: styles.calendarWrapper,
  resourceMode: styles.resourceMode,

  // Month day summary components
  monthDaySummary: styles.monthDaySummary,
  daySection: styles.daySection,
  appointmentsSection: styles.appointmentsSection,
  sectionHeader: styles.sectionHeader,
  sectionIcon: styles.sectionIcon,
  sectionCount: styles.sectionCount,
  sectionLabel: styles.sectionLabel,
  timeRange: styles.timeRange,
  petNames: styles.petNames,
  morePets: styles.morePets,
  timeoffSection: styles.timeoffSection,
  shiftsSection: styles.shiftsSection,
  capacityBar: styles.capacityBar,
  capacityFill: styles.capacityFill,

  // Resource view
  resourceToggleBtn: styles.resourceToggleBtn,
} as const

/**
 * Get the wrapper class name(s) based on resource mode
 */
export function getCalendarWrapperClass(isResourceMode: boolean): string {
  return isResourceMode
    ? `${styles.calendarWrapper} ${styles.resourceMode}`
    : styles.calendarWrapper
}

// =============================================================================
// Legacy Component (for backward compatibility)
// =============================================================================

/**
 * CalendarStyles component
 *
 * @deprecated This component is no longer needed since styles are now in CSS modules.
 * Import { calendarStyles } or individual class names instead.
 *
 * Kept for backward compatibility - renders nothing but ensures CSS module is loaded.
 */
export function CalendarStyles() {
  // CSS module is automatically loaded via import
  // This component is kept for backward compatibility but renders nothing
  return null
}

// =============================================================================
// Type Definitions
// =============================================================================

export type CalendarStyleKeys = keyof typeof calendarStyles
