/**
 * Consistent API response patterns
 * Standardized response formats across all API endpoints
 */

import { NextResponse } from 'next/server'
import type { SuccessResponse } from '@/lib/errors'

// Standard response types
export interface ListResponse<T> extends SuccessResponse<T[]> {
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SingleResponse<T> extends SuccessResponse<T> {}

export interface MutationResponse extends SuccessResponse<{ id: string }> {}

export interface DeleteResponse extends SuccessResponse<null> {}

// Response helper functions
export class ApiResponses {
  /**
   * Success response with data
   */
  static success<T>(
    data: T,
    message?: string,
    status: number = 200
  ): NextResponse<SingleResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        ...(message && { message }),
      },
      { status }
    )
  }

  /**
   * Success response for creation (201)
   */
  static created<T>(data: T, message?: string): NextResponse<SingleResponse<T>> {
    return this.success(data, message, 201)
  }

  /**
   * Success response for deletion (204)
   */
  static deleted(message?: string): NextResponse<DeleteResponse> {
    return NextResponse.json(
      {
        success: true,
        data: null,
        ...(message && { message }),
      },
      { status: 204 }
    )
  }

  /**
   * Success response for updates (200)
   */
  static updated<T>(data: T, message?: string): NextResponse<SingleResponse<T>> {
    return this.success(data, message, 200)
  }

  /**
   * List response with pagination
   */
  static list<T>(
    items: T[],
    pagination: {
      total: number
      page: number
      limit: number
    },
    message?: string
  ): NextResponse<ListResponse<T>> {
    const { total, page, limit } = pagination
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: items,
      ...(message && { message }),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  }

  /**
   * Empty list response
   */
  static emptyList<T>(
    pagination: {
      total: number
      page: number
      limit: number
    },
    message?: string
  ): NextResponse<ListResponse<T>> {
    return this.list([], pagination, message)
  }

  /**
   * Mutation response (create/update)
   */
  static mutation(
    id: string,
    message?: string,
    status: number = 200
  ): NextResponse<MutationResponse> {
    return NextResponse.json(
      {
        success: true,
        data: { id },
        ...(message && { message }),
      },
      { status }
    )
  }

  /**
   * No content response (for actions that don't return data)
   */
  static noContent(message?: string): NextResponse<SuccessResponse<null>> {
    return NextResponse.json(
      {
        success: true,
        data: null,
        ...(message && { message }),
      },
      { status: 204 }
    )
  }

  /**
   * Accepted response (for async operations)
   */
  static accepted<T = unknown>(data?: T, message?: string): NextResponse<SuccessResponse<T | null>> {
    return NextResponse.json(
      {
        success: true,
        data: data ?? null,
        ...(message && { message }),
      },
      { status: 202 }
    )
  }

  // Error responses are handled by the error system
}

// Pagination helper
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export class Pagination {
  static DEFAULT_LIMIT = 20
  static MAX_LIMIT = 100

  static parse(params: URLSearchParams): PaginationParams {
    const page = Math.max(1, parseInt(params.get('page') || '1'))
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, parseInt(params.get('limit') || this.DEFAULT_LIMIT.toString()))
    )

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    }
  }

  static getMeta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  }
}

// Sorting helper
export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}

export class Sorting {
  static parse(params: URLSearchParams, defaultField: string = 'created_at'): SortParams {
    const sort = params.get('sort') || `${defaultField}:desc`
    const [field, direction = 'desc'] = sort.split(':')

    return {
      field,
      direction: direction.toLowerCase() === 'asc' ? 'asc' : 'desc',
    }
  }

  static toOrderBy(sort: SortParams): string {
    return `${sort.field}.${sort.direction}`
  }
}
