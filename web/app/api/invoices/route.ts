import { NextResponse } from 'next/server'
import { withApiAuth, isStaff, type ApiHandlerContext } from '@/lib/auth'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { parsePagination, paginatedResponse } from '@/lib/api/pagination'
import { createInvoiceSchema } from '@/lib/schemas/invoice'
import { InvoiceService } from '@/lib/services'

// GET /api/invoices - List invoices for a clinic
export const GET = withApiAuth(async ({ user, profile, supabase, request }) => {
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic') || profile.tenant_id
  const status = searchParams.get('status') as 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | undefined
  const petId = searchParams.get('pet_id') || undefined
  const { page, limit, offset } = parsePagination(searchParams)

  // Staff can see all invoices, owners only see their own tenant's
  const userIsStaff = isStaff(profile)

  if (!userIsStaff && clinic !== profile.tenant_id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { reason: 'Tenant access denied' },
    })
  }

  // Delegate to service
  const service = new InvoiceService(supabase)
  const result = await service.list(
    clinic,
    { status, petId, page, limit },
    user.id,
    userIsStaff
  )

  if (!result.success) {
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { reason: result.error },
    })
  }

  return NextResponse.json(
    paginatedResponse(result.data.invoices, result.data.count, { page, limit, offset })
  )
})

// POST /api/invoices - Create new invoice (staff only)
// Rate limited: 10 requests per minute (financial operations)
// Supports idempotency via Idempotency-Key header to prevent duplicates on retry
export const POST = withApiAuth(
  async ({ user, profile, supabase, request }: ApiHandlerContext) => {
    // Check for idempotency key
    const idempotencyKey = request.headers.get('Idempotency-Key') || undefined

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // VALID-004: Validate with Zod schema
    const validation = createInvoiceSchema.safeParse(body)
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: {
          errors: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      })
    }

    const { pet_id, items, notes, due_date, tax_rate } = validation.data

    // Delegate to service
    const service = new InvoiceService(supabase)
    const result = await service.create(profile.tenant_id, user.id, {
      pet_id,
      items,
      tax_rate,
      notes,
      due_date,
      idempotency_key: idempotencyKey,
    })

    if (!result.success) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { reason: result.error },
      })
    }

    return apiSuccess(result.data, 'Factura creada exitosamente', HTTP_STATUS.CREATED)
  },
  { roles: ['vet', 'admin'], rateLimit: 'financial' }
)
