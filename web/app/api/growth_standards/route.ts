import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/growth_standards
 * Public endpoint - returns growth standard data for charts
 * No auth required - read-only reference data
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const breedCategory = searchParams.get('breed_category')
  const gender = searchParams.get('gender')

  if (!breedCategory || !gender) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { required: ['breed_category', 'gender'] },
    })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('growth_standards')
    .select('age_weeks, weight_kg, percentile')
    .eq('breed_category', breedCategory)
    .eq('gender', gender)
    .order('age_weeks', { ascending: true })

  if (error) {
    // Table might not exist yet - return empty array gracefully
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      logger.warn('growth_standards table not found, returning empty data')
      return NextResponse.json([])
    }
    logger.error('Error fetching growth standards', {
      error: error.message,
      breedCategory,
      gender,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data || [])
}
