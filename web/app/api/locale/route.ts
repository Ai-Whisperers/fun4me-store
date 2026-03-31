import { NextRequest, NextResponse } from 'next/server'
import { locales, type Locale } from '@/i18n/config'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

/**
 * POST /api/locale
 * Sets the user's preferred locale in a cookie
 * Public endpoint - no auth required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locale } = body

    // Validate locale
    if (!locale || !locales.includes(locale as Locale)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { reason: 'Invalid locale' },
      })
    }

    const response = NextResponse.json({ success: true, locale })

    // Set the locale cookie (max age: 1 year)
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (_error: unknown) {
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

/**
 * GET /api/locale
 * Returns the current locale from cookie or default
 * Public endpoint - no auth required
 */
export async function GET(request: NextRequest) {
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  const locale = localeCookie && locales.includes(localeCookie as Locale) ? localeCookie : 'es'

  return NextResponse.json({ locale })
}
