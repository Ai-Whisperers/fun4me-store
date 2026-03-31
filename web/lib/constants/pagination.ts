/**
 * Pagination Constants - Single Source of Truth
 *
 * All pagination-related constants and defaults.
 * Import from here to ensure consistency across API routes and components.
 *
 * @example
 * ```typescript
 * import { PAGINATION, clampPageSize } from '@/lib/constants/pagination'
 *
 * const limit = clampPageSize(requestedLimit)
 * ```
 */

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

export const PAGINATION = {
  /** Default page size for list endpoints */
  DEFAULT_PAGE_SIZE: 20,

  /** Minimum page size allowed */
  MIN_PAGE_SIZE: 1,

  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,

  /** Default page number (1-indexed) */
  DEFAULT_PAGE: 1,

  /** Page sizes available in UI dropdowns */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const

// =============================================================================
// CONTEXT-SPECIFIC DEFAULTS
// =============================================================================

export const PAGINATION_CONTEXTS = {
  /** Dashboard tables */
  DASHBOARD: {
    defaultSize: 10,
    maxSize: 50,
  },

  /** Search results */
  SEARCH: {
    defaultSize: 20,
    maxSize: 100,
  },

  /** Infinite scroll */
  INFINITE_SCROLL: {
    defaultSize: 20,
    maxSize: 50,
  },

  /** Dropdown/autocomplete */
  DROPDOWN: {
    defaultSize: 10,
    maxSize: 25,
  },

  /** Export operations */
  EXPORT: {
    defaultSize: 100,
    maxSize: 1000,
  },

  /** Mobile views */
  MOBILE: {
    defaultSize: 10,
    maxSize: 25,
  },
} as const

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clamp page size to valid range
 * @param size - Requested page size
 * @param max - Maximum allowed (defaults to PAGINATION.MAX_PAGE_SIZE)
 * @param min - Minimum allowed (defaults to PAGINATION.MIN_PAGE_SIZE)
 */
export function clampPageSize(
  size: number | string | null | undefined,
  max: number = PAGINATION.MAX_PAGE_SIZE,
  min: number = PAGINATION.MIN_PAGE_SIZE
): number {
  const parsed = typeof size === 'string' ? parseInt(size, 10) : size
  if (parsed === null || parsed === undefined || isNaN(parsed)) {
    return PAGINATION.DEFAULT_PAGE_SIZE
  }
  return Math.min(Math.max(parsed, min), max)
}

/**
 * Parse page number from request
 * @param page - Requested page (1-indexed)
 */
export function parsePage(page: number | string | null | undefined): number {
  const parsed = typeof page === 'string' ? parseInt(page, 10) : page
  if (parsed === null || parsed === undefined || isNaN(parsed) || parsed < 1) {
    return PAGINATION.DEFAULT_PAGE
  }
  return parsed
}

/**
 * Calculate offset for database query
 * @param page - Page number (1-indexed)
 * @param limit - Page size
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Calculate Supabase range parameters
 * @param page - Page number (1-indexed)
 * @param limit - Page size
 * @returns { from, to } for .range()
 */
export function calculateRange(page: number, limit: number): { from: number; to: number } {
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { from, to }
}

/**
 * Parse pagination from URL search params
 * @param searchParams - URLSearchParams or query object
 */
export function parsePagination(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): {
  page: number
  limit: number
  offset: number
  from: number
  to: number
} {
  let pageStr: string | null | undefined
  let limitStr: string | null | undefined

  if (searchParams instanceof URLSearchParams) {
    pageStr = searchParams.get('page')
    limitStr = searchParams.get('limit') ?? searchParams.get('per_page') ?? searchParams.get('pageSize')
  } else {
    pageStr = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page
    limitStr =
      Array.isArray(searchParams.limit) ? searchParams.limit[0] :
      Array.isArray(searchParams.per_page) ? searchParams.per_page[0] :
      Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] :
      (searchParams.limit ?? searchParams.per_page ?? searchParams.pageSize) as string | undefined
  }

  const page = parsePage(pageStr)
  const limit = clampPageSize(limitStr)
  const offset = calculateOffset(page, limit)
  const { from, to } = calculateRange(page, limit)

  return { page, limit, offset, from, to }
}

/**
 * Build pagination metadata for response
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
} {
  const totalPages = Math.ceil(total / limit)
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Cursor-based pagination (for infinite scroll)
 */
export interface CursorPaginatedResponse<T> {
  data: T[]
  meta: {
    nextCursor: string | null
    hasMore: boolean
  }
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PageSizeOption = typeof PAGINATION.PAGE_SIZE_OPTIONS[number]
export type PaginationContext = keyof typeof PAGINATION_CONTEXTS
