/**
 * Query Utilities for TanStack React Query
 *
 * RES-001: React Query Migration
 *
 * Provides helper functions for consistent data fetching patterns.
 */

export interface FetcherOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

/**
 * Creates a type-safe fetcher function for use with useQuery
 *
 * @example
 * ```typescript
 * const fetchInventory = createFetcher<InventoryProduct[]>('/api/inventory')
 *
 * useQuery({
 *   queryKey: queryKeys.inventory.list(clinic),
 *   queryFn: () => fetchInventory({ clinic }),
 * })
 * ```
 */
export function createFetcher<T>(
  baseUrl: string,
  defaultOptions: FetcherOptions = {}
): (params?: Record<string, unknown>) => Promise<T> {
  return async (params?: Record<string, unknown>): Promise<T> => {
    const url = new URL(baseUrl, window.location.origin)

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
    }

    const fetchOptions: RequestInit = {
      method: defaultOptions.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...defaultOptions.headers,
      },
    }

    if (defaultOptions.body) {
      fetchOptions.body = JSON.stringify(defaultOptions.body)
    }

    const response = await fetch(url.toString(), fetchOptions)

    if (!response.ok) {
      const errorData = await parseErrorResponse(response, 'fetcher')
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }
}

/**
 * Creates a type-safe mutation function for use with useMutation
 *
 * @example
 * ```typescript
 * const createProduct = createMutationFn<CreateProductInput, Product>('/api/inventory')
 *
 * useMutation({
 *   mutationFn: createProduct,
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
 * })
 * ```
 */
export function createMutationFn<TInput, TOutput>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await parseErrorResponse(response, 'mutation')
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as TOutput
    }

    return response.json()
  }
}

/**
 * Default stale times for different data types
 *
 * Use these to maintain consistency across the app:
 * - Frequently changing data: SHORT (30 seconds)
 * - Moderately changing data: MEDIUM (2 minutes)
 * - Rarely changing data: LONG (10 minutes)
 * - Static/reference data: STATIC (30 minutes)
 */
export const staleTimes = {
  /** For data that changes frequently (e.g., stock levels, appointment status) */
  SHORT: 1000 * 30, // 30 seconds

  /** For data that changes moderately (e.g., dashboards, lists) */
  MEDIUM: 1000 * 60 * 2, // 2 minutes

  /** For data that rarely changes (e.g., categories, services) */
  LONG: 1000 * 60 * 10, // 10 minutes

  /** For static/reference data (e.g., drug database, diagnosis codes) */
  STATIC: 1000 * 60 * 30, // 30 minutes
} as const

/**
 * Default garbage collection times
 */
export const gcTimes = {
  /** Keep in cache briefly */
  SHORT: 1000 * 60 * 5, // 5 minutes

  /** Standard cache duration */
  MEDIUM: 1000 * 60 * 15, // 15 minutes

  /** Extended cache duration */
  LONG: 1000 * 60 * 30, // 30 minutes
} as const

/**
 * Safely parse JSON error response with logging
 *
 * When API returns an error, attempts to parse the JSON body.
 * If parsing fails (e.g., server returned HTML error page), logs the failure
 * and returns an empty object so the caller can use a fallback message.
 *
 * @param response - The fetch Response object
 * @param context - Optional context string for logging (e.g., 'inventory/list')
 * @returns Parsed error object or empty object
 */
export async function parseErrorResponse(
  response: Response,
  context?: string
): Promise<{ error?: string; message?: string; details?: unknown }> {
  try {
    return await response.json()
  } catch (parseError: unknown) {
    // Log the parse failure - this indicates the server returned non-JSON (e.g., HTML error page)
    const parseMessage = parseError instanceof Error ? parseError.message : String(parseError)
    console.warn(
      `[Query${context ? `/${context}` : ''}] Failed to parse error response (status ${response.status}):`,
      parseMessage
    )
    return {}
  }
}

/**
 * Helper to build URL with query parameters
 */
export function buildUrl(base: string, params?: Record<string, unknown>): string {
  if (!params) return base

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)))
      } else {
        searchParams.set(key, String(value))
      }
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${base}?${queryString}` : base
}
