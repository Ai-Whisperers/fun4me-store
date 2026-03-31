/**
 * Mobile-Optimized List Item Component
 *
 * Touch-friendly list item with optional swipe actions.
 */

'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { SwipeableCard } from './SwipeableCard'
import { TOUCH_TARGETS } from './constants'
import type { SwipeAction } from './types'

interface MobileListItemProps {
  leading?: ReactNode
  title: string
  subtitle?: string
  trailing?: ReactNode
  onClick?: () => void
  href?: string
  swipeActions?: {
    left?: SwipeAction[]
    right?: SwipeAction[]
  }
  className?: string
}

export function MobileListItem({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  href,
  swipeActions,
  className,
}: MobileListItemProps): React.ReactElement {
  const content = (
    <div
      className={cn(
        'flex items-center gap-4 p-4',
        TOUCH_TARGETS.MIN,
        onClick && 'cursor-pointer active:bg-gray-50',
        className
      )}
      onClick={onClick}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-[var(--text-primary)]">{title}</p>
        {subtitle && <p className="truncate text-sm text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
      {(onClick || href) && !trailing && (
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
      )}
    </div>
  )

  const wrappedContent = swipeActions ? (
    <SwipeableCard leftActions={swipeActions.left} rightActions={swipeActions.right}>
      {content}
    </SwipeableCard>
  ) : (
    content
  )

  if (href) {
    const Link = require('next/link').default
    return (
      <Link href={href} className="block">
        {wrappedContent}
      </Link>
    )
  }

  return wrappedContent
}
