/**
 * Swipeable Card Component
 *
 * Touch-enabled card with left/right swipe actions.
 */

'use client'

import { useState, useRef, type ReactNode, type TouchEvent } from 'react'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import type { SwipeAction } from './types'

interface SwipeableCardProps {
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  threshold?: number
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function SwipeableCard({
  leftActions = [],
  rightActions = [],
  threshold = 80,
  children,
  className,
  disabled = false,
}: SwipeableCardProps): React.ReactElement {
  const [translateX, setTranslateX] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const isDraggingRef = useRef(false)

  const handleTouchStart = (e: TouchEvent): void => {
    if (disabled) return
    startXRef.current = e.touches[0].clientX
    currentXRef.current = translateX
    isDraggingRef.current = true
    setIsTransitioning(false)
  }

  const handleTouchMove = (e: TouchEvent): void => {
    if (!isDraggingRef.current || disabled) return
    const diff = e.touches[0].clientX - startXRef.current
    let newTranslate = currentXRef.current + diff

    // Limit swipe distance based on available actions
    const maxLeft = leftActions.length > 0 ? threshold : 0
    const maxRight = rightActions.length > 0 ? -threshold : 0

    newTranslate = Math.min(maxLeft, Math.max(maxRight, newTranslate))
    setTranslateX(newTranslate)
  }

  const handleTouchEnd = (): void => {
    if (!isDraggingRef.current || disabled) return
    isDraggingRef.current = false
    setIsTransitioning(true)

    // Snap to open or closed position
    if (translateX > threshold / 2 && leftActions.length > 0) {
      setTranslateX(threshold)
    } else if (translateX < -threshold / 2 && rightActions.length > 0) {
      setTranslateX(-threshold)
    } else {
      setTranslateX(0)
    }
  }

  const resetPosition = (): void => {
    setIsTransitioning(true)
    setTranslateX(0)
  }

  const executeAction = (action: SwipeAction): void => {
    action.onClick()
    resetPosition()
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex items-center">
          {leftActions.map((action, index) => {
            const IconComponent = Icons[action.icon] as React.ComponentType<{ className?: string }>
            return (
              <button
                key={index}
                onClick={() => executeAction(action)}
                className={cn(
                  'flex h-full min-w-[80px] flex-col items-center justify-center px-4 transition-opacity',
                  action.bgColor,
                  translateX > 20 ? 'opacity-100' : 'opacity-0'
                )}
                style={{ color: action.color }}
              >
                <IconComponent className="h-5 w-5" />
                <span className="mt-1 text-xs font-bold">{action.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          {rightActions.map((action, index) => {
            const IconComponent = Icons[action.icon] as React.ComponentType<{ className?: string }>
            return (
              <button
                key={index}
                onClick={() => executeAction(action)}
                className={cn(
                  'flex h-full min-w-[80px] flex-col items-center justify-center px-4 transition-opacity',
                  action.bgColor,
                  translateX < -20 ? 'opacity-100' : 'opacity-0'
                )}
                style={{ color: action.color }}
              >
                <IconComponent className="h-5 w-5" />
                <span className="mt-1 text-xs font-bold">{action.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Main Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${translateX}px)` }}
        className={cn('relative bg-white', isTransitioning && 'transition-transform duration-200')}
      >
        {children}
      </div>
    </div>
  )
}
