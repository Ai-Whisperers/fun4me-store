# Vete - Multi-Tenant Veterinary Platform

> SaaS veterinary clinic management. Next.js 15 + Supabase + TypeScript. Multi-tenant via `/[clinic]/*` routing.

## Table of Contents
- [Quick Rules](#quick-rules)
- [Critical Warnings](#critical-warnings)
- [Architecture](#architecture)
- [Coding Standards](#coding-standards)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)

---

## Quick Rules

| Rule | Details |
|------|---------|
| **Multi-tenant** | All queries MUST filter by `tenant_id` |
| **RLS** | All tables MUST have Row-Level Security |
| **Theme** | Use `var(--primary)`, NEVER `bg-blue-500` |
| **Language** | All UI text in Spanish |
| **Server-first** | Default to Server Components |
| **Auth** | Every API route checks auth first |
| **Error Handling** | NEVER silently swallow errors - always log or rethrow |

## Critical Warnings

```
⛔ NEVER upgrade Tailwind to v4 (JSON scanning breaks build)
⛔ NEVER create tables without RLS policies
⛔ NEVER hardcode colors - use CSS variables only
⛔ NEVER skip tenant_id in queries
⛔ NEVER use raw SQL in components - use Supabase client
⛔ NEVER commit .env files or credentials
⛔ NEVER silently swallow errors in catch blocks
```

### Error Handling (MANDATORY)

**"Throw it in the ocean and hope it floats" is FORBIDDEN.**

```typescript
// ❌ FORBIDDEN patterns
try { await op(); } catch (e) { /* silently fail */ }
try { await op(); } catch (e) { return null; }
try { await op(); } catch (e) { /* not critical */ }

// ✅ REQUIRED patterns
try {
  await op();
} catch (error) {
  console.error('[Module/fn] Error:', error);
  throw error; // OR return { success: false, error: msg }
}
```

Every catch block MUST either:
1. **Log + Rethrow** - For critical operations
2. **Log + Return structured error** - For service methods
3. **Log warning + Fallback** - For truly optional operations (document why)

---

## Architecture

```
Browser → Next.js 15 (App Router) → Supabase (PostgreSQL + Auth + Storage)
           ├── /[clinic]/*     Dynamic multi-tenant pages
           ├── /api/*          REST APIs (auth + tenant required)
           ├── /actions/*      Server Actions (mutations)
           └── /auth/*         Supabase Auth routes
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `web/app/[clinic]/` | Multi-tenant routes (portal, dashboard, booking) |
| `web/lib/services/` | Business logic (BaseService pattern) |
| `web/lib/hooks/` | Custom React hooks (8 hooks) |
| `web/.content_data/` | JSON-CMS per clinic (hidden from Tailwind) |
| `web/db/` | SQL migrations (numbered: `XX_name.sql`) |
| `.claude/exemplars/` | Code pattern references |

### User Roles

| Role | Access |
|------|--------|
| `owner` | Own pets, book appointments, view records |
| `vet` | All patients, prescriptions, clinical tools |
| `admin` | Everything + settings, team, finances |

Security: `is_staff_of(tenant_id)` checks vet/admin access.

---

## Coding Standards

### TypeScript
```typescript
// ✅ DO: Explicit types, interfaces for objects
interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'other';
}

// ❌ DON'T: any, implicit returns
const getPet = (id) => fetch(`/api/pets/${id}`);
```

### React Components
```typescript
// ✅ DO: Server Components by default, theme variables
export default async function PetCard({ pet }: { pet: Pet }) {
  return (
    <div className="bg-[var(--bg-card)] text-[var(--text-primary)]">
      {pet.name}
    </div>
  );
}

// ❌ DON'T: Unnecessary "use client", hardcoded colors
"use client";
export function PetCard({ pet }) {
  return <div className="bg-white text-gray-800">{pet.name}</div>;
}
```

### API Routes (Required Pattern)
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth check (REQUIRED)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 2. Get tenant (REQUIRED)
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  // 3. Query with tenant filter (REQUIRED)
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("tenant_id", profile.tenant_id);

  return NextResponse.json(data);
}
```

### Database Migrations
```sql
-- web/db/XX_new_table.sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),  -- REQUIRED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REQUIRED: Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- REQUIRED: Create policies
CREATE POLICY "Staff manage" ON new_table FOR ALL
  USING (is_staff_of(tenant_id));
```

### Anti-Patterns to Avoid

```typescript
// ❌ Query without tenant filter
const { data } = await supabase.from('pets').select('*');

// ❌ Hardcoded tenant
.eq('tenant_id', 'adris')

// ❌ String interpolation in queries
.from(`${tableName}`).eq('id', `${userId}`)

// ❌ Missing error handling
const { data } = await supabase.from('pets').select('*');
return NextResponse.json(data); // Error ignored!

// ❌ English error messages
return NextResponse.json({ error: "Unauthorized" });
// ✅ Use Spanish
return NextResponse.json({ error: "No autorizado" });
```

---

## Common Tasks

### Add New Clinic
1. Copy `web/.content_data/_TEMPLATE/` to `web/.content_data/[slug]/`
2. Edit `config.json` (name, contact, modules)
3. Edit `theme.json` (colors, fonts)
4. Add record to `tenants` table in Supabase
5. (Optional) Add custom domain:
   ```bash
   node scripts/domains.mjs add clinic.com [slug] --type primary
   node scripts/domains.mjs sync-vercel  # If using Vercel
   ```

### Add New Page
```typescript
// web/app/[clinic]/new-page/page.tsx
import { getClinicData } from "@/lib/clinics";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ clinic: string }>;
}

export async function generateStaticParams() {
  return [{ clinic: "adris" }, { clinic: "petlife" }];
}

export default async function NewPage({ params }: Props) {
  const { clinic } = await params;
  const clinicData = await getClinicData(clinic);
  if (!clinicData) notFound();

  return <h1 className="text-[var(--text-primary)]">{clinicData.config.name}</h1>;
}
```

### Add Service Layer
```typescript
// web/lib/services/pet-service.ts
import { BaseService, ServiceResult } from './base-service';

export class PetService extends BaseService {
  async list(tenantId: string): Promise<ServiceResult<Pet[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('pets')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data;
    }, 'Error al cargar mascotas');
  }
}
```

### Use Custom Hooks
```typescript
import { useAsyncData, useModal } from "@/lib/hooks";
import { useForm } from "react-hook-form";

// Data fetching
const { data, isLoading, error } = useAsyncData(
  () => fetch("/api/pets").then(r => r.json()),
  [tenantId]
);

// Form with validation (use react-hook-form)
const form = useForm({ defaultValues: { name: "" } });

// Modal state
const modal = useModal();
modal.open();
```

---

## Troubleshooting

### Build Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module` | Missing dependency | `npm install` in `web/` |
| JSON parsing in Tailwind | Tailwind v4 installed | Downgrade to `3.4.19` |
| RLS policy error | Missing tenant filter | Add `.eq('tenant_id', tenantId)` |

### Runtime Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 401 on API | Missing/invalid auth | Check `supabase.auth.getUser()` |
| Empty data | Wrong tenant | Verify `profile.tenant_id` |
| Theme not applied | Hardcoded colors | Use `var(--primary)` syntax |

### Common Debugging

```typescript
// Debug auth issues
const { data: { user }, error } = await supabase.auth.getUser();
console.log('Auth:', { user: user?.id, error: error?.message });

// Debug tenant issues
const { data: profile } = await supabase
  .from('profiles')
  .select('tenant_id, role')
  .eq('id', user.id)
  .single();
console.log('Profile:', profile);

// Debug RLS issues - run in Supabase SQL editor
SELECT * FROM pets WHERE tenant_id = 'adris';
```

---

## Reference

### Commands

```bash
cd web
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test:unit    # Vitest
npm run test:e2e     # Playwright

# Domain Management
npm run domains              # Show help
npm run domains:list         # List all domains
npm run domains:validate     # Validate configuration
npm run domains:sync         # Sync with Vercel API
npm run domains:cloudflare   # Generate Cloudflare tunnel config
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -t vete .
docker run -p 3000:3000 --env-file ./web/.env.local vete

# With Docker Compose
docker-compose up

# With Cloudflare tunnel
docker-compose --profile tunnel up
```

### Slash Commands

| Command | Purpose |
|---------|---------|
| `/add-feature` | Add new feature with patterns |
| `/add-api` | Create API route |
| `/add-migration` | Create SQL migration |
| `/add-component` | Create themed component |
| `/run-tests` | Execute tests |
| `/review-code` | Code review |

### Exemplars

Reference implementations in `.claude/exemplars/`:
- `nextjs-page-exemplar.md` - Server Components, multi-tenant
- `supabase-api-exemplar.md` - Auth, RLS patterns
- `react-component-exemplar.md` - Theme variables
- `database-migration-exemplar.md` - RLS policies
- `vitest-testing-exemplar.md` - Unit tests
- `server-action-exemplar.md` - Form mutations

### Technology Stack

| Component | Version | Notes |
|-----------|---------|-------|
| Next.js | 15.5.9 | App Router, Server Components |
| TypeScript | 5.x | Strict mode |
| Tailwind | **3.4.19** | **DO NOT upgrade to v4** |
| Supabase | 2.88.0 | PostgreSQL + Auth + Storage |
| Drizzle | 0.45.1 | Type-safe ORM |
| Vitest | 4.0.16 | Unit tests |
| Playwright | 1.57.0 | E2E tests |

### Key Files

| Purpose | Location |
|---------|----------|
| Supabase client (server) | `web/lib/supabase/server.ts` |
| Supabase client (browser) | `web/lib/supabase/client.ts` |
| Clinic data loader | `web/lib/clinics.ts` |
| Domain resolver | `web/lib/domains.ts` |
| Theme provider | `web/app/[clinic]/layout.tsx` |
| Custom hooks | `web/lib/hooks/index.ts` |
| Type definitions | `web/lib/types/` |
| Constants | `web/lib/constants/` |
| Domain registry | `web/.content_data/domains.json` |
| Environment variables | `docs/ENV_COMPLETE_REFERENCE.md` (77 variables) |

### Documentation

| Topic | Location |
|-------|----------|
| Full architecture | `docs/ARCHITECTURE.md` |
| Domain management | `docs/DOMAIN_MANAGEMENT.md` |
| Docker deployment | `docs/DOCKER_DEPLOYMENT.md` |
| Cloudflare tunnels | `docs/CLOUDFLARE_TUNNELS.md` |
| Environment variables | `docs/ENV_COMPLETE_REFERENCE.md` |
| Security guidelines | `docs/SECURITY_GUIDELINES.md` |
| Security audit | `.claude/SUPABASE_AUDIT.md` |
| Refactoring plan | `REFACTORING_TICKETS.md` |

### Environment Variables

Required in `web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://...
```

See `docs/ENV_COMPLETE_REFERENCE.md` for all 77 variables (4 required, 73 optional).

---

## Database Quick Reference

### Core Tables
- `tenants` - Clinic organizations
- `profiles` - User profiles (role, tenant)
- `pets` - Pet records
- `appointments` - Scheduling
- `medical_records` - Health records
- `vaccines` - Vaccination tracking
- **100+ total tables** (see schema reference)

### Migrations
- **94 sequential migrations** (001-094)
- Location: `web/db/migrations/`
- Run order enforced by numeric prefix

### Security Functions
- `is_staff_of(tenant_id)` - Check vet/admin role
- `auth.uid()` - Current user ID

### Atomic Operations (use PostgreSQL functions)
- `create_lab_order_atomic` - Lab order + items
- `update_appointment_status_atomic` - Status with locking
- `process_waitlist_on_cancellation` - Waitlist cascade

Full schema: `documentation/database/schema-reference.md`

---

_Last updated: January 2026_
