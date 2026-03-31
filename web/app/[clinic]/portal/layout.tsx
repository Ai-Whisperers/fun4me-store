import { headers } from 'next/headers'
import { requireOwner } from '@/lib/auth'
import { PortalProviders } from './providers'

interface PortalLayoutProps {
  children: React.ReactNode
  params: Promise<{ clinic: string }>
}

/**
 * Portal Layout - Server component with tenant validation
 *
 * SEC-001: This layout validates that the authenticated user belongs to the
 * clinic specified in the URL. If not, they are redirected to their correct clinic.
 *
 * Auth pages (login, signup, forgot-password) are excluded from auth checks
 * to prevent redirect loops. Middleware already handles protection for these.
 *
 * Also provides command palette functionality via PortalProviders.
 */
export default async function PortalLayout({ children, params }: PortalLayoutProps) {
  const { clinic } = await params
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  // Skip auth check for auth pages to prevent redirect loop
  // Middleware already handles protection and redirects for these pages
  const isAuthPage =
    pathname.endsWith('/portal/login') ||
    pathname.endsWith('/portal/signup') ||
    pathname.endsWith('/portal/forgot-password')

  if (!isAuthPage) {
    // SEC-001: Require authenticated user AND validate tenant matches URL
    // This prevents users from clinic A accessing clinic B's portal via URL manipulation
    await requireOwner(clinic)
  }

  return <PortalProviders>{children}</PortalProviders>
}
