/**
 * Mobile Touch Target Constants
 *
 * Minimum touch target sizes according to WCAG and platform guidelines:
 * - Apple HIG: 44x44 points minimum
 * - Material Design: 48x48 dp minimum
 * - WCAG 2.1: 44x44 CSS pixels minimum
 */

export const TOUCH_TARGETS = {
  /** Minimum recommended size (44px) */
  MIN: 'min-h-[44px] min-w-[44px]',
  /** Standard button size (48px) */
  BUTTON: 'min-h-[48px] min-w-[48px]',
  /** Large touch targets for primary actions (52px) */
  PRIMARY: 'min-h-[52px]',
  /** Touch-friendly padding for inline elements */
  PADDING: 'px-4 py-3',
  /** Touch-friendly spacing between interactive elements */
  GAP: 'gap-3',
} as const
