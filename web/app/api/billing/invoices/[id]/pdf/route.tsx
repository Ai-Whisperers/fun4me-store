/**
 * Platform Invoice PDF Generation API
 *
 * GET /api/billing/invoices/[id]/pdf - Generate and download invoice PDF
 *
 * Returns: PDF file download
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { PlatformInvoicePDFDocument } from '@/components/billing/platform-invoice-pdf'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Get profile and verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  try {
    // 3. Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('platform_invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // Verify invoice belongs to user's tenant
    if (invoice.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // 4. Get line items
    const { data: items } = await supabase
      .from('platform_invoice_items')
      .select('*')
      .eq('platform_invoice_id', id)
      .order('created_at', { ascending: true })

    // 5. Get tenant billing info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, billing_name, billing_email, billing_ruc, billing_address, billing_city')
      .eq('id', invoice.tenant_id)
      .single()

    const billingInfo = {
      name: tenant?.billing_name || tenant?.name || null,
      email: tenant?.billing_email || null,
      ruc: tenant?.billing_ruc || null,
      address: tenant?.billing_address || null,
      city: tenant?.billing_city || null,
    }

    // 6. Generate PDF
    const pdfBuffer = await renderToBuffer(
      <PlatformInvoicePDFDocument
        invoice={invoice}
        items={items || []}
        billingInfo={billingInfo}
      />
    )

    // 7. Return PDF as download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (e) {
    logger.error('Failed to generate platform invoice PDF', {
      invoiceId: id,
      tenantId: profile.tenant_id,
      error: e instanceof Error ? e.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: 'Error al generar PDF' },
      { status: 500 }
    )
  }
}
