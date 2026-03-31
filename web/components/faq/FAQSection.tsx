'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Search, ChevronUp, ChevronDownSquare, ChevronUpSquare } from 'lucide-react'
import type { FaqItem } from '@/lib/clinics'

interface FAQSectionProps {
  items: FaqItem[]
  categories: string[]
}

export function FAQSection({ items, categories }: FAQSectionProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (activeCategory && item.category !== activeCategory) {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [items, activeCategory, searchQuery])

  // Toggle single item
  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Expand all visible items
  const expandAll = () => {
    setOpenItems(new Set(filteredItems.map((item) => item.id)))
  }

  // Collapse all items
  const collapseAll = () => {
    setOpenItems(new Set())
  }

  // Check if all visible items are expanded
  const allExpanded =
    filteredItems.length > 0 && filteredItems.every((item) => openItems.has(item.id))

  // Get category display name (capitalize first letter)
  const formatCategory = (cat: string): string => {
    return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Buscar en las preguntas frecuentes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-default)] py-3 pl-12 pr-4 text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          aria-label="Buscar preguntas frecuentes"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === null
                ? 'bg-[var(--primary)] text-white'
                : 'border border-[var(--border)] bg-[var(--bg-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
            aria-pressed={activeCategory === null}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-[var(--border)] bg-[var(--bg-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
              aria-pressed={activeCategory === cat}
            >
              {formatCategory(cat)}
            </button>
          ))}
        </div>
      )}

      {/* Expand/Collapse Controls */}
      {filteredItems.length > 1 && (
        <div className="flex justify-end gap-2">
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
            aria-label={allExpanded ? 'Contraer todas' : 'Expandir todas'}
          >
            {allExpanded ? (
              <>
                <ChevronUpSquare className="h-4 w-4" />
                Contraer todas
              </>
            ) : (
              <>
                <ChevronDownSquare className="h-4 w-4" />
                Expandir todas
              </>
            )}
          </button>
        </div>
      )}

      {/* Results count when searching */}
      {searchQuery && (
        <p className="text-sm text-[var(--text-muted)]">
          {filteredItems.length === 0
            ? 'No se encontraron resultados'
            : `${filteredItems.length} resultado${filteredItems.length !== 1 ? 's' : ''} encontrado${filteredItems.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* FAQ Items */}
      <div className="space-y-4" role="region" aria-label="Preguntas frecuentes">
        {filteredItems.map((item) => {
          const isOpen = openItems.has(item.id)
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-default)] shadow-sm"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-[var(--bg-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${item.id}`}
                id={`faq-question-${item.id}`}
              >
                <span className="pr-4 font-bold text-[var(--text-primary)]">{item.question}</span>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 flex-shrink-0 text-[var(--text-muted)]" />
                ) : (
                  <ChevronDown className="h-5 w-5 flex-shrink-0 text-[var(--text-muted)]" />
                )}
              </button>
              <div
                id={`faq-answer-${item.id}`}
                role="region"
                aria-labelledby={`faq-question-${item.id}`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6 leading-relaxed text-[var(--text-secondary)]">
                  {item.answer}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* No results message */}
      {filteredItems.length === 0 && !searchQuery && (
        <div className="py-12 text-center">
          <p className="text-[var(--text-muted)]">No hay preguntas frecuentes disponibles.</p>
        </div>
      )}
    </div>
  )
}
