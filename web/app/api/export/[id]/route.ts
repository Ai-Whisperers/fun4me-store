/**
 * Export Job Detail API
 *
 * GET /api/export/[id] - Get export job status and download URL
 *
 * DATA-002: Individual export job status endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExportJob } from '@/lib/export'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const supabase = await createClient()
  const { id: jobId } = await context.params

  // Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get export job
  const job = await getExportJob(jobId, user.id)

  if (!job) {
    return NextResponse.json(
      { error: 'Trabajo de exportación no encontrado' },
      { status: 404 }
    )
  }

  return NextResponse.json(job)
}
