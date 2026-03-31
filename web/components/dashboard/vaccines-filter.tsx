'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'

interface VaccinesFilterProps {
  clinic: string
  currentStatus: string
}

export function VaccinesFilter({ clinic, currentStatus }: VaccinesFilterProps): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleStatusChange = (status: string): void => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    router.push(`/${clinic}/dashboard/vaccines?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-gray-400" />
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[var(--primary)]"
      >
        <option value="all">Todos los estados</option>
        <option value="scheduled">Pendientes</option>
        <option value="completed">Verificadas</option>
        <option value="missed">Perdidas</option>
        <option value="cancelled">Canceladas</option>
      </select>
    </div>
  )
}
