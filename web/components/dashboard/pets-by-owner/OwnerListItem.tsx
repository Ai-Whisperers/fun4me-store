import { PawPrint, ChevronRight } from 'lucide-react'
import type { Owner } from './types'
import { isClientActive } from './utils'

interface OwnerListItemProps {
  owner: Owner
  isSelected: boolean
  onClick: () => void
}

export function OwnerListItem({
  owner,
  isSelected,
  onClick,
}: OwnerListItemProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left transition-colors hover:bg-[var(--bg-subtle)] ${
        isSelected
          ? 'border-l-4 border-l-[var(--primary)] bg-[var(--primary)] bg-opacity-5'
          : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] bg-opacity-10">
          <span className="font-semibold text-[var(--primary)]">
            {owner.full_name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate font-medium text-[var(--text-primary)]">{owner.full_name}</p>
            {isClientActive(owner.last_visit) ? (
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--status-success)]" title="Activo" />
            ) : (
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--status-warning)]" title="Inactivo" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <PawPrint className="h-3 w-3" />
            <span>
              {owner.pets.length} mascota{owner.pets.length !== 1 ? 's' : ''}
            </span>
            {owner.phone && (
              <>
                <span className="text-[var(--border-color)]">•</span>
                <span className="truncate">{owner.phone}</span>
              </>
            )}
          </div>
        </div>

        <ChevronRight
          className={`h-5 w-5 flex-shrink-0 transition-colors ${
            isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'
          }`}
        />
      </div>
    </button>
  )
}
