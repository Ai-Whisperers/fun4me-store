/**
 * Data Export API
 *
 * POST /api/export - Create a new export job
 * GET /api/export - List user's export jobs
 *
 * DATA-002: Self-service data export for tenants.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createExportJob,
  listExportJobs,
  processExportJob,
  EXPORTABLE_TABLES,
  type ExportableTable,
} from '@/lib/export'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for export processing

// =============================================================================
// Validation Schemas
// =============================================================================

const createExportSchema = z.object({
  tables: z
    .array(z.enum(EXPORTABLE_TABLES as unknown as [string, ...string[]]))
    .min(1, 'Debe seleccionar al menos una tabla')
    .max(12, 'Máximo 12 tablas por exportación'),
  format: z.enum(['csv', 'json', 'xlsx']),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  includeRelations: z.boolean().optional(),
  anonymize: z.boolean().optional(),
})

// =============================================================================
// POST - Create Export Job
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get profile with tenant
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  // Parse and validate request body
  let body: z.infer<typeof createExportSchema>
  try {
    const rawBody = await request.json()
    body = createExportSchema.parse(rawBody)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: error.issues.map((e: z.ZodIssue) => ({ path: e.path.join('.'), message: e.message })),
        },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 400 })
  }

  // Create export job
  const result = await createExportJob(user.id, profile.tenant_id, {
    tables: body.tables as ExportableTable[],
    format: body.format,
    dateRange: body.dateRange,
    includeRelations: body.includeRelations,
    anonymize: body.anonymize,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  logger.info('Export job created via API', {
    jobId: result.jobId,
    userId: user.id,
    tenantId: profile.tenant_id,
    tables: body.tables,
    format: body.format,
  })

  // Process the job in background - don't await to return quickly
  // For larger exports, this should be queued via Inngest or similar
  const jobId = result.jobId as string
  processExportJob(jobId).catch((error) => {
    logger.error('Export job processing failed', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    })
  })

  return NextResponse.json({
    success: true,
    jobId: result.jobId,
    message: 'Exportación iniciada. Recibirás un correo cuando esté lista.',
  })
}

// =============================================================================
// GET - List Export Jobs
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get query params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  // Get user's export jobs
  const jobs = await listExportJobs(user.id, limit)

  return NextResponse.json({
    jobs,
    total: jobs.length,
  })
}
