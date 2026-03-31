'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendIndicatorProps {
  value: number
  previousValue: number
  format?: 'percent' | 'number' | 'currency'
  invertColors?: boolean  // For metrics where down is good (e.g., costs)
  className?: string
}

export function TrendIndicator({
  value,
  previousValue,
  format = 'percent',
  invertColors = false,
  className = '',
}: TrendIndicatorProps): React.ReactElement {
  // Calculate percentage change
  const change = previousValue !== 0 
    ? ((value - previousValue) / Math.abs(previousValue)) * 100 
    : value > 0 ? 100 : 0

  const isPositive = change > 0
  const isNegative = change < 0
  const isNeutral = change === 0

  // Determine color based on direction and invertColors
  const getColor = () => {
    if (isNeutral) return 'text-gray-500 bg-gray-100'
    if (invertColors) {
      return isPositive ? 'text-[var(--status-error)] bg-[var(--status-error-bg)]' : 'text-[var(--status-success)] bg-[var(--status-success-bg)]'
    }
    return isPositive ? 'text-[var(--status-success)] bg-[var(--status-success-bg)]' : 'text-[var(--status-error)] bg-[var(--status-error-bg)]'
  }

  const formatValue = () => {
    const absChange = Math.abs(change)
    switch (format) {
      case 'percent':
        return `${absChange.toFixed(1)}%`
      case 'number':
        return Math.abs(value - previousValue).toLocaleString('es-PY')
      case 'currency':
        return new Intl.NumberFormat('es-PY', {
          style: 'currency',
          currency: 'PYG',
          maximumFractionDigits: 0,
        }).format(Math.abs(value - previousValue))
      default:
        return `${absChange.toFixed(1)}%`
    }
  }

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getColor()} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span>
        {isPositive ? '+' : isNegative ? '-' : ''}
        {formatValue()}
      </span>
    </div>
  )
}

// Compact version for inline use
interface TrendBadgeProps {
  change: number  // Percentage change
  size?: 'sm' | 'md'
  invertColors?: boolean
}

export function TrendBadge({
  change,
  size = 'sm',
  invertColors = false,
}: TrendBadgeProps): React.ReactElement {
  const isPositive = change > 0
  const isNegative = change < 0
  const isNeutral = change === 0

  const getColor = () => {
    if (isNeutral) return 'text-gray-500'
    if (invertColors) {
      return isPositive ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]'
    }
    return isPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
  }

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <span className={`inline-flex items-center gap-0.5 ${getColor()} ${textSize}`}>
      <Icon className={iconSize} />
      <span className="font-medium">
        {isPositive ? '+' : ''}
        {change.toFixed(1)}%
      </span>
    </span>
  )
}
