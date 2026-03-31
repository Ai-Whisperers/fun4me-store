/**
 * Accessible Table Component
 *
 * A11Y-003: Screen reader compatibility
 *
 * A table component with proper accessibility features:
 * - Caption for table description
 * - Proper header scope attributes
 * - Row/column headers
 * - Sort state announcements
 * - Keyboard navigation
 *
 * @example
 * ```tsx
 * <AccessibleTable
 *   caption="Lista de mascotas registradas"
 *   headers={[
 *     { key: 'name', label: 'Nombre', sortable: true },
 *     { key: 'species', label: 'Especie' },
 *     { key: 'owner', label: 'Dueño' },
 *   ]}
 *   rows={pets.map(pet => ({
 *     id: pet.id,
 *     cells: [pet.name, pet.species, pet.owner_name],
 *   }))}
 *   sortColumn="name"
 *   sortDirection="asc"
 *   onSort={(key) => handleSort(key)}
 * />
 * ```
 */

'use client'

import { type ReactNode } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { describeSortState } from '@/lib/accessibility/screen-reader'

/**
 * Table header definition
 */
export interface TableHeader {
  /** Unique key for the column */
  key: string
  /** Display label */
  label: string
  /** Whether column is sortable */
  sortable?: boolean
  /** Column scope (default: 'col') */
  scope?: 'col' | 'colgroup' | 'row' | 'rowgroup'
  /** Additional CSS classes */
  className?: string
  /** Screen reader only label (if different from visible label) */
  srLabel?: string
}

/**
 * Table row definition
 */
export interface TableRow {
  /** Unique row ID */
  id: string
  /** Cell contents (order must match headers) */
  cells: ReactNode[]
  /** Whether first cell is a row header */
  hasRowHeader?: boolean
  /** Row click handler */
  onClick?: () => void
  /** Additional row classes */
  className?: string
}

export interface AccessibleTableProps {
  /** Table caption (required for accessibility) */
  caption: string
  /** Whether to visually hide the caption */
  captionHidden?: boolean
  /** Column headers */
  headers: TableHeader[]
  /** Table rows */
  rows: TableRow[]
  /** Currently sorted column key */
  sortColumn?: string
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc' | 'none'
  /** Sort handler */
  onSort?: (key: string) => void
  /** Empty state message */
  emptyMessage?: string
  /** Container className */
  className?: string
  /** Table className */
  tableClassName?: string
  /** Whether table is loading */
  isLoading?: boolean
}

/**
 * Accessible Table Component
 */
export function AccessibleTable({
  caption,
  captionHidden = false,
  headers,
  rows,
  sortColumn,
  sortDirection = 'none',
  onSort,
  emptyMessage,
  className,
  tableClassName,
  isLoading = false,
}: AccessibleTableProps): React.ReactElement {
  const t = useTranslations('common')

  // Generate sort button aria labels
  const getSortAriaLabel = (header: TableHeader): string => {
    if (!header.sortable) return header.label

    const isCurrentSort = sortColumn === header.key
    const currentDirection = isCurrentSort ? sortDirection : 'none'

    return describeSortState({
      column: header.srLabel || header.label,
      direction: currentDirection,
    })
  }

  // Get sort icon for header
  const getSortIcon = (header: TableHeader): ReactNode => {
    if (!header.sortable) return null

    const isCurrentSort = sortColumn === header.key

    if (!isCurrentSort) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
    }

    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" aria-hidden="true" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" aria-hidden="true" />
    )
  }

  // Handle sort click
  const handleSort = (header: TableHeader) => {
    if (header.sortable && onSort) {
      onSort(header.key)
    }
  }

  // Handle keyboard sort
  const handleKeyDown = (e: React.KeyboardEvent, header: TableHeader) => {
    if ((e.key === 'Enter' || e.key === ' ') && header.sortable) {
      e.preventDefault()
      handleSort(header)
    }
  }

  const resolvedEmptyMessage = emptyMessage ?? t('noData')

  return (
    <div className={`overflow-hidden rounded-xl bg-[var(--bg-default)] shadow-md ${className || ''}`}>
      <div className="overflow-x-auto">
        <table
          className={`w-full ${tableClassName || ''}`}
          aria-busy={isLoading}
        >
          <caption
            className={`px-6 py-4 text-left text-lg font-semibold text-[var(--text-primary)] ${
              captionHidden ? 'sr-only' : ''
            }`}
          >
            {caption}
            {isLoading && (
              <span className="sr-only">, {t('loading')}</span>
            )}
          </caption>

          <thead className="border-b border-[var(--primary)] border-opacity-10 bg-[var(--primary)] bg-opacity-5">
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key}
                  scope={header.scope || 'col'}
                  className={`px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)] ${
                    header.sortable
                      ? 'cursor-pointer select-none hover:bg-[var(--primary)] hover:bg-opacity-10'
                      : ''
                  } ${header.className || ''}`}
                  onClick={() => handleSort(header)}
                  onKeyDown={(e) => handleKeyDown(e, header)}
                  tabIndex={header.sortable ? 0 : undefined}
                  aria-sort={
                    sortColumn === header.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : sortDirection === 'desc'
                          ? 'descending'
                          : 'none'
                      : undefined
                  }
                  role={header.sortable ? 'columnheader button' : 'columnheader'}
                >
                  <div className="flex items-center">
                    <span>{header.label}</span>
                    {getSortIcon(header)}
                    {header.sortable && (
                      <span className="sr-only">, {getSortAriaLabel(header)}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--primary)] divide-opacity-5">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-6 py-12 text-center text-[var(--text-secondary)]"
                >
                  {resolvedEmptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-[var(--primary)] hover:bg-opacity-5 ${
                    row.onClick ? 'cursor-pointer' : ''
                  } ${row.className || ''}`}
                  onClick={row.onClick}
                  tabIndex={row.onClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (row.onClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      row.onClick()
                    }
                  }}
                  role={row.onClick ? 'button' : undefined}
                >
                  {row.cells.map((cell, index) => {
                    const isRowHeader = row.hasRowHeader && index === 0

                    if (isRowHeader) {
                      return (
                        <th
                          key={index}
                          scope="row"
                          className="px-6 py-4 font-medium text-[var(--text-primary)]"
                        >
                          {cell}
                        </th>
                      )
                    }

                    return (
                      <td key={index} className="px-6 py-4 text-[var(--text-primary)]">
                        {cell}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Simple table without sorting, for static data display
 */
export interface SimpleTableProps {
  /** Table caption */
  caption: string
  /** Hide caption visually */
  captionHidden?: boolean
  /** Column headers (strings only) */
  headers: string[]
  /** Rows as arrays of ReactNode */
  rows: ReactNode[][]
  /** Empty message */
  emptyMessage?: string
  /** Container className */
  className?: string
}

export function SimpleTable({
  caption,
  captionHidden = false,
  headers,
  rows,
  emptyMessage = 'No hay datos',
  className,
}: SimpleTableProps): React.ReactElement {
  return (
    <div className={`overflow-hidden rounded-xl bg-[var(--bg-default)] shadow-md ${className || ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className={captionHidden ? 'sr-only' : 'px-6 py-4 text-left text-lg font-semibold'}>
            {caption}
          </caption>
          <thead className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
            <tr>
              {headers.map((header, i) => (
                <th key={i} scope="col" className="px-6 py-3 text-left text-sm font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AccessibleTable
