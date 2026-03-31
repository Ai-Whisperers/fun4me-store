# Review Code

Perform a code review following project standards.

## Review Checklist

### 1. TypeScript Quality
- [ ] No `any` types (use `unknown` if needed)
- [ ] Explicit return types on functions
- [ ] Proper interface/type definitions
- [ ] Zod validation at boundaries

### 2. React/Next.js Patterns
- [ ] Server Components where possible
- [ ] `"use client"` only when necessary
- [ ] No unnecessary `useEffect`
- [ ] Proper loading/error states
- [ ] Keys on list items

### 3. Security
- [ ] No SQL injection (parameterized queries)
- [ ] No XSS (escaped output)
- [ ] Authentication checks on protected routes
- [ ] Authorization checks for role-specific actions
- [ ] RLS policies on database tables

### 4. Multi-Tenancy
- [ ] Data filtered by `clinic_id`
- [ ] No cross-tenant data leaks
- [ ] Tenant context passed correctly

### 5. Styling
- [ ] Tailwind classes (no inline styles)
- [ ] CSS variables for theme colors
- [ ] Mobile-first responsive
- [ ] Consistent spacing

### 6. Performance
- [ ] No unnecessary re-renders
- [ ] Images optimized (next/image)
- [ ] Database queries efficient
- [ ] Proper indexes exist

### 7. Testing
- [ ] Tests cover new functionality
- [ ] Edge cases handled
- [ ] No flaky tests

### 8. Code Quality
- [ ] DRY (no duplicated code)
- [ ] Single responsibility
- [ ] Meaningful names
- [ ] Comments only where non-obvious

## Red Flags

Look for these issues:

```typescript
// BAD: any type
const data: any = await fetch()

// BAD: Missing error handling
const { data } = await supabase.from('x').select()

// BAD: Hardcoded clinic
if (clinic === 'adris') { }

// BAD: SQL injection risk
`SELECT * FROM pets WHERE name = '${name}'`

// BAD: Inline styles
<div style={{ color: 'blue' }}>
```

## Good Patterns

```typescript
// GOOD: Typed response
interface Pet { id: string; name: string }
const { data, error } = await supabase.from('pets').select<Pet>()

// GOOD: Error handling
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// GOOD: Theme colors
<div className="bg-[var(--primary)] text-[var(--primary-contrast)]">

// GOOD: Tenant isolation
.eq('clinic_id', profile.clinic_id)
```

## After Review

1. List issues found with file:line references
2. Categorize by severity (critical, warning, suggestion)
3. Provide fix examples for critical issues
4. Verify fixes don't break existing functionality
