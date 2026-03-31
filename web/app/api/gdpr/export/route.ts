/**
 * GDPR Data Export API
 *
 * COMP-001: Article 15 (Right of Access) & Article 20 (Data Portability)
 *
 * GET /api/gdpr/export - Download user's data export
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { collectUserData, generateExportJson, isIdentityVerified } from '@/lib/gdpr'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/gdpr/export
 * Download user's complete data export
 *
 * Query params:
 * - request: GDPR request ID (optional, for tracking)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get request ID from query params (optional)
    const requestId = request.nextUrl.searchParams.get('request')

    // If request ID provided, verify identity was confirmed
    if (requestId) {
      const verified = await isIdentityVerified(requestId)
      if (!verified) {
        return NextResponse.json(
          { error: 'Verificación de identidad pendiente' },
          { status: 403 }
        )
      }
    }

    // Collect all user data
    const userData = await collectUserData(user.id)

    // Generate JSON export
    const jsonData = generateExportJson(userData)

    // Update request status if provided
    if (requestId) {
      await supabase
        .from('gdpr_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('user_id', user.id)

      // Log compliance
      await supabase.from('gdpr_compliance_logs').insert({
        request_id: requestId,
        user_id: user.id,
        tenant_id: userData.dataSubject.tenantId,
        action: 'data_export',
        details: {
          categories_exported: [
            'profile',
            'pets',
            'appointments',
            'medical_records',
            'prescriptions',
            'invoices',
            'payments',
            'messages',
            'loyalty_points',
            'store_orders',
            'store_reviews',
            'consents',
            'activity_log',
          ],
          export_size_bytes: new Blob([jsonData]).size,
        },
        performed_by: user.id,
        performed_at: new Date().toISOString(),
      })
    }

    // Return as downloadable JSON file
    const filename = `datos-personales-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    logger.error('Error in GET /api/gdpr/export:', error)
    return NextResponse.json(
      { error: 'Error al exportar datos' },
      { status: 500 }
    )
  }
}
