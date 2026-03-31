import { User } from 'lucide-react'

export function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-[var(--border-color)] bg-white shadow-sm">
      <div className="p-8 text-center">
        <User className="mx-auto mb-4 h-16 w-16 text-[var(--text-secondary)] opacity-50" />
        <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
          Selecciona un propietario
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Elige un propietario de la lista para ver sus mascotas
        </p>
      </div>
    </div>
  )
}
