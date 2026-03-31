/**
 * Mobile Utils Module
 *
 * Touch-optimized UI components for mobile devices.
 *
 * @example
 * ```tsx
 * import {
 *   SwipeableCard,
 *   PullToRefresh,
 *   TouchButton,
 *   FloatingActionButton,
 *   MobileListItem,
 *   useHaptic,
 *   TOUCH_TARGETS,
 * } from './mobile-utils'
 * ```
 */

// Constants
export { TOUCH_TARGETS } from './constants'

// Types
export type { SwipeAction, HapticStyle } from './types'

// Components
export { SwipeableCard } from './SwipeableCard'
export { PullToRefresh } from './PullToRefresh'
export { TouchButton } from './TouchButton'
export { FloatingActionButton } from './FloatingActionButton'
export { MobileListItem } from './MobileListItem'

// Hooks
export { useHaptic } from './use-haptic'
