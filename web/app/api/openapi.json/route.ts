/**
 * OpenAPI JSON Specification Endpoint
 *
 * OPS-001: Serves the OpenAPI 3.0 specification as JSON
 *
 * GET /api/openapi.json - Returns the full OpenAPI spec
 */

import { NextResponse } from 'next/server'
import { getApiSpec } from '@/lib/api/openapi'

export async function GET() {
  const spec = getApiSpec()

  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  })
}
