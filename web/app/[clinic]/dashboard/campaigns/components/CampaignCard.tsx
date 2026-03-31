'use client'

/**
 * Campaign Card Component
 *
 * REF-006: Extracted campaign card from client component
 */

import {
  Tag,
  Gift,
  Package,
  Zap,
  Sun,
  Percent,
  DollarSign,
  Calendar,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { Campaign } from '../types'
import { CampaignStatusBadge } from './CampaignStatusBadge'
import { formatDiscountValue, formatDateShort, getCampaignTypeInfo } from '../utils'
import { COLOR_CLASSES } from '../constants'
import { useTranslations } from 'next-intl'

interface CampaignCardProps {
  campaign: Campaign
  onEdit: (campaign: Campaign) => void
  onDelete: (id: string) => void
}

const iconMap = {
  Tag,
  Gift,
  Package,
  Zap,
  Sun,
}

export function CampaignCard({
  campaign,
  onEdit,
  onDelete,
}: CampaignCardProps): React.ReactElement {
  const t = useTranslations()
  const typeInfo = getCampaignTypeInfo(campaign.campaign_type)
  const TypeIcon = iconMap[typeInfo.iconName]
  const colorClasses = COLOR_CLASSES[typeInfo.color]

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header with type indicator */}
      <div
        className={`flex items-center justify-between bg-gradient-to-r px-4 py-3 ${colorClasses.gradient}`}
      >
        <div className="flex items-center gap-2">
          <TypeIcon className={`h-5 w-5 ${colorClasses.icon}`} />
          <span className="text-sm font-medium text-gray-700">{typeInfo.label}</span>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-bold text-[var(--text-primary)]">
            {campaign.name}
          </h3>
          {campaign.description && (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
              {campaign.description}
            </p>
          )}
        </div>

        {/* Discount */}
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
          {campaign.discount_type === 'percentage' ? (
            <Percent className="h-5 w-5 text-green-600" />
          ) : (
            <DollarSign className="h-5 w-5 text-blue-600" />
          )}
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {formatDiscountValue(campaign.discount_type, campaign.discount_value)}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">descuento</span>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Calendar className="h-4 w-4" />
          {formatDateShort(campaign.start_date)} - {formatDateShort(campaign.end_date)}
        </div>

        {/* Products count */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Package className="h-4 w-4" />
          {campaign.product_count} producto{campaign.product_count !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
        <button
          onClick={() => onEdit(campaign)}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          title={t('common.edit')}
        >
          <Pencil className="h-4 w-4 text-gray-500" />
        </button>
        <button
          onClick={() => onDelete(campaign.id)}
          className="rounded-lg p-2 transition-colors hover:bg-red-50"
          title={t('common.delete')}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  )
}
