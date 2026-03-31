'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

interface ClientSearchProps {
  clinic: string
  initialQuery?: string
}

export default function ClientSearch({ clinic, initialQuery = '' }: ClientSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value)

    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      if (value.trim()) {
        params.set('q', value)
      } else {
        params.delete('q')
      }

      const search = params.toString()
      const url = `/${clinic}/dashboard/clients${search ? `?${search}` : ''}`
      router.push(url)
    })
  }

  const handleClear = () => {
    setQuery('')
    startTransition(() => {
      router.push(`/${clinic}/dashboard/clients`)
    })
  }

  return (
    <div className="max-w-md flex-1">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full rounded-lg border border-[var(--primary)] border-opacity-20 bg-[var(--bg-default)] py-2 pl-10 pr-10 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-50"
          disabled={isPending}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            disabled={isPending}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {isPending && <p className="ml-1 mt-1 text-xs text-[var(--text-secondary)]">Buscando...</p>}
    </div>
  )
}
