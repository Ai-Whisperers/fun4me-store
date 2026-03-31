/**
 * Request Helpers - Create properly typed NextRequest objects for testing
 *
 * NextRequest extends Request with additional properties like cookies, geo, etc.
 * This module provides helpers to create properly typed requests for API route tests.
 *
 * @example
 * ```typescript
 * import { createNextRequest, createJsonRequest, callRoute } from '@/lib/test-utils';
 *
 * const request = createNextRequest('/api/pets', { method: 'GET' });
 * const postRequest = createJsonRequest('/api/pets', { name: 'Buddy', species: 'dog' });
 *
 * // Call a route handler with a regular Request
 * const response = await callRoute(GET, new Request('http://localhost/api/pets'));
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// Route Handler Wrapper
// =============================================================================

/**
 * Type for Next.js API route handler
 */
export type RouteHandler = (request: NextRequest) => Promise<NextResponse>

/**
 * Type for Next.js API route handler with params
 */
export type RouteHandlerWithParams<P = Record<string, string>> = (
  request: NextRequest,
  context: { params: Promise<P> }
) => Promise<NextResponse>

/**
 * Call a route handler with a Request object (converts to NextRequest internally)
 *
 * This is the preferred way to call route handlers in tests as it handles
 * the Request → NextRequest type conversion automatically.
 *
 * @example
 * ```typescript
 * const response = await callRoute(GET, new Request('http://localhost/api/pets'));
 * const response = await callRoute(POST, new Request('http://localhost/api/pets', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'Buddy' }),
 * }));
 * ```
 */
export async function callRoute(
  handler: RouteHandler,
  request: Request
): Promise<NextResponse> {
  // NextRequest extends Request, so we can cast safely
  return handler(request as unknown as NextRequest)
}

/**
 * Call a route handler with params
 *
 * @example
 * ```typescript
 * const response = await callRouteWithParams(
 *   GET,
 *   new Request('http://localhost/api/pets/123'),
 *   { id: '123' }
 * );
 * ```
 */
export async function callRouteWithParams<P extends Record<string, string>>(
  handler: RouteHandlerWithParams<P>,
  request: Request,
  params: P
): Promise<NextResponse> {
  return handler(request as unknown as NextRequest, {
    params: Promise.resolve(params),
  })
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string | FormData | URLSearchParams
  searchParams?: Record<string, string>
}

/**
 * Create a NextRequest for testing API routes
 *
 * @param path - The URL path (e.g., '/api/pets' or full URL)
 * @param options - Request options
 * @returns NextRequest instance
 */
export function createNextRequest(
  path: string,
  options: RequestOptions = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams } = options

  // Build URL
  let url = path.startsWith('http') ? path : `http://localhost:3000${path}`

  // Add search params if provided
  if (searchParams && Object.keys(searchParams).length > 0) {
    const urlObj = new URL(url)
    Object.entries(searchParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value)
    })
    url = urlObj.toString()
  }

  // Build init object - NextRequest accepts a subset of RequestInit
  const init: {
    method: string
    headers: Headers
    body?: string | FormData | URLSearchParams
  } = {
    method,
    headers: new Headers(headers),
  }

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    init.body = body
  }

  return new NextRequest(url, init)
}

/**
 * Create a NextRequest with JSON body
 *
 * @param path - The URL path
 * @param data - Object to serialize as JSON body
 * @param options - Additional request options
 * @returns NextRequest with Content-Type: application/json
 */
export function createJsonRequest<T extends Record<string, unknown>>(
  path: string,
  data: T,
  options: Omit<RequestOptions, 'body'> = {}
): NextRequest {
  return createNextRequest(path, {
    method: 'POST',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  })
}

/**
 * Create a GET request with query parameters
 *
 * @param path - The URL path
 * @param params - Query parameters
 * @param headers - Optional headers
 * @returns NextRequest with query params
 */
export function createGetRequest(
  path: string,
  params?: Record<string, string>,
  headers?: Record<string, string>
): NextRequest {
  return createNextRequest(path, {
    method: 'GET',
    searchParams: params,
    headers,
  })
}

/**
 * Create a POST request with JSON body
 */
export function createPostRequest<T extends Record<string, unknown>>(
  path: string,
  data: T,
  headers?: Record<string, string>
): NextRequest {
  return createJsonRequest(path, data, { method: 'POST', headers })
}

/**
 * Create a PUT request with JSON body
 */
export function createPutRequest<T extends Record<string, unknown>>(
  path: string,
  data: T,
  headers?: Record<string, string>
): NextRequest {
  return createJsonRequest(path, data, { method: 'PUT', headers })
}

/**
 * Create a PATCH request with JSON body
 */
export function createPatchRequest<T extends Record<string, unknown>>(
  path: string,
  data: T,
  headers?: Record<string, string>
): NextRequest {
  return createJsonRequest(path, data, { method: 'PATCH', headers })
}

/**
 * Create a DELETE request
 */
export function createDeleteRequest(
  path: string,
  params?: Record<string, string>,
  headers?: Record<string, string>
): NextRequest {
  return createNextRequest(path, {
    method: 'DELETE',
    searchParams: params,
    headers,
  })
}

/**
 * Create a request with cron authorization header
 *
 * @param path - The cron endpoint path
 * @param secret - The CRON_SECRET value
 * @param method - HTTP method (default: POST)
 */
export function createCronRequest(
  path: string,
  secret: string = 'test-cron-secret-valid',
  method: 'GET' | 'POST' = 'POST'
): NextRequest {
  return createNextRequest(path, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  })
}

/**
 * Create a request with form data
 *
 * @param path - The URL path
 * @param formData - FormData object
 * @param method - HTTP method (default: POST)
 */
export function createFormDataRequest(
  path: string,
  formData: FormData,
  method: 'POST' | 'PUT' | 'PATCH' = 'POST'
): NextRequest {
  return createNextRequest(path, {
    method,
    body: formData,
  })
}

/**
 * Create route context with params for dynamic routes
 *
 * @param params - Route parameters (e.g., { id: '123' })
 * @returns Context object compatible with Next.js route handlers
 */
export function createRouteContext<P extends Record<string, string>>(
  params: P
): { params: Promise<P> } {
  return {
    params: Promise.resolve(params),
  }
}
