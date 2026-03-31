'use client'

import { Crown, Users, AlertTriangle, Moon, Sparkles } from 'lucide-react'

interface Segment {
  segment: 'vip' | 'regular' | 'at_risk' | 'dormant' | 'new'
  count: number
  total_revenue: number
  avg_order_value: number
  percentage: number
}

interface SegmentOverviewProps {
  segments: Segment[]
  onSegmentClick?: (segment: Segment['segment']) => void
  selectedSegment?: Segment['segment'] | null
}

const segmentConfig = {
  vip: {
    label: 'VIP',
    description: 'Clientes de alto valor',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverColor: 'hover:border-amber-400',
    selectedBg: 'bg-amber-100',
  },
  regular: {
    label: 'Regulares',
    description: 'Clientes activos',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:border-blue-400',
    selectedBg: 'bg-blue-100',
  },
  at_risk: {
    label: 'En Riesgo',
    description: '60-120 días sin comprar',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverColor: 'hover:border-orange-400',
    selectedBg: 'bg-orange-100',
  },
  dormant: {
    label: 'Inactivos',
    description: 'Más de 120 días sin comprar',
    icon: Moon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    hoverColor: 'hover:border-gray-400',
    selectedBg: 'bg-gray-100',
  },
  new: {
    label: 'Nuevos',
    description: 'Primera compra reciente',
    icon: Sparkles,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:border-green-400',
    selectedBg: 'bg-green-100',
  },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SegmentOverview({
  segments,
  onSegmentClick,
  selectedSegment,
}: SegmentOverviewProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {segments.map((segment) => {
        const config = segmentConfig[segment.segment]
        const Icon = config.icon
        const isSelected = selectedSegment === segment.segment

        return (
          <button
            key={segment.segment}
            onClick={() => onSegmentClick?.(segment.segment)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${config.hoverColor} ${
              isSelected
                ? `${config.selectedBg} ${config.borderColor} ring-2 ring-offset-2`
                : `bg-white ${config.borderColor}`
            }`}
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
              <div className={`rounded-lg p-2 ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <span className={`text-xs font-medium ${config.color}`}>{segment.percentage}%</span>
            </div>

            {/* Content */}
            <div className="mb-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{segment.count}</h3>
              <p className="text-sm font-medium text-[var(--text-primary)]">{config.label}</p>
            </div>

            <p className="mb-3 text-xs text-[var(--text-secondary)]">{config.description}</p>

            {/* Revenue */}
            <div className="border-t pt-2">
              <p className="text-xs text-[var(--text-secondary)]">Ingresos totales</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatCurrency(segment.total_revenue)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
