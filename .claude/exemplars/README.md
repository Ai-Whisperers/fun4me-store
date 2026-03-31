# Exemplars - Pattern Reference

These exemplars show **good vs bad patterns** specific to this veterinary platform's tech stack.

## Available Exemplars

| File | Purpose | Key Patterns |
|------|---------|--------------|
| [nextjs-page-exemplar.md](./nextjs-page-exemplar.md) | Next.js 15 pages | Server Components, SSG, metadata, multi-tenant |
| [supabase-api-exemplar.md](./supabase-api-exemplar.md) | API routes | Auth, RLS, tenant isolation, Zod validation |
| [react-component-exemplar.md](./react-component-exemplar.md) | React components | Theme CSS variables, TypeScript, accessibility |
| [database-migration-exemplar.md](./database-migration-exemplar.md) | SQL migrations | RLS policies, indexes, triggers, multi-tenant |
| [vitest-testing-exemplar.md](./vitest-testing-exemplar.md) | Testing | Unit tests, API mocking, parameterized tests |
| [server-action-exemplar.md](./server-action-exemplar.md) | Server Actions | Form handling, validation, mutations |

## How to Use

1. **Before implementing**, read the relevant exemplar
2. **Copy the good pattern**, not the bad pattern
3. **Adapt to your specific needs** while keeping the structure
4. **Check the checklist** at the bottom of each exemplar

## Technology Stack Reference

| Technology | Version | Exemplar Coverage |
|------------|---------|-------------------|
| Next.js | 15.5.9 | Pages, API routes, Server Actions |
| React | 19 | Components, hooks |
| TypeScript | 5.x | All exemplars |
| Supabase | 2.88.0 | API, migrations, auth |
| Tailwind CSS | 3.4.19 | Components |
| Vitest | 4.x | Testing |
| Zod | 4.x | Validation |

## Common Patterns Across Exemplars

### 1. Authentication Check
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  // Handle unauthenticated
}
```

### 2. Tenant Isolation
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('clinic_id')
  .eq('id', user.id)
  .single()

// Filter by clinic
.eq('clinic_id', profile.clinic_id)
```

### 3. Theme Variables
```tsx
className="bg-[var(--primary)] text-[var(--text-primary)]"
```

### 4. Spanish UI Text
```tsx
<button>Guardar</button>
<p>Error: No autorizado</p>
```

### 5. Zod Validation
```typescript
const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
})
```

## Anti-Patterns to Avoid

- `'use client'` when not needed
- Hardcoded colors (`#333`, `blue`)
- Missing `clinic_id` in queries
- No RLS policies
- `any` types
- English user-facing text
- Client-side data fetching when server-side possible
