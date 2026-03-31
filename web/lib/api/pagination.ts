/**
 * Standardized API pagination utilities
 * API-003: Create Standardized Pagination
 *
 * IMPORTANT: All API routes should use these utilities to enforce
 * pagination limits and prevent DoS attacks via large limit values.
 */

import { z } from 'zod'

/** Maximum allowed items per page to prevent DoS */
export const MAX_PAGE_SIZE = 100

/** Default page size when not specified */
export const DEFAULT_PAGE_SIZE = 20

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

/**
 * Clamp a limit value to the maximum allowed page size.
 * Use this in routes that don't use the full parsePagination utility.
 *
 * @param limit - The requested limit
 * @param defaultLimit - Default if not provided (default: 20)
 * @returns Clamped limit between 1 and MAX_PAGE_SIZE
 *
 * @example
 * ```typescript
 * const limit = clampLimit(parseInt(searchParams.get('limit') || '10'))
 * ```
 */
export function clampLimit(limit: number | string | null | undefined, defaultLimit = DEFAULT_PAGE_SIZE): number {
  if (limit === null || limit === undefined) {
    return Math.min(defaultLimit, MAX_PAGE_SIZE)
  }
  const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit
  if (isNaN(parsed) || parsed < 1) {
    return Math.min(defaultLimit, MAX_PAGE_SIZE)
  }
  return Math.min(parsed, MAX_PAGE_SIZE)
}

/**
 * Parse page number from request, with bounds checking.
 *
 * @param page - The requested page
 * @param defaultPage - Default if not provided (default: 1)
 * @returns Valid page number (minimum 1)
 */
export function parsePage(page: number | string | null | undefined, defaultPage = 1): number {
  if (page === null || page === undefined) {
    return Math.max(defaultPage, 1)
  }
  const parsed = typeof page === 'string' ? parseInt(page, 10) : page
  if (isNaN(parsed) || parsed < 1) {
    return Math.max(defaultPage, 1)
  }
  return parsed
}

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Parse pagination parameters from URL search params
 *
 * @param searchParams - URL search params
 * @returns Pagination parameters with offset calculated
 *
 * @example
 * ```typescript
 * const { searchParams } = new URL(request.url);
 * const { page, limit, offset } = parsePagination(searchParams);
 * ```
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const result = paginationSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  const { page, limit } = result.success ? result.data : { page: 1, limit: 20 }
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Create a paginated response with metadata
 *
 * @param data - Array of data items for current page
 * @param total - Total number of items across all pages
 * @param params - Pagination parameters used for the query
 * @returns Paginated response with metadata
 *
 * @example
 * ```typescript
 * const { data, error, count } = await supabase
 *   .from('clients')
 *   .select('*', { count: 'exact' })
 *   .range(offset, offset + limit - 1);
 *
 * return NextResponse.json(paginatedResponse(data, count, { page, limit, offset }));
 * ```
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { page, limit } = params
  const pages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  }
}
