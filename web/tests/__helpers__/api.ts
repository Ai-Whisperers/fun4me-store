/**
 * API Test Helpers
 *
 * Utilities for testing API routes and server actions.
 */


/**
 * HTTP Methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Create a mock NextRequest for API route testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: HttpMethod
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): Request {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  // Build request options
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  return new Request(urlObj.toString(), requestInit)
}

/**
 * Create mock request with authentication
 */
export function createAuthenticatedRequest(
  url: string,
  accessToken: string,
  options: {
    method?: HttpMethod
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): Request {
  return createMockRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

/**
 * Parse API response
 */
export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ data: T | null; error: string | null; status: number }> {
  const status = response.status

  try {
    const data = await response.json()

    if (status >= 400) {
      return {
        data: null,
        error: data.error || data.message || 'Unknown error',
        status,
      }
    }

    return { data: data as T, error: null, status }
  } catch (_error: unknown) {
    return {
      data: null,
      error: 'Failed to parse response',
      status,
    }
  }
}

/**
 * API test result interface
 */
export interface ApiTestResult<T = unknown> {
  data: T | null
  error: string | null
  status: number
  headers: Headers
}

/**
 * Execute API route handler and parse response
 */
export async function testApiRoute<T = unknown>(
  handler: (req: Request) => Promise<Response>,
  request: Request
): Promise<ApiTestResult<T>> {
  const response = await handler(request)
  const { data, error, status } = await parseResponse<T>(response)

  return {
    data,
    error,
    status,
    headers: response.headers,
  }
}

/**
 * Common API assertions
 */
export const apiAssertions = {
  /**
   * Assert successful response (2xx)
   */
  isSuccess(result: ApiTestResult): void {
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Expected success status, got ${result.status}: ${result.error}`)
    }
  },

  /**
   * Assert error response (4xx or 5xx)
   */
  isError(result: ApiTestResult, expectedStatus?: number): void {
    if (result.status < 400) {
      throw new Error(`Expected error status, got ${result.status}`)
    }
    if (expectedStatus && result.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${result.status}`)
    }
  },

  /**
   * Assert unauthorized (401)
   */
  isUnauthorized(result: ApiTestResult): void {
    if (result.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${result.status}`)
    }
  },

  /**
   * Assert forbidden (403)
   */
  isForbidden(result: ApiTestResult): void {
    if (result.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${result.status}`)
    }
  },

  /**
   * Assert not found (404)
   */
  isNotFound(result: ApiTestResult): void {
    if (result.status !== 404) {
      throw new Error(`Expected 404 Not Found, got ${result.status}`)
    }
  },

  /**
   * Assert bad request (400)
   */
  isBadRequest(result: ApiTestResult): void {
    if (result.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${result.status}`)
    }
  },
}

/**
 * Mock NextResponse for testing
 */
export const mockNextResponse = {
  json: (body: unknown, init?: ResponseInit) => ({
    status: init?.status || 200,
    json: async () => body,
    headers: new Headers(init?.headers),
  }),
}

/**
 * Test API endpoints in sequence
 */
export async function testApiSequence(
  steps: Array<{
    name: string
    request: Request
    handler: (req: Request) => Promise<Response>
    validate: (result: ApiTestResult) => void
  }>
): Promise<void> {
  for (const step of steps) {
    try {
      const result = await testApiRoute(step.handler, step.request)
      step.validate(result)
    } catch (error) {
      throw new Error(
        `API sequence failed at step "${step.name}": ${error instanceof Error ? error.message : error}`
      )
    }
  }
}

/**
 * Generate mock API endpoint URLs
 */
export const API_URLS = {
  pets: '/api/pets',
  pet: (id: string) => `/api/pets/${id}`,
  booking: '/api/booking',
  appointment: (id: string) => `/api/booking/${id}`,
  diagnosisCodes: '/api/diagnosis_codes',
  drugDosages: '/api/drug_dosages',
  epidemiology: '/api/epidemiology',
  euthanasiaAssessments: '/api/euthanasia_assessments',
  finance: '/api/finance',
  growthCharts: '/api/growth_charts',
  growthStandards: '/api/growth_standards',
  inventory: '/api/inventory',
  loyaltyPoints: '/api/loyalty_points',
  prescriptions: '/api/prescriptions',
  reproductiveCycles: '/api/reproductive_cycles',
  store: '/api/store',
  vaccineReactions: '/api/vaccine_reactions',
}

/**
 * Create paginated request params
 */
export function createPaginationParams(
  page: number = 1,
  limit: number = 10,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): Record<string, string> {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  }

  if (sortBy) {
    params.sortBy = sortBy
    params.sortOrder = sortOrder
  }

  return params
}

/**
 * Create filter params
 */
export function createFilterParams(
  filters: Record<string, string | number | boolean>
): Record<string, string> {
  const params: Record<string, string> = {}

  Object.entries(filters).forEach(([key, value]) => {
    params[key] = String(value)
  })

  return params
}
