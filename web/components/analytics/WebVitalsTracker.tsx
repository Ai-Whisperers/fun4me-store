'use client'

import { useEffect } from 'react'
import { initWebVitals } from '@/lib/utils/web-vitals'

/**
 * Client-side component that initializes Web Vitals tracking
 * This component should be included in the root layout
 */
export function WebVitalsTracker() {
  useEffect(() => {
    // Initialize Web Vitals collection when component mounts
    initWebVitals()
  }, [])

  // This component renders nothing - it's purely for side effects
  return null
}