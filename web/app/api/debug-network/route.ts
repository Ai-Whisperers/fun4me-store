import { NextResponse } from 'next/server'

/**
 * Debug Network Endpoint - DEVELOPMENT ONLY
 *
 * This endpoint is disabled in production for security.
 * It was used to test network connectivity during development.
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const results = {
    google: { status: 'pending', error: null as string | null },
    supabase: { status: 'pending', error: null as string | null },
    env: {
      node: process.version,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    },
  }

  try {
    const res = await fetch('https://www.google.com', { method: 'HEAD' })
    results.google = { status: `ok (${res.status})`, error: null }
  } catch (e: unknown) {
    results.google = { status: 'failed', error: e instanceof Error ? e.message : String(e) }
  }

  try {
    // Use environment variable instead of hardcoded URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const res = await fetch(supabaseUrl, { method: 'HEAD' })
      results.supabase = { status: `ok (${res.status})`, error: null }
    } else {
      results.supabase = { status: 'skipped', error: 'No Supabase URL configured' }
    }
  } catch (e: unknown) {
    results.supabase = { status: 'failed', error: e instanceof Error ? e.message : String(e) }
  }

  return NextResponse.json(results)
}

export const dynamic = 'force-dynamic'
