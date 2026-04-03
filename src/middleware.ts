import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const ageVerified = request.cookies.get('age-verified')?.value;
  const { pathname } = request.nextUrl;

  // Don't redirect if already on the age verification page or API routes or static files
  if (
    pathname.startsWith('/verificar-edad') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (!ageVerified) {
    const url = request.nextUrl.clone();
    url.pathname = '/verificar-edad';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
