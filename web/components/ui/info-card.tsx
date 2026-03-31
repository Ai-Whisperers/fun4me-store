import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoCardProps {
  icon?: LucideIcon
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

/**
 * InfoCard - Display metric information with optional icon and trend
 *
 * A card component for displaying key metrics and statistics, commonly used in dashboards.
 * Supports icons, trends, and subtitles for additional context.
 *
 * @example
 * <InfoCard
 *   icon={Users}
 *   title="Total de Clientes"
 *   value={245}
 *   subtitle="Clientes activos"
 *   trend={{ value: 12, isPositive: true }}
 * />
 */
export function InfoCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  className,
}: InfoCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border,#e5e7eb)] bg-[var(--bg-card)] p-6 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {typeof value === 'number' ? value.toLocaleString('es-PY') : value}
          </p>
          {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="bg-[var(--primary)]/10 rounded-xl p-3">
            <Icon className="h-6 w-6 text-[var(--primary)]" />
          </div>
        )}
      </div>
      {trend && (
        <div
          className={cn(
            'mt-4 flex items-center gap-1 text-sm font-semibold',
            trend.isPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
          )}
        >
          <span className="text-lg">{trend.isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}% vs mes anterior</span>
        </div>
      )}
    </div>
  )
}
