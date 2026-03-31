'use client'

/**
 * Campaigns Grid Component
 *
 * REF-006: Extracted grid view from client component
 */

import { Megaphone, Plus } from 'lucide-react'
import type { Campaign } from '../types'
import { CampaignCard } from './CampaignCard'

interface CampaignsGridProps {
  campaigns: Campaign[]
  loading: boolean
  hasFilters: boolean
  onEdit: (campaign: Campaign) => void
  onDelete: (id: string) => void
  onCreateNew: () => void
}

export function CampaignsGrid({
  campaigns,
  loading,
  hasFilters,
  onEdit,
  onDelete,
  onCreateNew,
}: CampaignsGridProps): React.ReactElement {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
        <p className="mt-4 text-[var(--text-secondary)]">Cargando campañas...</p>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <Megaphone className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">No hay campañas</h3>
        <p className="mt-1 text-[var(--text-secondary)]">
          {hasFilters
            ? 'No se encontraron campañas con los filtros aplicados'
            : 'Crea tu primera campaña promocional'}
        </p>
        {!hasFilters && (
          <button
            onClick={onCreateNew}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Crear Campaña
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
