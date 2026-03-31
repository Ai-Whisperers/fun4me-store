/**
 * Haptic Feedback Hook
 *
 * Provides haptic feedback for supported devices using Vibration API.
 */

'use client'

import { useCallback } from 'react'
import type { HapticStyle } from './types'

export function useHaptic(): (style?: HapticStyle) => void {
  const trigger = useCallback((style: HapticStyle = 'light'): void => {
    // Check for Vibration API support
    if ('vibrate' in navigator) {
      const patterns: Record<HapticStyle, number | number[]> = {
        light: 10,
        medium: 25,
        heavy: 50,
        selection: 5,
        success: [10, 50, 10],
        warning: [30, 30, 30],
        error: [50, 100, 50],
      }
      navigator.vibrate(patterns[style])
    }
  }, [])

  return trigger
}
