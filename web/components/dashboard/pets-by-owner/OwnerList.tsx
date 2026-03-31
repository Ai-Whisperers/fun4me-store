import { User } from 'lucide-react'
import type { Owner } from './types'
import { OwnerListItem } from './OwnerListItem'

interface OwnerListProps {
  owners: Owner[]
  selectedOwnerId: string | null
  onSelectOwner: (ownerId: string) => void
  searchQuery: string
}

export function OwnerList({
  owners,
  selectedOwnerId,
  onSelectOwner,
  searchQuery,
}: OwnerListProps): React.ReactElement {
  if (owners.length === 0) {
    return (
      <div className="p-8 text-center">
        <User className="mx-auto mb-3 h-12 w-12 text-[var(--text-secondary)] opacity-50" />
        <p className="text-sm text-[var(--text-secondary)]">
          {searchQuery ? 'No se encontraron resultados' : 'No hay propietarios registrados'}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[var(--border-color)]">
      {owners.map((owner) => (
        <OwnerListItem
          key={owner.id}
          owner={owner}
          isSelected={selectedOwnerId === owner.id}
          onClick={() => onSelectOwner(owner.id)}
        />
      ))}
    </div>
  )
}
