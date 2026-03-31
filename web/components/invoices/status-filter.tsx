'use client'

import { useRouter } from 'next/navigation'

interface StatusFilterProps {
  currentStatus: string
  clinic: string
}

const statuses = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'partial', label: 'Pago parcial' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'void', label: 'Anuladas' },
]

export function StatusFilter({ currentStatus, clinic }: StatusFilterProps) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value
    router.push(`/${clinic}/dashboard/invoices?status=${status}`)
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      className="focus:ring-[var(--primary)]/20 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium outline-none focus:border-[var(--primary)] focus:ring-2"
    >
      {statuses.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  )
}
