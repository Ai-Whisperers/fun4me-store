/**
 * Touch Feedback Button Component
 *
 * Button with tactile feedback animations for mobile.
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: keyof typeof Icons
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export function TouchButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: TouchButtonProps): React.ReactElement {
  const [isPressed, setIsPressed] = useState(false)

  const IconComponent = icon ? (Icons[icon] as React.ComponentType<{ className?: string }>) : null

  const sizeStyles = {
    sm: { button: 'px-3 py-2 text-sm min-h-[40px]', icon: 'w-4 h-4', gap: 'gap-1.5' },
    md: { button: 'px-4 py-3 text-base min-h-[48px]', icon: 'w-5 h-5', gap: 'gap-2' },
    lg: { button: 'px-6 py-4 text-lg min-h-[56px]', icon: 'w-6 h-6', gap: 'gap-2.5' },
  }

  const variantStyles = {
    primary: 'bg-[var(--primary)] text-white shadow-lg hover:shadow-xl active:shadow-md',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    danger: 'bg-red-600 text-white shadow-lg hover:bg-red-700 active:bg-red-800',
  }

  const sizes = sizeStyles[size]

  return (
    <button
      {...props}
      disabled={disabled || loading}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-bold transition-all',
        sizes.button,
        sizes.gap,
        variantStyles[variant],
        fullWidth && 'w-full',
        isPressed && 'scale-95',
        (disabled || loading) && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {loading ? (
        <Icons.Loader2 className={cn(sizes.icon, 'animate-spin')} />
      ) : (
        <>
          {IconComponent && iconPosition === 'left' && <IconComponent className={sizes.icon} />}
          {children}
          {IconComponent && iconPosition === 'right' && <IconComponent className={sizes.icon} />}
        </>
      )}
    </button>
  )
}
