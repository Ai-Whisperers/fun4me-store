# Development Setup

Complete guide for setting up your local development environment.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Comes with Node.js |
| Git | Latest | For version control |
| VS Code | Latest | Recommended IDE |

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/vete.git
cd vete
```

### 2. Install Dependencies

```bash
cd web
npm install
```

### 3. Environment Configuration

Create `.env.local` in the `web/` directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Direct DB connection for migrations
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Optional: Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database Setup

Run migrations in Supabase SQL Editor (in order):

```sql
-- Run each file from web/db/ in numerical order
-- 01_extensions.sql
-- 02_schema_core.sql
-- ...etc
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000/adris](http://localhost:3000/adris)

---

## Project Structure

```
web/
├── app/                    # Next.js App Router
│   ├── [clinic]/           # Multi-tenant routes
│   ├── api/                # REST API endpoints
│   ├── actions/            # Server Actions
│   └── auth/               # Auth routes
│
├── components/             # React components
│   ├── layout/             # Layout components
│   ├── ui/                 # UI primitives
│   ├── clinical/           # Clinical tools
│   └── ...
│
├── lib/                    # Utilities
│   ├── clinics.ts          # Content loading
│   └── supabase/           # DB clients
│
├── db/                     # SQL migrations
├── .content_data/          # JSON-CMS content
├── tests/                  # Test suite
├── e2e/                    # E2E tests
└── public/                 # Static assets
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test` | Run all tests |

---

## Code Style

### TypeScript

- Strict mode enabled
- Explicit return types for functions
- Interfaces over types for objects

```typescript
// Good
interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
}

function getPet(id: string): Promise<Pet> {
  // ...
}

// Avoid
type Pet = {
  id: string;
  name: string;
}
```

### React/Next.js

- Server Components by default
- Use `"use client"` only when necessary
- Keep components focused

```tsx
// Server Component (default)
export default async function PetList({ clinicId }: Props) {
  const pets = await getPets(clinicId);
  return <ul>{pets.map(pet => <li key={pet.id}>{pet.name}</li>)}</ul>;
}

// Client Component (when needed)
"use client";
export function PetForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  // ...
}
```

### Styling

- Tailwind utility classes
- CSS variables for theming
- Mobile-first responsive

```tsx
// Good - uses theme variables
<button className="bg-[var(--primary)] text-white px-4 py-2 rounded">
  Submit
</button>

// Avoid - hardcoded colors
<button className="bg-[#2F5233] text-white px-4 py-2 rounded">
  Submit
</button>
```

---

## Testing

### Unit Tests (Vitest)

```bash
npm run test:unit
```

Location: `tests/unit/`

```typescript
// tests/unit/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/utils';

describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024');
  });
});
```

### Integration Tests

```bash
npm run test:integration
```

Location: `tests/integration/`

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

Location: `e2e/`

```typescript
// e2e/public.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/adris');
  await expect(page).toHaveTitle(/Adris/);
});
```

---

## Debugging

### VS Code Launch Config

Add to `.vscode/launch.json`:

```json
{
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/web"
    }
  ]
}
```

### Chrome DevTools

1. Run `npm run dev`
2. Open Chrome DevTools
3. Use React DevTools extension
4. Use Network tab for API debugging

### Database Queries

Use Supabase Dashboard > SQL Editor for query testing:

```sql
-- Test a query
SELECT * FROM pets WHERE tenant_id = 'adris' LIMIT 10;
```

---

## Common Issues

### "Module not found" during build

Ensure Tailwind v3:
```bash
npm list tailwindcss
# Should show 3.4.x
```

### Supabase connection fails

1. Check `.env.local` values
2. Verify project is running in Supabase Dashboard
3. Check RLS policies allow access

### Content not loading

Verify `.content_data/` structure:
```
web/.content_data/
├── adris/
│   ├── config.json
│   └── ...
└── petlife/
    └── ...
```

### TypeScript errors

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

---

## Recommended Extensions

### VS Code

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- GitLens
- PostgreSQL

---

## Related Documentation

- [Quick Start](../getting-started/quick-start.md)
- [Architecture](../architecture/overview.md)
- [Testing Guide](testing.md)
- [Contributing](contributing.md)
