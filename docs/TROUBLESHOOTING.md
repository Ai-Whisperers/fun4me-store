# Troubleshooting Guide

> Common issues and their solutions when working on Vetic

---

## Table of Contents

1. [Build Errors](#build-errors)
2. [Database Issues](#database-issues)
3. [Authentication Problems](#authentication-problems)
4. [API Errors](#api-errors)
5. [Component Issues](#component-issues)
6. [Testing Problems](#testing-problems)
7. [Deployment Issues](#deployment-issues)

---

## Build Errors

### Tailwind CSS not applying styles

**Symptom**: Classes like `bg-blue-500` work but `bg-[var(--primary)]` doesn't

**Cause**: Tailwind v4 was installed accidentally

**Solution**:

```bash
cd web
npm install tailwindcss@3.4.19
```

---

### "Module not found" for components

**Symptom**: `Cannot find module '@/components/ui/button'`

**Cause**: Missing export in barrel file

**Solution**: Check `components/ui/index.ts` has the export:

```typescript
export { Button } from "./button";
```

---

### TypeScript errors on `params`

**Symptom**: `Property 'clinic' does not exist on type 'Promise<...>'`

**Cause**: Next.js 15 changed params to be async

**Solution**: Await the params:

```typescript
// ❌ Wrong
const { clinic } = params;

// ✅ Correct
const { clinic } = await params;
```

---

### Build fails with JSON parsing error

**Symptom**: Tailwind fails scanning `.content_data/*.json`

**Cause**: Tailwind v4 scans all files including JSON

**Solution**:

1. Keep Tailwind at v3.4.19
2. Folder is already `.content_data` (hidden from scan)

---

## Database Issues

### "permission denied for table"

**Symptom**: Query fails with RLS error

**Causes**:

1. Missing `tenant_id` filter
2. User doesn't have access to tenant

**Solution**: Always filter by tenant:

```typescript
const { data } = await supabase
  .from("pets")
  .select("*")
  .eq("tenant_id", profile.tenant_id); // ADD THIS
```

---

### "new row violates row-level security policy"

**Symptom**: INSERT fails with RLS error

**Causes**:

1. Missing `tenant_id` in insert
2. User role doesn't have insert permission

**Solution**:

```typescript
// Check you're including tenant_id
await supabase.from("pets").insert({
  name: "Max",
  tenant_id: profile.tenant_id, // REQUIRED
  owner_id: user.id,
});
```

---

### "duplicate key value violates unique constraint"

**Symptom**: Insert fails on unique column

**Common cases**:

- `microchip_number` must be globally unique
- `invoice_number` per tenant
- `email` in profiles

**Solution**: Check for existing record first or use upsert

---

### Foreign key constraint failure

**Symptom**: `insert or update violates foreign key constraint`

**Cause**: Referenced record doesn't exist

**Solution**: Verify the foreign key exists:

```typescript
// Before inserting pet, verify owner exists
const { data: owner } = await supabase
  .from("profiles")
  .select("id")
  .eq("id", ownerId)
  .single();

if (!owner) throw new Error("Owner not found");
```

---

### Data visible across tenants

**CRITICAL SECURITY ISSUE**

**Symptom**: Clinic A sees Clinic B's data

**Cause**: Missing `tenant_id` filter OR missing RLS policy

**Solution**:

1. Add filter: `.eq('tenant_id', profile.tenant_id)`
2. Verify RLS policy exists on table
3. Run security test: `npm run test:security`

---

## Authentication Problems

### "Invalid JWT" error

**Symptom**: API returns 401 with JWT error

**Causes**:

1. Session expired
2. Invalid/malformed token

**Solution**:

```typescript
// Refresh session in client
await supabase.auth.refreshSession();
```

---

### Redirect loop on login

**Symptom**: Page keeps redirecting between login and portal

**Cause**: Middleware conflict

**Solution**: Check `middleware.ts`:

- Ensure authenticated users bypass login page
- Check redirect URLs don't loop

---

### "User not found" on signup

**Symptom**: New user can't log in after signup

**Cause**: `handle_new_user()` trigger failed

**Solution**:

1. Check trigger exists in database
2. Check `clinic_invites` has pending invite
3. Manually create profile if needed

---

### Role not applied after invite

**Symptom**: User has wrong role (owner instead of vet)

**Cause**: Invite was already used or expired

**Solution**:

1. Check `clinic_invites` table for status
2. Create new invite
3. Manually update `profiles.role`

---

## API Errors

### "No autorizado" (401)

**Cause**: Missing or invalid auth header

**Solution**: Ensure client sends session cookie:

```typescript
// Use the correct client
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

---

### "Acceso denegado" (403)

**Cause**: User doesn't have required role

**Solution**: Check role requirement in API:

```typescript
export const GET = withAuth(handler, {
  roles: ["vet", "admin"], // Check this
});
```

---

### "Recurso no encontrado" (404)

**Cause**: Resource doesn't exist or tenant mismatch

**Solution**: Verify:

1. Resource ID is correct
2. Resource belongs to user's tenant

---

### "Límite de solicitudes excedido" (429)

**Cause**: Rate limit hit

**Solution**: Wait and retry, or increase limit for testing:

```typescript
// In development, rate limits are relaxed
if (process.env.NODE_ENV === "development") {
  // Skip rate limiting
}
```

---

### CORS error

**Symptom**: `Access-Control-Allow-Origin` error

**Cause**: Missing CORS headers

**Solution**: Add to `next.config.mjs`:

```javascript
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' }
    ]
  }];
}
```

---

## Component Issues

### Theme colors not applying

**Symptom**: Component uses blue instead of clinic's primary color

**Cause**: Hardcoded color instead of CSS variable

**Solution**:

```tsx
// ❌ Wrong
<div className="bg-blue-500">

// ✅ Correct
<div className="bg-[var(--primary)]">
```

---

### Component not found in Storybook

**Symptom**: Story doesn't appear in Storybook

**Cause**: Story file location or naming

**Solution**:

1. Place story in `stories/` folder
2. Name file `*.stories.tsx`
3. Restart Storybook: `npm run storybook`

---

### Hydration mismatch error

**Symptom**: "Text content does not match server-rendered HTML"

**Cause**: Client renders different content than server

**Solution**:

```tsx
// Use useEffect for client-only values
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

---

### Form not submitting

**Symptom**: Form button click does nothing

**Causes**:

1. Missing `action` on form
2. Button not type="submit"
3. JavaScript error in handler

**Solution**:

```tsx
<form action={serverAction}>
  <button type="submit">Guardar</button>
</form>
```

---

## Testing Problems

### Tests fail with "supabase not defined"

**Cause**: Missing mock setup

**Solution**: Add to test file:

```typescript
import { mockSupabase } from "@/lib/test-utils/supabase-mock";

beforeEach(() => {
  vi.mock("@/lib/supabase/server", () => ({
    createClient: () => mockSupabase,
  }));
});
```

---

### E2E test can't find element

**Symptom**: `locator.click: Target closed`

**Causes**:

1. Page navigation interrupted test
2. Element not visible/rendered

**Solution**:

```typescript
// Wait for element to be ready
await page.waitForSelector('[data-testid="submit-btn"]');
await page.click('[data-testid="submit-btn"]');
```

---

### Test timeout

**Symptom**: Test exceeds 5000ms timeout

**Cause**: Slow async operation or infinite loop

**Solution**:

```typescript
// Increase timeout for slow tests
test(
  "slow operation",
  async () => {
    // ...
  },
  { timeout: 30000 }
);
```

---

### MSW not intercepting requests

**Cause**: Handler not registered

**Solution**: Check `mocks/handlers.ts`:

```typescript
export const handlers = [
  http.get('/api/pets', () => {
    return HttpResponse.json([...]);
  })
];
```

---

## Deployment Issues

### Build succeeds locally but fails on Vercel

**Causes**:

1. Missing environment variables
2. Case-sensitive file paths (Linux vs Windows)

**Solution**:

1. Check all env vars are set in Vercel dashboard
2. Verify import paths match actual file names exactly

---

### "Error: Dynamic server usage" on static page

**Cause**: Using `cookies()` or `headers()` in static page

**Solution**: Add dynamic route segment:

```typescript
export const dynamic = "force-dynamic";
```

---

### Large commit fails to push

**Symptom**: `error: RPC failed; HTTP 408`

**Cause**: Commit too large (>30MB)

**Solution**:

```bash
git config http.postBuffer 524288000
git push origin main
```

---

### Supabase connection refused

**Symptom**: Can't connect to database

**Causes**:

1. Wrong `SUPABASE_URL`
2. Network issues
3. Supabase project paused

**Solution**:

1. Verify env vars
2. Check Supabase dashboard for project status
3. Check network/firewall

---

## Quick Diagnostic Commands

```bash
# Check for TypeScript errors
npm run typecheck

# Check for linting issues
npm run lint

# Run all tests
npm test

# Check database connection
npx supabase db ping

# Verify environment
npm run env:check

# Clean rebuild
rm -rf .next && npm run build
```

---

## Getting Help

1. **Check existing docs**: `documentation/` (174 files)
2. **Read CLAUDE.md**: Coding standards and patterns
3. **Search issues**: Previous fixes in `documentation/history/`
4. **Run diagnostics**: `npm run test:security` for tenant issues

---

_Last updated: January 2026_
