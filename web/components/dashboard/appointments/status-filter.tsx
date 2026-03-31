'use client'

import { useRouter } from 'next/navigation'

interface StatusFilterProps {
  currentStatus: string
  clinic: string
  currentDate: string
}

const statusOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'checked_in', label: 'Registradas' },
  { value: 'in_progress', label: 'En Consulta' },
  { value: 'completed', label: 'Completadas' },
  { value: 'no_show', label: 'No Presentados' },
  { value: 'cancelled', label: 'Canceladas' },
]

export function StatusFilter({ currentStatus, clinic: _clinic, currentDate }: StatusFilterProps) {
  const router = useRouter()

  const handleStatusChange = (status: string) => {
    const url = new URL(window.location.href)
    if (status === 'all') {
      url.searchParams.delete('status')
    } else {
      url.searchParams.set('status', status)
    }
    url.searchParams.set('date', currentDate)
    router.push(url.pathname + url.search)
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleStatusChange(e.target.value)}
      className="focus:ring-[var(--primary)]/20 min-h-[44px] cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[var(--primary)] focus:ring-2"
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
