/**
 * CORS middleware
 * Handles Cross-Origin Resource Sharing for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'

export interface CORSOptions {
  origin?: string | string[] | ((origin: string) => boolean)
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
  optionsSuccessStatus?: number
}

const defaultOptions: Required<CORSOptions> = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: [],
  credentials: false,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204,
}

export function withCORS(options: CORSOptions = {}) {
  const config = { ...defaultOptions, ...options }

  return async function middleware(request: NextRequest) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, config)
    }

    // Handle actual requests
    const response = NextResponse.next()
    setCORSHeaders(response, request, config)

    return response
  }
}

function handlePreflight(request: NextRequest, config: Required<CORSOptions>): NextResponse {
  const response = new NextResponse(null, { status: config.optionsSuccessStatus })
  setCORSHeaders(response, request, config)
  return response
}

function setCORSHeaders(
  response: NextResponse,
  request: NextRequest,
  config: Required<CORSOptions>
): void {
  const origin = request.headers.get('origin')

  // Set allowed origin
  if (config.origin === '*') {
    response.headers.set('Access-Control-Allow-Origin', '*')
  } else if (typeof config.origin === 'string') {
    response.headers.set('Access-Control-Allow-Origin', config.origin)
  } else if (Array.isArray(config.origin)) {
    if (origin && config.origin.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
  } else if (typeof config.origin === 'function') {
    if (origin && config.origin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
  }

  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '))
  response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '))

  if (config.exposedHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '))
  }

  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  if (config.maxAge > 0) {
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString())
  }
}

// Pre-configured CORS middleware for different environments
// Uses APP_URL from environment config for production origin
const productionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vetic.app'
export const apiCORS = withCORS({
  origin:
    process.env.NODE_ENV === 'production'
      ? [productionUrl, productionUrl.replace('https://', 'https://www.')]
      : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  credentials: false,
  maxAge: 86400,
})

export const webhookCORS = withCORS({
  origin: '*', // Webhooks may come from various sources
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Webhook-Signature', 'X-Request-ID'],
  credentials: false,
  maxAge: 3600,
})
