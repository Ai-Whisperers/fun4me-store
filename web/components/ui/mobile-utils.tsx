/**
 * Mobile Utils
 *
 * Re-export from modular implementation for backward compatibility.
 *
 * @deprecated Import from './mobile-utils' directory instead:
 * ```typescript
 * import { SwipeableCard, TouchButton, useHaptic } from './mobile-utils'
 * ```
 */

'use client'

export {
  TOUCH_TARGETS,
  SwipeableCard,
  PullToRefresh,
  TouchButton,
  FloatingActionButton,
  MobileListItem,
  useHaptic,
} from './mobile-utils/index'

export type { SwipeAction, HapticStyle } from './mobile-utils/index'
