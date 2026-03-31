'use client'

import { Dog, Cat, Syringe, FileCheck, AlertTriangle, UserPlus } from 'lucide-react'
import type { InsightsData, FilterOptions } from './types'

interface InsightsBarProps {
  insights: InsightsData
  onFilterClick: (key: keyof FilterOptions, value: string) => void
  onPendingFilesClick: () => void
}

export function InsightsBar({
  insights,
  onFilterClick,
  onPendingFilesClick,
}: InsightsBarProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {/* Dogs */}
      <button
        type="button"
        onClick={() => onFilterClick('species', 'dog')}
        className="rounded-xl border border-[var(--border-color)] bg-white p-4 text-left transition-colors hover:border-[var(--primary)]"
      >
        <div className="mb-1 flex items-center gap-2 text-blue-600">
          <Dog className="h-4 w-4" />
          <span className="text-xs font-medium">Perros</span>
        </div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{insights.dogs}</p>
      </button>

      {/* Cats */}
      <button
        type="button"
        onClick={() => onFilterClick('species', 'cat')}
        className="rounded-xl border border-[var(--border-color)] bg-white p-4 text-left transition-colors hover:border-[var(--primary)]"
      >
        <div className="mb-1 flex items-center gap-2 text-purple-600">
          <Cat className="h-4 w-4" />
          <span className="text-xs font-medium">Gatos</span>
        </div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{insights.cats}</p>
      </button>

      {/* Vaccines Pending - ALERT STYLE */}
      <button
        type="button"
        onClick={() => onFilterClick('vaccine', 'overdue')}
        className={`rounded-xl border bg-white p-4 text-left transition-colors ${
          insights.vaccinesOverdue > 0
            ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] hover:opacity-80'
            : 'border-[var(--border-color)] hover:border-[var(--primary)]'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[var(--status-error)]">
          <Syringe className="h-4 w-4" />
          <span className="text-xs font-medium">Vacunas Pendientes</span>
          {insights.vaccinesOverdue > 0 && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--status-error)]" />
          )}
        </div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{insights.vaccinesPending}</p>
        {insights.vaccinesOverdue > 0 && (
          <p className="text-xs text-[var(--status-error)]">{insights.vaccinesOverdue} vencidas</p>
        )}
      </button>

      {/* Pending Files - ALERT STYLE */}
      <button
        type="button"
        onClick={onPendingFilesClick}
        className={`rounded-xl border bg-white p-4 text-left transition-colors ${
          insights.pendingFiles > 0
            ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] hover:opacity-80'
            : 'border-[var(--border-color)] hover:border-[var(--primary)]'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[var(--status-warning)]">
          <FileCheck className="h-4 w-4" />
          <span className="text-xs font-medium">Archivos por Validar</span>
          {insights.pendingFiles > 0 && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--status-warning)]" />
          )}
        </div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{insights.pendingFiles}</p>
        {insights.pendingFiles > 0 && <p className="text-xs text-[var(--status-warning)]">recetas pendientes</p>}
      </button>

      {/* Needs Follow-up */}
      <button
        type="button"
        onClick={() => onFilterClick('lastVisit', '6+')}
        className={`rounded-xl border bg-white p-4 text-left transition-colors ${
          insights.needsFollowUp > 0
            ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] hover:opacity-80'
            : 'border-[var(--border-color)] hover:border-[var(--primary)]'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[var(--status-warning)]">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-medium">Necesitan Seguimiento</span>
        </div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{insights.needsFollowUp}</p>
        <p className="text-xs text-[var(--status-warning)]">&gt;90 dias sin visita</p>
      </button>

      {/* New This Month */}
      <button
        type="button"
        onClick={() => onFilterClick('lastVisit', 'recent')}
        className="rounded-xl border border-[var(--border-color)] bg-white p-4 text-left transition-colors hover:border-[var(--primary)]"
      >
        <div className="mb-1 flex items-center gap-2 text-[var(--status-success)]">
          <UserPlus className="h-4 w-4" />
          <span className="text-xs font-medium">Nuevos este Mes</span>
        </div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{insights.newThisMonth}</p>
      </button>
    </div>
  )
}
