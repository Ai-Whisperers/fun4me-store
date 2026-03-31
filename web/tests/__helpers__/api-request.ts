/**
 * API Request Helper for Testing
 *
 * Provides consistent API request functionality for both authenticated
 * and unauthenticated testing scenarios.
 */

import { createMockAuthState } from '../__mocks__/auth-state'
import { EndpointSpec } from '../generators/permission-test-generator'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  status?: number
  headers?: Record<string, string>
}

export interface RequestOptions {
  body?: any
  headers?: Record<string, string>
  params?: Record<string, string>
  timeout?: number
}

/**
 * Base URL for API requests
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Make authenticated API request
 */
export async function makeAuthenticatedRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const authState = createMockAuthState()
  const headers = {
    ...authState.getAllHeaders(),
    ...options.headers,
  }

  return makeApiRequest<T>(method, path, {
    ...options,
    headers,
  })
}

/**
 * Make unauthenticated API request
 */
export async function makeRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  return makeApiRequest<T>(method, path, {
    ...options,
    headers,
  })
}

/**
 * Core API request function
 */
async function makeApiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions
): Promise<ApiResponse<T>> {
  try {
    const url = new URL(path, API_BASE_URL)
    const { body, headers, timeout = 30000 } = options

    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout),
    }

    // Add body for relevant methods
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      requestOptions.body = JSON.stringify(body)
    }

    // Make the request
    const response = await fetch(url.toString(), requestOptions)
    const responseData = await response.json().catch(() => null)

    return {
      data: responseData?.data || responseData,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    }
  } catch (error) {
    // Handle network errors, timeouts, etc.
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 0,
    }
  }
}

/**
 * Make request using endpoint specification
 */
export async function makeEndpointRequest<T = any>(
  spec: EndpointSpec,
  customBody?: any,
  customParams?: Record<string, string>
): Promise<ApiResponse<T>> {
  // Resolve dynamic request body
  const requestBody = customBody || (
    typeof spec.requestBody === 'function' ? spec.requestBody() : spec.requestBody
  )

  // Resolve dynamic path parameters
  let path = spec.path
  const params = { ...spec.pathParams, ...customParams }

  for (const [key, value] of Object.entries(params)) {
    const resolvedValue = typeof value === 'function' ? value() : value
    path = path.replace(`:${key}`, resolvedValue)
  }

  // Determine if authenticated or not
  const authState = createMockAuthState()
  
  if (authState.isAuthenticated()) {
    return makeAuthenticatedRequest<T>(spec.method, path, {
      body: requestBody,
    })
  } else {
    return makeRequest<T>(spec.method, path, {
      body: requestBody,
    })
  }
}

/**
 * Make a series of permission tests for an endpoint
 */
export async function testEndpointPermissions<T = any>(
  spec: EndpointSpec
): Promise<{
  unauthenticated: ApiResponse<T>
  owner: ApiResponse<T>
  vet: ApiResponse<T>
  admin: ApiResponse<T>
}> {
  const authState = createMockAuthState()
  const results = {} as any

  // Test unauthenticated
  authState.setAuthScenario('UNAUTHENTICATED')
  results.unauthenticated = await makeEndpointRequest<T>(spec)

  // Test owner role
  authState.setAuthScenario('OWNER')
  results.owner = await makeEndpointRequest<T>(spec)

  // Test vet role
  authState.setAuthScenario('VET')
  results.vet = await makeEndpointRequest<T>(spec)

  // Test admin role
  authState.setAuthScenario('ADMIN')
  results.admin = await makeEndpointRequest<T>(spec)

  return results
}

/**
 * Create resource for testing ownership scenarios
 */
export async function createTestResource<T = any>(
  endpoint: EndpointSpec,
  resourceData: any,
  ownerAuth: 'OWNER' | 'VET' | 'ADMIN' = 'OWNER'
): Promise<{ resource: T; response: ApiResponse<T> }> {
  const authState = createMockAuthState()
  authState.setAuthScenario(ownerAuth)

  const response = await makeEndpointRequest<T>(endpoint, resourceData)

  return {
    resource: response.data,
    response,
  }
}

/**
 * Test cross-owner access scenarios
 */
export async function testCrossOwnerAccess<T = any>(
  spec: EndpointSpec,
  resourceId: string
): Promise<ApiResponse<T>> {
  const authState = createMockAuthState()
  
  // Create a resource owned by different owner
  const differentOwnerResource = await createTestResource(
    spec,
    { owner_id: 'different-owner-id', tenant_id: 'different-tenant' },
    'ADMIN' // Admin can create resources for any tenant
  )

  // Try to access with original owner
  authState.setAuthScenario('OWNER')

  // Override path parameter to target different owner's resource
  const customParams = { [spec.ownershipCheck?.field || 'id']: resourceId }

  return makeEndpointRequest<T>(spec, undefined, customParams)
}

/**
 * Batch test multiple endpoints
 */
export async function testEndpointBatch<T = any>(
  specs: EndpointSpec[],
  parallel: boolean = true
): Promise<{ spec: EndpointSpec; result: ApiResponse<T> }[]> {
  if (parallel) {
    const promises = specs.map(spec => 
      makeEndpointRequest<T>(spec)
    )
    const results = await Promise.all(promises)
    
    return specs.map((spec, index) => ({
      spec,
      result: results[index],
    }))
  } else {
    const results = []
    
    for (const spec of specs) {
      const result = await makeEndpointRequest<T>(spec)
      results.push({ spec, result })
    }
    
    return results
  }
}

/**
 * Helper for testing pagination
 */
export async function testPagination<T = any>(
  spec: EndpointSpec,
  options: {
    page?: number
    limit?: number
    sort?: string
    direction?: 'asc' | 'desc'
  } = {}
): Promise<ApiResponse<T>> {
  const params = {
    page: String(options.page || 1),
    limit: String(options.limit || 20),
    sort: options.sort || 'created_at',
    direction: options.direction || 'desc',
  }

  return makeEndpointRequest<T>(spec, undefined, params)
}

/**
 * Helper for testing search functionality
 */
export async function testSearch<T = any>(
  spec: EndpointSpec,
  query: string,
  searchFields?: string[]
): Promise<ApiResponse<T>> {
  const body = {
    query,
    search_fields: searchFields || ['name', 'description'],
    limit: 50,
  }

  return makeEndpointRequest<T>(spec, body)
}

/**
 * Helper for testing file uploads
 */
export async function testFileUpload<T = any>(
  spec: EndpointSpec,
  file: {
    name: string
    type: string
    size: number
    data: ArrayBuffer | string
  },
  additionalData: Record<string, any> = {}
): Promise<ApiResponse<T>> {
  const formData = new FormData()
  
  // Add file
  const fileBlob = new Blob([file.data], { type: file.type })
  formData.append('file', fileBlob, file.name)
  
  // Add additional data
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, JSON.stringify(value))
  })

  const authState = createMockAuthState()
  const url = new URL(spec.path, API_BASE_URL)

  const response = await fetch(url.toString(), {
    method: spec.method,
    headers: authState.getAllHeaders(),
    body: formData,
    signal: AbortSignal.timeout(60000), // Longer timeout for file uploads
  })

  const responseData = await response.json().catch(() => null)

  return {
    data: responseData?.data || responseData,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  }
}

/**
 * Helper for testing rate limiting
 */
export async function testRateLimit<T = any>(
  spec: EndpointSpec,
  requestCount: number = 10,
  intervalMs: number = 100
): Promise<ApiResponse<T>[]> {
  const results: ApiResponse<T>[] = []

  for (let i = 0; i < requestCount; i++) {
    const result = await makeEndpointRequest<T>(spec)
    results.push(result)

    // Wait between requests
    if (i < requestCount - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  return results
}

/**
 * Assert response helpers for tests
 */
export const expectResponse = {
  toBeSuccessful: <T>(response: ApiResponse<T>) => {
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(300)
    expect(response.data).toBeDefined()
    expect(response.error).toBeUndefined()
  },

  toBeUnauthorized: <T>(response: ApiResponse<T>) => {
    expect(response.status).toBe(401)
    expect(response.data).toBeUndefined()
    expect(response.error).toBeDefined()
    expect(response.error).toContain('No autorizado')
  },

  toBeForbidden: <T>(response: ApiResponse<T>) => {
    expect([403, 404]).toContain(response.status)
    expect(response.data).toBeUndefined()
    expect(response.error).toBeDefined()
    expect(response.error).toContain('No autorizado')
  },

  toBeNotFound: <T>(response: ApiResponse<T>) => {
    expect(response.status).toBe(404)
    expect(response.data).toBeUndefined()
    expect(response.error).toBeDefined()
  },

  toBeBadRequest: <T>(response: ApiResponse<T>) => {
    expect(response.status).toBe(400)
    expect(response.data).toBeUndefined()
    expect(response.error).toBeDefined()
  },

  toBeCreated: <T>(response: ApiResponse<T>) => {
    expect(response.status).toBe(201)
    expect(response.data).toBeDefined()
    expect(response.error).toBeUndefined()
  },

  toBeNoContent: <T>(response: ApiResponse<T>) => {
    expect(response.status).toBe(204)
  },

  toBePaginated: <T>(response: ApiResponse<T>) => {
    expect(response.data).toBeDefined()
    expect(response.data).toHaveProperty('data')
    expect(response.data).toHaveProperty('pagination')
    expect(typeof response.data.data).toBe('object')
  },

  toContainResource: <T>(response: ApiResponse<T>, resource: any) => {
    expectResponse.toBeSuccessful(response)
    if (Array.isArray(response.data?.data)) {
      expect(response.data.data).toContainEqual(resource)
    }
  },

  toContainExactly: <T>(response: ApiResponse<T>, count: number) => {
    expectResponse.toBeSuccessful(response)
    expect(Array.isArray(response.data?.data)).toBe(true)
    expect(response.data.data).toHaveLength(count)
  },
}

/**
 * Helper for testing data leaks
 */
export const expectDataSanitization = {
  noPasswords: <T>(response: ApiResponse<T>) => {
    const responseStr = JSON.stringify(response.data)
    expect(responseStr).not.toMatch(/password/i)
    expect(responseStr).not.toMatch(/secret/i)
    expect(responseStr).not.toMatch(/token/i)
    expect(responseStr).not.toMatch(/key/i)
  },

  noSensitiveFields: <T>(response: ApiResponse<T>, sensitiveFields: string[]) => {
    const responseStr = JSON.stringify(response.data)
    
    for (const field of sensitiveFields) {
      expect(responseStr).not.toContain(`"${field}":`)
    }
  },

  noEmails: <T>(response: ApiResponse<T>) => {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const responseStr = JSON.stringify(response.data)
    const emails = responseStr.match(emailPattern) || []
    expect(emails.length).toBe(0)
  },

  noPhoneNumbers: <T>(response: ApiResponse<T>) => {
    const phonePattern = /\b(?:\+?(\d{1,3}))?[-. (]?(\d{3})[-. ]?(\d{3})[-. ]?(\d{4})\b/g
    const responseStr = JSON.stringify(response.data)
    const phones = responseStr.match(phonePattern) || []
    expect(phones.length).toBe(0)
  },
}