/**
 * Export Job Management
 *
 * DATA-002: Job creation, status tracking, and processing logic.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email/client'
import { TABLE_CONFIGS } from './config'
import { generateExportFile, transformRows, type ExportData } from './generators'
import type {
  ExportJob,
  CreateExportJobInput,
  ExportConfig,
  ExportableTable,
  ExportJobResponse,
  ExportResult,
} from './types'

// =============================================================================
// Constants
// =============================================================================

/** Export file expires after 7 days */
const EXPORT_EXPIRY_DAYS = 7

/** Maximum records per table export */
const MAX_RECORDS_PER_TABLE = 50000

/** Supabase storage bucket for exports */
const EXPORT_BUCKET = 'exports'

// =============================================================================
// Job Creation
// =============================================================================

export interface CreateJobResult {
  success: boolean
  jobId?: string
  error?: string
}

/**
 * Create a new export job
 */
export async function createExportJob(
  userId: string,
  tenantId: string,
  input: CreateExportJobInput
): Promise<CreateJobResult> {
  const supabase = await createClient('service_role')

  const config: ExportConfig = {
    tables: input.tables,
    format: input.format,
    dateRange: input.dateRange
      ? {
          from: new Date(input.dateRange.from),
          to: new Date(input.dateRange.to),
        }
      : undefined,
    includeRelations: input.includeRelations ?? true,
    anonymize: input.anonymize ?? false,
  }

  const { data, error } = await supabase
    .from('export_jobs')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      config,
      status: 'pending',
      progress: 0,
    })
    .select('id')
    .single()

  if (error) {
    logger.error('Failed to create export job', { error: error.message, userId, tenantId })
    return { success: false, error: 'Error al crear el trabajo de exportación' }
  }

  logger.info('Export job created', {
    jobId: data.id,
    userId,
    tenantId,
    tables: input.tables,
    format: input.format,
  })

  return { success: true, jobId: data.id }
}

// =============================================================================
// Job Status
// =============================================================================

/**
 * Get export job by ID
 */
export async function getExportJob(
  jobId: string,
  userId: string
): Promise<ExportJobResponse | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return mapJobToResponse(data)
}

/**
 * List export jobs for a user
 */
export async function listExportJobs(
  userId: string,
  limit: number = 20
): Promise<ExportJobResponse[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map(mapJobToResponse)
}

function mapJobToResponse(job: ExportJob): ExportJobResponse {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    fileUrl: job.file_url,
    fileSize: job.file_size,
    expiresAt: job.expires_at,
    errorMessage: job.error_message,
    createdAt: job.created_at,
    completedAt: job.completed_at,
  }
}

// =============================================================================
// Job Processing
// =============================================================================

/**
 * Process an export job
 */
export async function processExportJob(jobId: string): Promise<ExportResult> {
  const supabase = await createClient('service_role')
  const startTime = Date.now()

  // Get the job
  const { data: job, error: jobError } = await supabase
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    throw new Error(`Export job not found: ${jobId}`)
  }

  const config = job.config as ExportConfig

  logger.info('Processing export job', {
    jobId,
    tenantId: job.tenant_id,
    tables: config.tables,
    format: config.format,
  })

  // Update status to processing
  await supabase.from('export_jobs').update({ status: 'processing', progress: 5 }).eq('id', jobId)

  try {
    // Fetch data for each table
    const exportData: ExportData[] = []
    const progressPerTable = 80 / config.tables.length

    for (let i = 0; i < config.tables.length; i++) {
      const table = config.tables[i]
      const progress = 5 + Math.round((i + 0.5) * progressPerTable)

      await supabase.from('export_jobs').update({ progress }).eq('id', jobId)

      const tableData = await fetchTableData(
        table,
        job.tenant_id,
        config.dateRange,
        config.includeRelations ?? true
      )

      const { transformedRows, columns } = transformRows(
        tableData,
        table,
        config.anonymize ?? false
      )

      exportData.push({
        table,
        rows: transformedRows,
        columns,
      })
    }

    // Update progress to 90%
    await supabase.from('export_jobs').update({ progress: 90 }).eq('id', jobId)

    // Generate file
    const file = await generateExportFile(exportData, config.format, job.tenant_id)

    // Upload to storage
    const filePath = `${job.tenant_id}/${job.id}/${file.filename}`
    const { error: uploadError } = await supabase.storage
      .from(EXPORT_BUCKET)
      .upload(filePath, file.content, {
        contentType: file.contentType,
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload export file: ${uploadError.message}`)
    }

    // Get signed URL (valid for 7 days)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(EXPORT_BUCKET)
      .createSignedUrl(filePath, EXPORT_EXPIRY_DAYS * 24 * 60 * 60)

    if (urlError || !urlData) {
      throw new Error('Failed to generate download URL')
    }

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + EXPORT_EXPIRY_DAYS)

    // Update job as completed
    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        progress: 100,
        file_url: urlData.signedUrl,
        file_size: file.content.length,
        expires_at: expiresAt.toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // Get user email for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', job.user_id)
      .single()

    // Send notification email
    if (profile?.email) {
      await sendExportReadyEmail(profile.email, profile.full_name, urlData.signedUrl, expiresAt)
    }

    const duration = Date.now() - startTime
    const totalRecords = exportData.reduce((sum, d) => sum + d.rows.length, 0)

    logger.info('Export job completed', {
      jobId,
      tenantId: job.tenant_id,
      tables: config.tables,
      totalRecords,
      fileSize: file.content.length,
      duration_ms: duration,
    })

    return {
      success: true,
      tables: exportData.map((d) => ({
        table: d.table,
        recordCount: d.rows.length,
        columns: d.columns,
      })),
      totalRecords,
      fileSize: file.content.length,
      format: config.format,
      duration_ms: duration,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'

    logger.error('Export job failed', {
      jobId,
      error: errorMessage,
    })

    // Update job as failed
    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', jobId)

    throw error
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

/**
 * Fetch data from a table with optional date range filter
 */
async function fetchTableData(
  table: ExportableTable,
  tenantId: string,
  dateRange?: { from: Date; to: Date },
  _includeRelations: boolean = true
): Promise<Record<string, unknown>[]> {
  const supabase = await createClient('service_role')
  const config = TABLE_CONFIGS[table]

  // Build column selection
  const columns = config.columns.map((c) => c.column)

  // Build query based on table
  let query = supabase.from(config.dbTable).select(columns.join(', '))

  // Apply tenant filter (most tables have tenant_id)
  if (config.dbTable !== 'profiles') {
    query = query.eq('tenant_id', tenantId)
  } else {
    // For profiles (clients), filter by role and tenant
    query = query.eq('tenant_id', tenantId).eq('role', 'owner')
  }

  // Apply date range filter
  if (dateRange && config.dateColumn) {
    query = query
      .gte(config.dateColumn, dateRange.from.toISOString())
      .lte(config.dateColumn, dateRange.to.toISOString())
  }

  // Limit records
  query = query.limit(MAX_RECORDS_PER_TABLE)

  // Order by date if available
  if (config.dateColumn) {
    query = query.order(config.dateColumn, { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    logger.error('Failed to fetch export data', {
      table,
      tenantId,
      error: error.message,
    })
    throw new Error(`Error al obtener datos de ${table}: ${error.message}`)
  }

  // If includeRelations and joins defined, fetch related data
  // For simplicity, we're doing basic column selection
  // A more sophisticated implementation would do JOINs

  return (data as unknown as Record<string, unknown>[]) ?? []
}

// =============================================================================
// Email Notification
// =============================================================================

async function sendExportReadyEmail(
  email: string,
  name: string | null,
  downloadUrl: string,
  expiresAt: Date
): Promise<void> {
  const expiryDate = expiresAt.toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  await sendEmail({
    to: email,
    subject: 'Tu exportación de datos está lista',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Exportación Lista</h2>
        <p>Hola ${name || 'Usuario'},</p>
        <p>Tu exportación de datos ha sido procesada exitosamente.</p>
        <p>
          <a href="${downloadUrl}"
             style="display: inline-block; background-color: #2563eb; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Descargar Archivo
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Este enlace expira el <strong>${expiryDate}</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          Este correo fue enviado automáticamente. Por favor no responda.
        </p>
      </div>
    `,
  })
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Mark expired export jobs
 */
export async function cleanupExpiredExports(): Promise<number> {
  const supabase = await createClient('service_role')

  const { data, error } = await supabase
    .from('export_jobs')
    .update({ status: 'expired' })
    .eq('status', 'completed')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    logger.error('Failed to cleanup expired exports', { error: error.message })
    return 0
  }

  const count = data?.length ?? 0
  if (count > 0) {
    logger.info('Cleaned up expired exports', { count })
  }

  return count
}
