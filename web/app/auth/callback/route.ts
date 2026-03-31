import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeRedirectUrl } from '@/lib/auth/redirect'

/**
 * OAuth callback handler
 * Handles the redirect from OAuth providers (Google, etc.)
 *
 * Important: After exchangeCodeForSession, the database trigger creates the profile
 * asynchronously. We wait briefly to give it time to complete, preventing the
 * "no_profile" error that occurs when redirecting too quickly.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Support both 'redirect' (standardized) and 'next' (legacy) parameters
  const rawRedirect = searchParams.get('redirect') ?? searchParams.get('next') ?? '/'
  // SEC-017: Sanitize redirect to prevent open redirect attacks
  const redirectTo = sanitizeRedirectUrl(rawRedirect, '/', origin)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Wait for the database trigger to create the profile
      // The trigger fires async after user creation, so we poll briefly
      const maxAttempts = 5
      const delayMs = 200

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (profile) {
          // Profile exists, safe to redirect
          return NextResponse.redirect(`${origin}${redirectTo}`)
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      // Profile wasn't created by trigger, but the portal layout will handle it
      // Redirect anyway - the fallback profile creation will kick in
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
