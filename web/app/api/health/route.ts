import { NextResponse } from 'next/server'

/**
 * Health check endpoint for uptime monitoring
 * Returns basic system status and performance metrics
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Basic health checks
    const checks: {
      timestamp: string
      uptime: number
      memory: NodeJS.MemoryUsage
      env: string
      version: string
      node: string
      database?: { status: string; responseTime: number; error?: string }
    } = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || 'unknown',
      node: process.version,
    }

    // Database connectivity check (basic ping)
    // Using a simple query that should work with our Supabase setup
    const dbStart = Date.now()
    
    // Simple check - just verify we can create a client
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Try a simple query that doesn't depend on specific tables
      await supabase.from('dummy').select('*').limit(1)
      
      checks.database = {
        status: 'connected',
        responseTime: Date.now() - dbStart,
      }
    } catch (dbError) {
      checks.database = {
        status: 'error',
        responseTime: Date.now() - dbStart,
        error: 'Connection failed',
      }
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        status: 'healthy',
        responseTime,
        checks,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

export async function HEAD() {
  // Minimal health check for uptime monitoring tools
  return new Response(null, { status: 200 })
}