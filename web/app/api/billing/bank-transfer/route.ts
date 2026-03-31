/**
 * Bank Transfer Information API
 *
 * GET /api/billing/bank-transfer - Get bank account details for transfer
 *
 * Returns Vetic's bank account information for manual payments.
 * Used when clinic admins want to pay via bank transfer instead of card.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

// Bank account configuration (would be in env vars in production)
const BANK_ACCOUNTS = {
  primary: {
    bank_name: 'Banco Itau Paraguay',
    bank_code: 'ITAU',
    account_type: 'Cuenta Corriente',
    account_number: 'XXXX-XXXX-XXXX-1234', // Masked for security
    account_holder: 'Vetic Paraguay S.A.',
    ruc: '80123456-7',
    alias: 'vetic.pagos',
    swift_code: 'ITAUPYPY',
    currency: 'PYG',
  },
  secondary: {
    bank_name: 'Banco Continental',
    bank_code: 'CONTINENTAL',
    account_type: 'Cuenta Corriente',
    account_number: 'XXXX-XXXX-XXXX-5678',
    account_holder: 'Vetic Paraguay S.A.',
    ruc: '80123456-7',
    alias: 'vetic.cobros',
    swift_code: 'BCPYPYPY',
    currency: 'PYG',
  },
}

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

  // 2. Get profile and verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  // 3. Get optional invoice_id from query params for reference
  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get('invoice_id')

  let invoiceReference = null
  if (invoiceId) {
    const { data: invoice } = await supabase
      .from('platform_invoices')
      .select('invoice_number, total')
      .eq('id', invoiceId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (invoice) {
      invoiceReference = {
        invoice_number: invoice.invoice_number,
        amount: invoice.total,
        reference_code: `VETIC-${invoice.invoice_number}-${profile.tenant_id.substring(0, 6).toUpperCase()}`,
      }
    }
  }

  // 4. Get tenant info for reference
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.tenant_id)
    .single()

  return NextResponse.json({
    bank_accounts: [BANK_ACCOUNTS.primary, BANK_ACCOUNTS.secondary],
    instructions: {
      title: 'Instrucciones para Transferencia Bancaria',
      steps: [
        'Realice una transferencia desde su banca en linea o ventanilla',
        'Use el alias o numero de cuenta indicado',
        `Incluya como concepto: ${invoiceReference?.reference_code || `VETIC-${profile.tenant_id.substring(0, 8).toUpperCase()}`}`,
        'Una vez realizada la transferencia, reportela usando el boton "Reportar Transferencia"',
        'Adjunte el comprobante de pago para acelerar la verificacion',
      ],
      important_notes: [
        'Las transferencias pueden demorar hasta 48 horas en ser verificadas',
        'Asegurese de incluir el codigo de referencia en el concepto',
        'El monto debe coincidir exactamente con el total de la factura',
      ],
    },
    invoice_reference: invoiceReference,
    tenant_name: tenant?.name || 'N/A',
    support_email: 'pagos@vetic.com.py',
    support_phone: '+595 21 XXX XXXX',
  })
}
