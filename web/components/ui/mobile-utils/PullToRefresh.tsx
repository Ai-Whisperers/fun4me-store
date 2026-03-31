/**
 * Pull to Refresh Component
 *
 * Touch-enabled pull-down refresh gesture handler.
 */

'use client'

import { useState, useRef, type ReactNode, type TouchEvent } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  threshold?: number
  children: ReactNode
  className?: string
}

export function PullToRefresh({
  onRefresh,
  threshold = 80,
  children,
  className,
}: PullToRefreshProps): React.ReactElement {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canPull, setCanPull] = useState(true)
  const startYRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: TouchEvent): void => {
    if (isRefreshing) return
    // Only allow pull when scrolled to top
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
      setCanPull(true)
    } else {
      setCanPull(false)
    }
  }

  const handleTouchMove = (e: TouchEvent): void => {
    if (!canPull || isRefreshing) return
    const diff = e.touches[0].clientY - startYRef.current
    if (diff > 0) {
      // Apply resistance
      const resistance = 0.5
      setPullDistance(Math.min(diff * resistance, threshold * 1.5))
    }
  }

  const handleTouchEnd = async (): Promise<void> => {
    if (!canPull || isRefreshing) return
    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold / 2)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn('overflow-auto', className)}
    >
      {/* Pull Indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        <div
          className={cn(
            'bg-[var(--primary)]/10 flex h-10 w-10 items-center justify-center rounded-full',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: `rotate(${progress * 180}deg)`,
            opacity: progress,
          }}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 text-[var(--primary)]" />
          ) : (
            <ArrowDown className="h-5 w-5 text-[var(--primary)]" />
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
