import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')

  if (!clinic) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Clinic parameter required' },
    })
  }

  const supabase = await createClient()

  try {
    // Note: Column is display_order not sort_order in schema
    // Note: icon column doesn't exist in schema
    const { data: categories, error } = await supabase
      .from('store_categories')
      .select('id, name, slug, description, display_order')
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ categories: categories || [] })
  } catch (error) {
    logger.error('Error fetching categories', {
      tenantId: clinic,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar categorías' },
    })
  }
}
