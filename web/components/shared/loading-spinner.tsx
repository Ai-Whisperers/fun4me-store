import React from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
  fullScreen?: boolean
  overlay?: boolean
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function LoadingSpinner({
  size = 'md',
  className,
  text,
  fullScreen = false,
  overlay = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={clsx(
        'flex items-center justify-center gap-2',
        fullScreen && 'min-h-screen',
        overlay && 'absolute inset-0 z-10 bg-white/80 backdrop-blur-sm',
        className
      )}
    >
      <Loader2 className={clsx('animate-spin text-blue-600', sizeClasses[size])} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">{spinner}</div>
    )
  }

  return spinner
}
