import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { plQuerySchema } from '@/lib/schemas/finance'

// Type definitions for P&L calculations
interface ExpenseBreakdown {
  [category: string]: number
}

interface ExpenseRecord {
  amount: number
  category: string
}

/**
 * GET /api/finance/pl
 * Get profit & loss summary for the clinic (staff only)
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    // Validate query params
    const queryValidation = plQuerySchema.safeParse({
      clinic: searchParams.get('clinic'),
      start: searchParams.get('start'),
      end: searchParams.get('end'),
    })
    
    if (!queryValidation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryValidation.error.issues },
      })
    }
    
    const { start, end } = queryValidation.data
    const clinic = queryValidation.data.clinic || profile.tenant_id

    // Verify user belongs to the requested clinic
    if (clinic !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    const revenue = 0

    // Get Expenses
    let expenseQuery = supabase.from('expenses').select('amount, category').eq('clinic_id', clinic)

    if (start) expenseQuery = expenseQuery.gte('date', start)
    if (end) expenseQuery = expenseQuery.lte('date', end)

    const { data: expensesData, error } = await expenseQuery

    if (error) {
      logger.error('Error fetching P&L data', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const totalExpenses =
      (expensesData as ExpenseRecord[] | null)?.reduce(
        (acc: number, curr: ExpenseRecord) => acc + Number(curr.amount),
        0
      ) || 0

    // Breakdown by category
    const expenseBreakdown =
      (expensesData as ExpenseRecord[] | null)?.reduce<ExpenseBreakdown>(
        (acc: ExpenseBreakdown, curr: ExpenseRecord) => {
          acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount)
          return acc
        },
        {}
      ) || {}

    return NextResponse.json({
      revenue,
      expenses: totalExpenses,
      netIncome: revenue - totalExpenses,
      breakdown: expenseBreakdown,
    })
  },
  { roles: ['vet', 'admin'] }
)
