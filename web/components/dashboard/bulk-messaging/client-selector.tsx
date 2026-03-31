'use client'

import { Search, Mail, Phone, Loader2 } from 'lucide-react'
import type { Client, FilterOption } from './types'

interface ClientSelectorProps {
  clients: Client[]
  selectedClients: Set<string>
  isLoading: boolean
  searchQuery: string
  selectedFilter: string
  filterOptions: FilterOption[]
  labels: {
    search_placeholder: string
    selected_count: string
    select_all: string
    clear: string
    continue_with: string
  }
  onSearchChange: (query: string) => void
  onFilterChange: (filter: string) => void
  onToggleClient: (clientId: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onContinue: () => void
}

export function ClientSelector({
  clients,
  selectedClients,
  isLoading,
  searchQuery,
  selectedFilter,
  filterOptions,
  labels,
  onSearchChange,
  onFilterChange,
  onToggleClient,
  onSelectAll,
  onClearSelection,
  onContinue,
}: ClientSelectorProps): React.ReactElement {
  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Filters */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={() => onFilterChange(option.id)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedFilter === option.id
                    ? option.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={labels.search_placeholder}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {labels.selected_count
              .replace('{count}', String(selectedClients.size))
              .replace('{total}', String(filteredClients.length))}
          </span>
          <div className="flex gap-2">
            <button onClick={onSelectAll} className="text-sm text-[var(--primary)] hover:underline">
              {labels.select_all}
            </button>
            <button onClick={onClearSelection} className="text-sm text-gray-500 hover:underline">
              {labels.clear}
            </button>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredClients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                isSelected={selectedClients.has(client.id)}
                onToggle={() => onToggleClient(client.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 p-4">
        <button
          onClick={onContinue}
          disabled={selectedClients.size === 0}
          className="w-full rounded-lg bg-[var(--primary)] py-3 font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {labels.continue_with.replace('{count}', String(selectedClients.size))}
        </button>
      </div>
    </div>
  )
}

/**
 * Individual client row component
 */
function ClientRow({
  client,
  isSelected,
  onToggle,
}: {
  client: Client
  isSelected: boolean
  onToggle: () => void
}): React.ReactElement {
  return (
    <label className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-gray-50">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="h-5 w-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{client.full_name}</p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {client.email}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            {client.phone}
          </span>
        </div>
      </div>
      {client.pets_count && (
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          {client.pets_count} mascota{client.pets_count > 1 ? 's' : ''}
        </span>
      )}
    </label>
  )
}
