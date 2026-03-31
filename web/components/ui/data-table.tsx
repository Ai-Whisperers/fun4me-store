'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Generic DataTable Component
 *
 * A reusable table component with sorting, filtering, and pagination.
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={clients}
 *   columns={[
 *     {
 *       key: 'full_name',
 *       label: 'Cliente',
 *       sortable: true,
 *       render: (client) => (
 *         <div className="flex items-center gap-2">
 *           <span>{client.full_name}</span>
 *         </div>
 *       )
 *     },
 *     {
 *       key: 'email',
 *       label: 'Email',
 *       sortable: true,
 *     }
 *   ]}
 *   onRowClick={(client) => router.push(`/clients/${client.id}`)}
 *   emptyMessage="No hay clientes"
 * />
 * ```
 */

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor?: (item: T, index: number) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  pageSize?: number
  showPagination?: boolean
  className?: string
  rowClassName?: string | ((item: T, index: number) => string)
  mobileRender?: (item: T, index: number) => React.ReactNode
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor = (item, index) => String(item.id ?? index),
  onRowClick,
  emptyMessage,
  emptyIcon,
  pageSize = 10,
  showPagination = false,
  className = '',
  rowClassName = '',
  mobileRender,
}: DataTableProps<T>) {
  const t = useTranslations('dataTable')
  const resolvedEmptyMessage = emptyMessage ?? t('noData')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Handle column sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })
  }, [data, sortColumn, sortDirection])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize, showPagination])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  // Get row class name
  const getRowClassName = (item: T, index: number): string => {
    if (typeof rowClassName === 'function') {
      return rowClassName(item, index)
    }
    return rowClassName
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`rounded-xl bg-[var(--bg-default)] p-12 text-center shadow-md ${className}`}>
        {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
        <p className="text-[var(--text-secondary)]">{resolvedEmptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl bg-[var(--bg-default)] shadow-md md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[var(--primary)] border-opacity-10 bg-[var(--primary)] bg-opacity-5">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)] ${
                      column.headerClassName || ''
                    } ${column.sortable ? 'cursor-pointer select-none hover:bg-[var(--primary)] hover:bg-opacity-10' : ''}`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && sortColumn === column.key && (
                        <span>
                          {sortDirection === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--primary)] divide-opacity-5">
              {paginatedData.map((item, index) => (
                <tr
                  key={keyExtractor(item, index)}
                  className={`transition-colors hover:bg-[var(--primary)] hover:bg-opacity-5 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${getRowClassName(item, index)}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 text-[var(--text-primary)] ${column.className || ''}`}
                    >
                      {column.render ? column.render(item, index) : String(item[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile List View */}
      <div className="space-y-4 md:hidden">
        {paginatedData.map((item, index) => (
          <div
            key={keyExtractor(item, index)}
            className={`rounded-lg bg-[var(--bg-default)] p-4 shadow-md ${
              onRowClick ? 'cursor-pointer active:scale-[0.98]' : ''
            } transition-all ${getRowClassName(item, index)}`}
            onClick={() => onRowClick?.(item)}
          >
            {mobileRender ? (
              mobileRender(item, index)
            ) : (
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={column.key} className="flex items-start justify-between">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {column.label}:
                    </span>
                    <span className="text-right text-sm text-[var(--text-primary)]">
                      {column.render ? column.render(item, index) : String(item[column.key] ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--bg-default)] px-4 py-3 shadow-md">
          <div className="text-sm text-[var(--text-secondary)]">
            {t('showing', {
              start: (currentPage - 1) * pageSize + 1,
              end: Math.min(currentPage * pageSize, sortedData.length),
              total: sortedData.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 px-3 py-1 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('previousPage')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              {t('pageOf', { current: currentPage, total: totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-200 px-3 py-1 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('nextPage')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
