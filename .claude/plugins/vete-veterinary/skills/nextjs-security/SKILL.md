---
name: nextjs-security
description: Next.js 15 security patterns for veterinary platforms including Server Action hardening, CSRF protection, rate limiting, RLS policy generation, and auth middleware. Use when building or auditing security features.
---

# Next.js 15 Security Patterns

## Overview

This skill covers security best practices specific to Next.js 15 App Router applications with Supabase, focusing on multi-tenant veterinary platform requirements.

---

## 1. Server Action Security

### Secure Server Action Pattern

```typescript
// lib/actions/secure-action.ts
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

interface ActionContext {
  user: User;
  profile: Profile;
  supabase: SupabaseClient;
}

type SecureActionOptions = {
  schema?: z.ZodSchema;
  roles?: ('owner' | 'vet' | 'admin')[];
  rateLimit?: { requests: number; window: string };
};

export function createSecureAction<TInput, TOutput>(
  options: SecureActionOptions,
  handler: (input: TInput, context: ActionContext) => Promise<TOutput>
) {
  return async (input: TInput): Promise<{ success: true; data: TOutput } | { success: false; error: string }> => {
    try {
      // 1. Rate limiting
      if (options.rateLimit) {
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for') || 'unknown';
        const limited = await rateLimit(ip, options.rateLimit);
        if (limited) {
          return { success: false, error: 'Demasiadas solicitudes. Intenta más tarde.' };
        }
      }

      // 2. Authentication
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'No autorizado' };
      }

      // 3. Get profile and tenant context
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id, role, full_name')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Perfil no encontrado' };
      }

      // 4. Role authorization
      if (options.roles && !options.roles.includes(profile.role)) {
        return { success: false, error: 'No tienes permiso para esta acción' };
      }

      // 5. Input validation
      if (options.schema) {
        const validation = options.schema.safeParse(input);
        if (!validation.success) {
          return {
            success: false,
            error: validation.error.issues.map(i => i.message).join(', '),
          };
        }
        input = validation.data;
      }

      // 6. Execute handler
      const result = await handler(input, { user, profile, supabase });

      return { success: true, data: result };
    } catch (error) {
      console.error('Action error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      };
    }
  };
}

// Usage example
const updatePetSchema = z.object({
  petId: z.string().uuid(),
  name: z.string().min(1).max(50),
  weight: z.number().positive().optional(),
});

export const updatePet = createSecureAction(
  {
    schema: updatePetSchema,
    roles: ['owner', 'vet', 'admin'],
    rateLimit: { requests: 10, window: '1m' },
  },
  async (input, { profile, supabase }) => {
    // Verify ownership or staff access
    const { data: pet } = await supabase
      .from('pets')
      .select('owner_id, tenant_id')
      .eq('id', input.petId)
      .single();

    if (!pet) {
      throw new Error('Mascota no encontrada');
    }

    // Owner can only edit their own pets
    if (profile.role === 'owner' && pet.owner_id !== profile.id) {
      throw new Error('No tienes permiso para editar esta mascota');
    }

    // Staff can only edit pets in their tenant
    if (profile.role !== 'owner' && pet.tenant_id !== profile.tenant_id) {
      throw new Error('Esta mascota no pertenece a tu clínica');
    }

    const { data, error } = await supabase
      .from('pets')
      .update({ name: input.name, weight: input.weight })
      .eq('id', input.petId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);
```

### CSRF Protection

```typescript
// lib/csrf.ts
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

export async function generateCSRFToken(): Promise<string> {
  const token = randomBytes(32).toString('hex');

  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

export async function validateCSRFToken(headerToken: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Timing-safe comparison
  return timingSafeEqual(cookieToken, headerToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Middleware for CSRF validation on state-changing requests
export async function csrfMiddleware(request: Request): Promise<Response | null> {
  const method = request.method.toUpperCase();

  // Only validate state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null;
  }

  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!headerToken || !(await validateCSRFToken(headerToken))) {
    return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}
```

---

## 2. API Route Security

### Secure API Route Pattern

```typescript
// lib/api/secure-route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { apiError, HTTP_STATUS } from '@/lib/api/errors';

interface RouteContext {
  user: User;
  profile: Profile;
  supabase: SupabaseClient;
  params: Record<string, string>;
}

type RouteOptions = {
  roles?: ('owner' | 'vet' | 'admin')[];
  rateLimit?: { requests: number; window: string };
  validateBody?: z.ZodSchema;
  validateParams?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
};

export function createSecureRoute<T = unknown>(
  options: RouteOptions,
  handler: (request: NextRequest, context: RouteContext) => Promise<T>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // 1. Rate limiting
      if (options.rateLimit) {
        const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
        const limited = await rateLimit(ip, options.rateLimit);
        if (limited) {
          return apiError('RATE_LIMITED', HTTP_STATUS.TOO_MANY_REQUESTS);
        }
      }

      // 2. Authentication
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED);
      }

      // 3. Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return apiError('PROFILE_NOT_FOUND', HTTP_STATUS.FORBIDDEN);
      }

      // 4. Role check
      if (options.roles && !options.roles.includes(profile.role)) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN);
      }

      // 5. Validate params
      const resolvedParams = await params;
      if (options.validateParams) {
        const result = options.validateParams.safeParse(resolvedParams);
        if (!result.success) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { errors: result.error.issues },
          });
        }
      }

      // 6. Validate query params
      if (options.validateQuery) {
        const url = new URL(request.url);
        const query = Object.fromEntries(url.searchParams);
        const result = options.validateQuery.safeParse(query);
        if (!result.success) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { errors: result.error.issues },
          });
        }
      }

      // 7. Validate body (for POST/PUT/PATCH)
      if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        let body;
        try {
          body = await request.json();
        } catch {
          return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST);
        }

        const result = options.validateBody.safeParse(body);
        if (!result.success) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { errors: result.error.issues },
          });
        }
      }

      // 8. Execute handler
      const result = await handler(request, {
        user,
        profile,
        supabase,
        params: resolvedParams,
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error('API error:', error);
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };
}
```

### API Error Handling

```typescript
// lib/api/errors.ts
import { NextResponse } from 'next/server';

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_FORMAT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'DATABASE_ERROR'
  | 'PROFILE_NOT_FOUND'
  | 'TENANT_MISMATCH';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'No tienes permiso para esta acción',
  NOT_FOUND: 'Recurso no encontrado',
  VALIDATION_ERROR: 'Datos inválidos',
  INVALID_FORMAT: 'Formato de solicitud inválido',
  RATE_LIMITED: 'Demasiadas solicitudes. Intenta más tarde.',
  SERVER_ERROR: 'Error interno del servidor',
  DATABASE_ERROR: 'Error de base de datos',
  PROFILE_NOT_FOUND: 'Perfil no encontrado',
  TENANT_MISMATCH: 'No tienes acceso a este recurso',
};

export function apiError(
  code: ErrorCode,
  status: number,
  extra?: { details?: unknown; message?: string }
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message: extra?.message || ERROR_MESSAGES[code],
        ...(extra?.details && { details: extra.details }),
      },
    },
    { status }
  );
}
```

---

## 3. Rate Limiting

### Upstash Rate Limiter

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limiters for different endpoints
export const rateLimiters = {
  // General API: 100 requests per minute
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  // Auth endpoints: 10 requests per minute
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // Sensitive actions: 5 requests per minute
  sensitive: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1m'),
    analytics: true,
    prefix: 'ratelimit:sensitive',
  }),

  // File uploads: 20 requests per hour
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1h'),
    analytics: true,
    prefix: 'ratelimit:upload',
  }),
};

export async function rateLimit(
  identifier: string,
  config: { requests: number; window: string }
): Promise<boolean> {
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window as any),
    prefix: 'ratelimit:custom',
  });

  const { success } = await limiter.limit(identifier);
  return !success; // Returns true if rate limited
}

// Middleware helper
export async function checkRateLimit(
  request: Request,
  limiter: keyof typeof rateLimiters
): Promise<{ limited: boolean; remaining: number; reset: number }> {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success, remaining, reset } = await rateLimiters[limiter].limit(ip);

  return {
    limited: !success,
    remaining,
    reset,
  };
}
```

---

## 4. RLS Policy Generation

### Policy Templates

```typescript
// lib/db/rls-generator.ts
interface RLSPolicyConfig {
  tableName: string;
  tenantColumn: string;
  ownerColumn?: string;
  publicRead?: boolean;
  staffOnlyWrite?: boolean;
}

export function generateRLSPolicies(config: RLSPolicyConfig): string {
  const { tableName, tenantColumn, ownerColumn, publicRead, staffOnlyWrite } = config;

  let sql = `
-- Enable RLS on ${tableName}
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner
ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY;
`;

  // Read policy
  if (publicRead) {
    sql += `
-- Public read access
CREATE POLICY "${tableName}_public_select" ON ${tableName}
  FOR SELECT
  USING (true);
`;
  } else {
    sql += `
-- Tenant-scoped read
CREATE POLICY "${tableName}_tenant_select" ON ${tableName}
  FOR SELECT
  USING (
    ${tenantColumn} IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
`;
  }

  // Insert policy
  if (staffOnlyWrite) {
    sql += `
-- Staff-only insert
CREATE POLICY "${tableName}_staff_insert" ON ${tableName}
  FOR INSERT
  WITH CHECK (
    is_staff_of(${tenantColumn})
  );
`;
  } else {
    sql += `
-- Tenant-scoped insert
CREATE POLICY "${tableName}_tenant_insert" ON ${tableName}
  FOR INSERT
  WITH CHECK (
    ${tenantColumn} IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
`;
  }

  // Update policy
  if (ownerColumn) {
    sql += `
-- Owner or staff can update
CREATE POLICY "${tableName}_update" ON ${tableName}
  FOR UPDATE
  USING (
    ${ownerColumn} = auth.uid()
    OR is_staff_of(${tenantColumn})
  )
  WITH CHECK (
    ${ownerColumn} = auth.uid()
    OR is_staff_of(${tenantColumn})
  );
`;
  } else {
    sql += `
-- Staff-only update
CREATE POLICY "${tableName}_staff_update" ON ${tableName}
  FOR UPDATE
  USING (is_staff_of(${tenantColumn}))
  WITH CHECK (is_staff_of(${tenantColumn}));
`;
  }

  // Delete policy (usually staff only)
  sql += `
-- Staff-only delete
CREATE POLICY "${tableName}_staff_delete" ON ${tableName}
  FOR DELETE
  USING (is_staff_of(${tenantColumn}));
`;

  return sql;
}

// Helper function that should exist in Supabase
export const IS_STAFF_OF_FUNCTION = `
CREATE OR REPLACE FUNCTION is_staff_of(check_tenant_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND tenant_id = check_tenant_id
    AND role IN ('vet', 'admin')
  );
END;
$$;
`;
```

---

## 5. Input Sanitization

### Sanitization Utilities

```typescript
// lib/security/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML content (for rich text fields)
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

// Sanitize plain text (remove all HTML)
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

// Sanitize for SQL LIKE patterns (prevent injection in search)
export function sanitizeSearchPattern(input: string): string {
  return input
    .replace(/[%_\\]/g, '\\$&') // Escape SQL wildcards
    .replace(/[^\w\s\-áéíóúñÁÉÍÓÚÑ]/g, ''); // Remove special chars except Spanish
}

// Sanitize filename
export function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

// Sanitize phone number (Paraguay format)
export function sanitizePhone(input: string): string {
  return input.replace(/[^\d+]/g, '').substring(0, 15);
}

// Validate and sanitize UUID
export function sanitizeUUID(input: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input) ? input.toLowerCase() : null;
}

// Prevent path traversal
export function sanitizePath(input: string): string {
  return input
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}
```

---

## 6. Security Headers Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 7. Security Checklist

### Pre-Deployment Checklist

```markdown
## Authentication
- [ ] All API routes check authentication
- [ ] Session tokens are httpOnly and secure
- [ ] Logout invalidates server-side session
- [ ] Password requirements enforced (min 8 chars, complexity)

## Authorization
- [ ] Role-based access control implemented
- [ ] Tenant isolation verified (RLS policies)
- [ ] Resource ownership checked before mutations
- [ ] Admin functions protected

## Input Validation
- [ ] All inputs validated with Zod schemas
- [ ] File uploads validated (type, size, content)
- [ ] Search patterns sanitized
- [ ] UUIDs validated before database queries

## Rate Limiting
- [ ] Auth endpoints rate limited (10/min)
- [ ] API endpoints rate limited (100/min)
- [ ] File uploads rate limited (20/hour)
- [ ] Sensitive operations rate limited (5/min)

## Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] PII logged minimally
- [ ] Database backups encrypted
- [ ] Environment variables secured

## Headers & Transport
- [ ] HTTPS enforced
- [ ] Security headers set (CSP, HSTS, etc.)
- [ ] CORS configured correctly
- [ ] Cookies set with secure flags

## Logging & Monitoring
- [ ] Security events logged
- [ ] Failed auth attempts tracked
- [ ] Anomaly detection in place
- [ ] Audit trail for sensitive operations
```

---

*Reference: OWASP Top 10, Next.js Security documentation, Supabase Security best practices*
