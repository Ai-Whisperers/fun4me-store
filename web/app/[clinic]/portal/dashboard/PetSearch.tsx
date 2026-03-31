'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export default function PetSearch() {
  const searchParams = useSearchParams()
  const { replace } = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('query', term)
    } else {
      params.delete('query')
    }
    replace(`?${params.toString()}`)
  }, 300)

  return (
    <div className="relative w-full md:w-96">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
        <Search className="h-5 w-5" />
      </div>
      <input
        type="text"
        placeholder="Buscar mascota o dueño..."
        className="block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 pl-10 text-sm outline-none transition-all focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[var(--primary)]"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('query')?.toString()}
      />
    </div>
  )
}
