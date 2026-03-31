/**
 * Floating Action Button Component
 *
 * Mobile-optimized FAB with position and color variants.
 */

'use client'

import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'

interface FloatingActionButtonProps {
  icon: keyof typeof Icons
  label?: string
  onClick: () => void
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  color?: 'primary' | 'secondary' | 'success' | 'danger'
  extended?: boolean
  className?: string
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  color = 'primary',
  extended = false,
  className,
}: FloatingActionButtonProps): React.ReactElement {
  const IconComponent = Icons[icon] as React.ComponentType<{ className?: string }>

  const positionStyles = {
    'bottom-right': 'right-4 bottom-4',
    'bottom-left': 'left-4 bottom-4',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-4',
  }

  const colorStyles = {
    primary: 'bg-[var(--primary)] text-white shadow-[var(--shadow-lg)]',
    secondary: 'bg-gray-900 text-white shadow-xl',
    success: 'bg-green-600 text-white shadow-xl',
    danger: 'bg-red-600 text-white shadow-xl',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-50 flex items-center justify-center rounded-full transition-all',
        'hover:-translate-y-1 hover:shadow-2xl active:scale-95',
        'min-h-[56px]',
        extended ? 'gap-2 px-6' : 'h-14 w-14',
        positionStyles[position],
        colorStyles[color],
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
      aria-label={label}
    >
      <IconComponent className="h-6 w-6" />
      {extended && label && <span className="font-bold">{label}</span>}
    </button>
  )
}
