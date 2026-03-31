/**
 * Helper Types for API and Database Operations
 */

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

export interface ApiListResponse<T> {
  data: T[]
  error: string | null
  count: number
  page: number
  totalPages: number
}
