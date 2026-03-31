import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { logger } from '@/lib/logger'

interface SetupResponse {
  success: boolean
  message: string
  details?: Record<string, unknown>
}

/**
 * POST /api/setup
 * Database setup via API
 *
 * Query params:
 * - action: 'schema' | 'clinic' | 'status'
 * - clinic: clinic slug (for clinic-specific setup)
 *
 * NOTE: Seeding is now handled by the CLI script:
 *   npx tsx db/seeds/scripts/seed.ts
 */
export async function POST(request: NextRequest): Promise<NextResponse<SetupResponse>> {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'
  const clinic = searchParams.get('clinic')

  try {
    // Auth check - only admins can run setup
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    let result: SetupResponse

    switch (action) {
      case 'schema':
        result = await runSchemaSetup()
        break
      case 'clinic':
        if (!clinic) {
          return NextResponse.json(
            { success: false, message: 'Clinic parameter required for clinic setup' },
            { status: 400 }
          )
        }
        result = await setupClinicData(clinic)
        break
      case 'status':
        return NextResponse.json({
          success: true,
          message: 'Setup API is available. Use GET /api/setup to check database status.',
          details: {
            available_actions: ['schema', 'clinic'],
            seeding_note: 'Seeding is now handled by CLI: npx tsx db/seeds/scripts/seed.ts',
          },
        })
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Use: schema, clinic, or status' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    logger.error('Setup error', {
      error: error instanceof Error ? error.message : 'Unknown',
      action,
      clinic,
    })
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Setup failed', details: { error: message } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/setup
 * Check setup status
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()

  try {
    // Check if basic tables exist
    const tables = [
      'tenants',
      'profiles',
      'store_products',
      'clinic_product_assignments',
      'notifications',
    ]

    const status: Record<string, boolean> = {}

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true })
          .limit(1)
        status[table] = !error
      } catch (_error: unknown) {
        status[table] = false
      }
    }

    // Check if we have any data
    const { count: tenantCount } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    const { count: productCount } = await supabase
      .from('store_products')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      tables_exist: status,
      has_data: {
        tenants: (tenantCount || 0) > 0,
        products: (productCount || 0) > 0,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to check setup status', details: message },
      { status: 500 }
    )
  }
}

async function runSchemaSetup(): Promise<SetupResponse> {
  try {
    logger.info('Running schema setup via API')

    // Use the existing setup script via spawn
    const { spawn } = await import('child_process')

    return new Promise((resolve) => {
      const child = spawn('node', ['db/setup-db.mjs', 'schema'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            message: 'Schema setup completed successfully',
            details: { stdout, stderr },
          })
        } else {
          resolve({
            success: false,
            message: 'Schema setup failed',
            details: { error: stderr || 'Unknown error' },
          })
        }
      })

      child.on('error', (error) => {
        resolve({
          success: false,
          message: 'Schema setup process failed',
          details: { error: error.message },
        })
      })
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: 'Schema setup failed',
      details: { error: message },
    }
  }
}

async function setupClinicData(clinicSlug: string): Promise<SetupResponse> {
  const supabase = await createClient()

  try {
    logger.info('Setting up clinic data', { clinicSlug })

    // Check if clinic exists
    const { data: clinic, error: clinicError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', clinicSlug)
      .single()

    if (clinicError || !clinic) {
      return {
        success: false,
        message: `Clinic '${clinicSlug}' not found. Please run full setup first.`,
        details: { error: clinicError?.message || 'Clinic not found' },
      }
    }

    // Create clinic product assignments
    const assignmentsPath = join(
      process.cwd(),
      'db',
      'seeds',
      'data',
      '03-store',
      'tenant-products',
      `${clinicSlug}.json`
    )

    try {
      const assignmentsData = JSON.parse(readFileSync(assignmentsPath, 'utf-8'))
      const assignments = assignmentsData.products

      logger.info('Creating product assignments', {
        clinicSlug,
        assignmentCount: assignments.length,
      })

      for (const assignment of assignments) {
        // Get product ID by SKU
        const { data: product } = await supabase
          .from('store_products')
          .select('id')
          .eq('sku', assignment.sku)
          .single()

        if (product) {
          await supabase.from('clinic_product_assignments').upsert(
            {
              tenant_id: clinicSlug,
              catalog_product_id: product.id,
              sale_price: assignment.sale_price,
              min_stock_level: assignment.min_stock_level,
              location: assignment.location,
              requires_prescription: assignment.requires_prescription,
              is_active: true,
            },
            {
              onConflict: 'tenant_id,catalog_product_id',
            }
          )

          // Create initial inventory if specified
          if (assignment.initial_stock && assignment.initial_stock > 0) {
            await supabase.from('store_inventory').upsert(
              {
                tenant_id: clinicSlug,
                product_id: product.id,
                stock_quantity: assignment.initial_stock,
                min_stock_level: assignment.min_stock_level || 5,
                reorder_quantity: (assignment.min_stock_level || 5) * 2,
              },
              {
                onConflict: 'product_id',
              }
            )
          }
        }
      }

      return {
        success: true,
        message: `Clinic '${clinicSlug}' setup completed`,
        details: {
          clinic: clinic.name,
          assignments_created: assignments.length,
        },
      }
    } catch (fileError: unknown) {
      const message = fileError instanceof Error ? fileError.message : 'Unknown error'
      return {
        success: false,
        message: `Clinic setup file not found: ${clinicSlug}.json`,
        details: { error: message },
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: 'Clinic setup failed',
      details: { error: message },
    }
  }
}
