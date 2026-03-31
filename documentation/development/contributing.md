# Contributing Guide

This document outlines how to contribute to the Vete veterinary platform.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- VS Code (recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/vete.git
cd vete/web

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Required variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
DATABASE_URL=postgresql://...
```

See `.env.example` for the full list.

---

## Code Style

### TypeScript

- Strict mode enabled (`strict: true`)
- Explicit return types on all functions
- Use `interface` for object shapes, `type` for unions
- No `any` types (use `unknown` if necessary)

### React/Next.js

- **Server Components by default** - only add `"use client"` when needed
- Server Actions for mutations (not API routes for forms)
- Small, focused components (< 200 lines)
- Props interface defined above component

### Styling

- **Tailwind utility classes only** - no custom CSS
- Theme colors via CSS variables: `bg-[var(--primary)]`
- **Never hardcode colors** like `bg-blue-500`
- Mobile-first responsive design

### Spanish Content

All user-facing text must be in Spanish:
- Error messages: `"No autorizado"`, `"Error al guardar"`
- Button labels: `"Guardar"`, `"Cancelar"`, `"Enviar"`

---

## Development Workflow

### Branch Naming

```
feature/add-vaccine-reminders
fix/booking-double-submit
refactor/split-invoice-actions
docs/update-api-reference
```

### Commit Messages

Use conventional commits:

```
feat: add vaccine reminder notifications
fix: prevent double form submission in booking
refactor: split invoices.ts into smaller modules
docs: add API authentication guide
```

### Pre-commit Hooks

The project uses husky + lint-staged:

- **lint-staged**: Runs ESLint and Prettier on staged files
- **pre-push**: Runs type-checking

To bypass hooks (not recommended):
```bash
git commit --no-verify -m "message"
```

---

## Making Changes

### Adding a New Feature

1. Create a feature branch from `main`
2. Implement the feature
3. Add/update tests
4. Update documentation if needed
5. Open a pull request

### Adding a Database Table

1. Create migration file: `web/db/XX_table_name.sql`
2. **Always enable RLS**:
   ```sql
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   ```
3. Create appropriate policies (see `documentation/database/rls-policies.md`)
4. Add `tenant_id` column for tenant-scoped tables

### Adding an API Route

Use the `withAuth` wrapper for all authenticated routes:

```typescript
import { withAuth } from '@/lib/api/with-auth'

export const GET = withAuth(async (request, { user, profile }) => {
  // Handler logic here
  return NextResponse.json(data)
})
```

### Adding a Server Action

1. Add to appropriate action file in `app/actions/`
2. Use `withActionAuth` wrapper for authenticated actions
3. Validate inputs with Zod schemas
4. Return `ActionResult` type for consistent handling

---

## Testing

### Running Tests

```bash
# Unit tests
npm run test:unit

# E2E tests (requires running app)
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Writing Tests

- Unit tests go in `tests/unit/`
- E2E tests go in `e2e/`
- Use factories from `lib/test-utils/factories/`

Example unit test:

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction(input)
    expect(result).toBe(expected)
  })
})
```

---

## Pull Request Process

1. Ensure all tests pass: `npm run test`
2. Ensure type checking passes: `npm run typecheck`
3. Ensure linting passes: `npm run lint`
4. Update documentation if needed
5. Request review from a team member

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] TypeScript strict mode passes
- [ ] ESLint passes
- [ ] Tests pass
- [ ] Documentation updated
```

---

## Architecture Guidelines

### Multi-Tenancy

- Every query must filter by `tenant_id`
- Use RLS policies as the last line of defense
- Never hardcode tenant IDs in code

### Error Handling

Use the standardized `ActionResult` pattern:

```typescript
// Success
return { success: true, data: result }

// Error
return { success: false, error: 'Error message' }
```

### Security

- Never commit secrets (`.env` files are gitignored)
- Use parameterized queries (never string interpolation)
- Validate all user inputs with Zod
- Check authentication on all API routes

---

## Common Issues

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules && npm install
```

### TypeScript Errors

```bash
# Check for type errors
npm run typecheck

# Generate types from database
npm run db:types
```

### Test Failures

```bash
# Run tests in watch mode for debugging
npm run test:unit -- --watch

# Run single test file
npm run test:unit -- path/to/test.ts
```

---

## Resources

- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../database/schema-reference.md)
- [API Reference](../api/overview.md)
- [Feature Documentation](../features/overview.md)

---

*Last updated: January 2025*
