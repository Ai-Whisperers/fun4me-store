'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect if the user is on a mobile device
 *
 * Breakpoints:
 * - Mobile: < 640px
 * - Tablet: 640px - 1024px
 * - Desktop: > 1024px
 */

interface UseIsMobileOptions {
  breakpoint?: number
}

export function useIsMobile(options: UseIsMobileOptions = {}): boolean {
  const { breakpoint = 640 } = options

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Set initial value
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Check on mount
    checkMobile()

    // Add resize listener
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [breakpoint])

  return isMobile
}

/**
 * Hook to detect if the user is on a tablet device
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= 640 && width < 1024)
    }

    checkTablet()
    window.addEventListener('resize', checkTablet)

    return () => {
      window.removeEventListener('resize', checkTablet)
    }
  }, [])

  return isTablet
}

/**
 * Hook to get the current screen size category
 */
export type ScreenSize = 'mobile' | 'tablet' | 'desktop'

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop')

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setScreenSize('mobile')
      } else if (width < 1024) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  return screenSize
}
