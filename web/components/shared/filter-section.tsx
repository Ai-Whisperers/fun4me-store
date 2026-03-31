import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FilterOption } from '@/hooks/use-filter-data'

interface FilterSectionProps<T extends FilterOption> {
  title: string
  options: T[]
  selectedValue: string
  onChange: (value: string) => void
  isExpanded: boolean
  onToggle: () => void
  isLoading: boolean
  renderOption: (option: T) => React.ReactNode
  showCounts?: boolean
  allLabel?: string
}

export function FilterSection<T extends FilterOption>({
  title,
  options,
  selectedValue,
  onChange,
  isExpanded,
  onToggle,
  isLoading,
  renderOption,
  showCounts = false,
  allLabel = `Todas las ${title.toLowerCase()}`,
}: FilterSectionProps<T>) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-3/4 rounded bg-gray-200"></div>
        <div className="ml-4 space-y-2">
          <div className="h-4 rounded bg-gray-200"></div>
          <div className="h-4 w-5/6 rounded bg-gray-200"></div>
          <div className="h-4 w-4/6 rounded bg-gray-200"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="-m-2 mb-3 flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-gray-50"
      >
        <h4 className="font-bold text-gray-900">{title}</h4>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2">
          <label className="-m-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
            <input
              type="radio"
              name={title.toLowerCase()}
              value="all"
              checked={selectedValue === 'all'}
              onChange={(e) => onChange(e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span
              className={`text-sm ${selectedValue === 'all' ? 'font-bold text-blue-600' : 'text-gray-600'}`}
            >
              {allLabel}
            </span>
          </label>

          {options.map((option) => (
            <label
              key={option.id}
              className="-m-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
            >
              <input
                type="radio"
                name={title.toLowerCase()}
                value={option.slug}
                checked={selectedValue === option.slug}
                onChange={(e) => onChange(e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div
                className={`flex-1 ${selectedValue === option.slug ? 'text-blue-600' : 'text-gray-600'}`}
              >
                {renderOption(option)}
              </div>
              {showCounts && option.count !== undefined && (
                <span className="ml-auto flex-shrink-0 text-xs text-gray-400">
                  ({option.count})
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
