/**
 * GET /api/signup/check-slug
 *
 * Real-time slug availability check for clinic signup.
 * Returns availability status and suggestions if taken.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkSlugSchema, slugSchema, generateSlugSuggestion } from '@/lib/signup/schema'
import { RESERVED_SLUGS } from '@/lib/signup/types'
import type { CheckSlugResponse } from '@/lib/signup/types'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse<CheckSlugResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const rawSlug = searchParams.get('slug')

    // Validate input
    const parsed = checkSlugSchema.safeParse({ slug: rawSlug })
    if (!parsed.success) {
      return NextResponse.json({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    }

    const slug = parsed.data.slug

    // Check if slug matches format requirements
    const formatCheck = slugSchema.safeParse(slug)
    if (!formatCheck.success) {
      return NextResponse.json({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    }

    // Check if reserved
    if (RESERVED_SLUGS.includes(slug as typeof RESERVED_SLUGS[number])) {
      return NextResponse.json({
        available: false,
        suggestion: generateSlugSuggestion(slug, []),
        reason: 'reserved',
      })
    }

    // Check database for existing tenant
    const supabase = await createClient()

    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', slug)
      .maybeSingle()

    if (existingTenant) {
      // Get existing slugs for suggestion generation
      const { data: existingSlugs } = await supabase
        .from('tenants')
        .select('id')
        .like('id', `${slug}%`)

      const slugList = existingSlugs?.map((t) => t.id) || []

      return NextResponse.json({
        available: false,
        suggestion: generateSlugSuggestion(slug, slugList),
        reason: 'taken',
      })
    }

    // Slug is available
    return NextResponse.json({
      available: true,
      suggestion: null,
    })
  } catch (error) {
    logger.error('Error checking slug availability', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      },
      { status: 500 }
    )
  }
}
