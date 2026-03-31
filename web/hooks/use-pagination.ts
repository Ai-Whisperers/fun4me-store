'use client'

import { useState, useMemo, useCallback } from 'react'

/**
 * Options for usePagination hook
 */
export interface UsePaginationOptions {
  /** Number of items per page. Default: 10 */
  pageSize?: number
  /** Initial page number (1-indexed). Default: 1 */
  initialPage?: number
  /** Array of available page size options */
  pageSizeOptions?: number[]
}

/**
 * Return type for usePagination hook
 */
export interface UsePaginationReturn<T> {
  /** Current page items */
  items: T[]
  /** Current page number (1-indexed) */
  page: number
  /** Set current page */
  setPage: (page: number) => void
  /** Go to next page */
  nextPage: () => void
  /** Go to previous page */
  prevPage: () => void
  /** Go to first page */
  firstPage: () => void
  /** Go to last page */
  lastPage: () => void
  /** Whether there is a next page */
  hasNext: boolean
  /** Whether there is a previous page */
  hasPrev: boolean
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  totalItems: number
  /** Current page size */
  pageSize: number
  /** Set page size */
  setPageSize: (size: number) => void
  /** Available page size options */
  pageSizeOptions: number[]
  /** Start index of current page (0-indexed) */
  startIndex: number
  /** End index of current page (0-indexed, exclusive) */
  endIndex: number
  /** Array of page numbers for pagination controls */
  pageNumbers: number[]
}

/**
 * Custom hook to handle pagination of data arrays.
 * Provides a complete pagination solution with page size control and navigation.
 *
 * @example
 * ```tsx
 * const {
 *   items: paginatedPets,
 *   page,
 *   setPage,
 *   totalPages,
 *   hasNext,
 *   hasPrev,
 *   nextPage,
 *   prevPage,
 *   pageSize,
 *   setPageSize,
 *   startIndex,
 *   totalItems,
 * } = usePagination(filteredPets, { pageSize: 10 });
 *
 * // In JSX
 * <div>
 *   <p>Mostrando {startIndex + 1}-{startIndex + items.length} de {totalItems}</p>
 *
 *   {paginatedPets.map(pet => <PetCard key={pet.id} pet={pet} />)}
 *
 *   <div className="flex gap-2">
 *     <button onClick={prevPage} disabled={!hasPrev}>Anterior</button>
 *     <span>Página {page} de {totalPages}</span>
 *     <button onClick={nextPage} disabled={!hasNext}>Siguiente</button>
 *   </div>
 *
 *   <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
 *     <option value={10}>10 por página</option>
 *     <option value={25}>25 por página</option>
 *     <option value={50}>50 por página</option>
 *   </select>
 * </div>
 * ```
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const {
    pageSize: initialPageSize = 10,
    initialPage = 1,
    pageSizeOptions = [10, 25, 50, 100],
  } = options

  const [page, setPageState] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure page is within valid range when items or pageSize changes
  const validPage = useMemo(() => {
    if (page < 1) return 1
    if (page > totalPages) return totalPages
    return page
  }, [page, totalPages])

  // Calculate indices
  const startIndex = (validPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  // Get current page items
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  // Navigation helpers
  const hasNext = validPage < totalPages
  const hasPrev = validPage > 1

  const setPage = useCallback(
    (newPage: number) => {
      const clamped = Math.max(1, Math.min(newPage, totalPages))
      setPageState(clamped)
    },
    [totalPages]
  )

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPageState((p) => p + 1)
    }
  }, [hasNext])

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setPageState((p) => p - 1)
    }
  }, [hasPrev])

  const firstPage = useCallback(() => {
    setPageState(1)
  }, [])

  const lastPage = useCallback(() => {
    setPageState(totalPages)
  }, [totalPages])

  // Page size change resets to page 1
  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize)
    setPageState(1)
  }, [])

  // Generate page numbers for pagination controls
  // Shows: 1 ... 4 5 [6] 7 8 ... 20
  const pageNumbers = useMemo(() => {
    const delta = 2 // Number of pages to show on each side of current
    const range: number[] = []
    const rangeWithDots: number[] = []

    for (
      let i = Math.max(2, validPage - delta);
      i <= Math.min(totalPages - 1, validPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (validPage - delta > 2) {
      rangeWithDots.push(1, -1) // -1 represents "..."
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (validPage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    // Remove duplicates while preserving order
    return [...new Set(rangeWithDots)]
  }, [validPage, totalPages])

  return {
    items: paginatedItems,
    page: validPage,
    setPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    hasNext,
    hasPrev,
    totalPages,
    totalItems,
    pageSize,
    setPageSize,
    pageSizeOptions,
    startIndex,
    endIndex,
    pageNumbers,
  }
}

/**
 * Pagination info component props helper
 * Returns a formatted string for pagination info display
 *
 * @example
 * ```tsx
 * const { startIndex, endIndex, totalItems } = usePagination(items);
 * <p>{getPaginationInfo(startIndex, endIndex, totalItems)}</p>
 * // "Mostrando 1-10 de 100 resultados"
 * ```
 */
export function getPaginationInfo(
  startIndex: number,
  endIndex: number,
  totalItems: number
): string {
  if (totalItems === 0) {
    return 'No hay resultados'
  }
  return `Mostrando ${startIndex + 1}-${endIndex} de ${totalItems} resultados`
}
