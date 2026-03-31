/**
 * Platform Admin - Pending Transfers API
 *
 * GET /api/platform/billing/pending-transfers - List all pending bank transfers
 *
 * This endpoint is for Vetic platform administrators to review
 * and verify bank transfer payments reported by clinic admins.
 *
 * Requires platform admin role.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Check platform admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_platform_admin) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Solo administradores de plataforma pueden acceder' },
    })
  }

  try {
    // 3. Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 4. Get pending bank transfer transactions
    const { data: transactions, error, count } = await supabase
      .from('billing_payment_transactions')
      .select(`
        id,
        tenant_id,
        platform_invoice_id,
        amount,
        currency,
        bank_transfer_reference,
        status,
        created_at,
        completed_at,
        failure_reason,
        platform_invoices!inner (
          id,
          invoice_number,
          total,
          period_start,
          period_end,
          status
        ),
        tenants!inner (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('payment_method_type', 'bank_transfer')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // 5. Get transfer details from billing_reminders
    const transactionIds = transactions?.map(t => t.id) || []
    const transferDetails: Record<string, unknown> = {}

    if (transactionIds.length > 0) {
      const { data: reminders } = await supabase
        .from('billing_reminders')
        .select('platform_invoice_id, content')
        .eq('channel', 'internal')
        .in('platform_invoice_id', transactions?.map(t => t.platform_invoice_id) || [])

      if (reminders) {
        for (const reminder of reminders) {
          try {
            const content = typeof reminder.content === 'string'
              ? JSON.parse(reminder.content)
              : reminder.content

            if (content.type === 'pending_transfer_verification') {
              transferDetails[content.transaction_id] = {
                transfer_date: content.transfer_date,
                bank_name: content.bank_name,
                reference_number: content.reference_number,
                proof_url: content.proof_url,
                notes: content.notes,
                reported_by: content.reported_by,
              }
            }
          } catch (_error: unknown) {
            // Ignore parsing errors
          }
        }
      }
    }

    // 6. Enrich transactions with transfer details
    const enrichedTransactions = transactions?.map(tx => ({
      ...tx,
      transfer_details: transferDetails[tx.id] || null,
    }))

    return NextResponse.json({
      pending_transfers: enrichedTransactions || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message },
    })
  }
}
