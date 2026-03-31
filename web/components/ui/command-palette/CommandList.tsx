'use client'

import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import type { CommandItem, GroupedCommands } from './command-types'
import { CATEGORY_LABELS } from './command-types'

interface CommandListProps {
  groupedCommands: GroupedCommands
  flatCommands: CommandItem[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
}

export function CommandList({
  groupedCommands,
  flatCommands,
  selectedIndex,
  onSelectIndex,
}: CommandListProps): React.ReactElement {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  let globalIndex = -1

  return (
    <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
      {flatCommands.length === 0 ? (
        <div className="px-4 py-8 text-center text-gray-500">
          <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p>No se encontraron resultados</p>
          <p className="text-sm text-gray-400">Intenta con otra búsqueda</p>
        </div>
      ) : (
        Object.entries(groupedCommands).map(([category, items]) => {
          if (items.length === 0) return null

          return (
            <div key={category}>
              <div className="px-4 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {CATEGORY_LABELS[category]}
                </span>
              </div>
              {items.map((item: CommandItem) => {
                globalIndex++
                const isSelected = globalIndex === selectedIndex

                return (
                  <button
                    key={item.id}
                    data-selected={isSelected}
                    onClick={item.action}
                    onMouseEnter={() => onSelectIndex(globalIndex)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-[var(--primary)] text-white' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate font-medium ${
                          isSelected ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p
                          className={`truncate text-sm ${
                            isSelected ? 'text-white/70' : 'text-gray-500'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}
