/**
 * Mobile Utils Types
 *
 * Type definitions for mobile utility components.
 */

import * as Icons from 'lucide-react'

export interface SwipeAction {
  icon: keyof typeof Icons
  label: string
  color: string
  bgColor: string
  onClick: () => void
}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'
