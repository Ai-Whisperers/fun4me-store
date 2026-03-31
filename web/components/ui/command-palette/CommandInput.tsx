'use client'

import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface CommandInputProps {
  query: string
  onChange: (value: string) => void
  onClose: () => void
  isOpen: boolean
}

export function CommandInput({
  query,
  onChange,
  onClose,
  isOpen,
}: CommandInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
      <Search className="h-5 w-5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar pacientes, acciones, herramientas..."
        className="flex-1 text-base outline-none placeholder:text-gray-400"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <kbd className="hidden items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-400 sm:flex">
        ESC
      </kbd>
      <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 sm:hidden" aria-label="Cerrar búsqueda">
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}
