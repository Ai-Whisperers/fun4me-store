# Quick Reference Card

> Condensed patterns for fast context loading. See CLAUDE.md for full details.

## Tech Stack

- **Next.js 15** (App Router, Server Components)
- **TypeScript** (Strict mode)
- **Tailwind CSS 3.4.19** (NOT v4!)
- **Supabase** (PostgreSQL + Auth + Storage)
- **Vitest** + **Playwright** (Testing)

## Multi-Tenancy

- Routes: `/[clinic]/*` → `/adris/services`, `/petlife/book`
- Content: `web/.content_data/[clinic]/*.json`
- Database: `tenant_id` column + RLS policies
- Security: `is_staff_of(tenant_id)` function

## Roles

| Role    | Access                      |
| ------- | --------------------------- |
| `owner` | Own pets, appointments      |
| `vet`   | All patients, prescriptions |
| `admin` | Everything + settings       |

## Code Patterns

### API Route Template

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 2. Tenant
  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();

  // 3. Query
  const { data } = await supabase.from("table").select("*").eq("tenant_id", profile.tenant_id);

  return NextResponse.json(data);
}
```

### Page Template

```typescript
interface Props { params: Promise<{ clinic: string }> }

export async function generateStaticParams() {
  return [{ clinic: 'adris' }, { clinic: 'petlife' }]
}

export default async function Page({ params }: Props) {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) notFound()
  return <div className="text-[var(--text-primary)]">...</div>
}
```

### Component Template

```typescript
interface Props { title: string; onClick?: () => void }

export function Card({ title, onClick }: Props) {
  return (
    <div className="p-4 rounded-lg bg-[var(--bg-paper)] shadow">
      <h3 className="text-[var(--text-primary)]">{title}</h3>
    </div>
  )
}
```

### Migration Template

```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage" ON new_table FOR ALL
  USING (is_staff_of(tenant_id));
```

## Theme CSS Variables

```css
/* Primary colors */
var(--primary)          /* Main brand color */
var(--primary-light)
var(--primary-dark)
var(--primary-contrast)

/* Secondary */
var(--secondary)

/* Background */
var(--bg-default)       /* Page background */
var(--bg-paper)         /* Card background */
var(--bg-muted)

/* Text */
var(--text-primary)     /* Main text */
var(--text-secondary)
var(--text-muted)
```

## Spanish UI Text

| English      | Spanish       |
| ------------ | ------------- |
| Save         | Guardar       |
| Cancel       | Cancelar      |
| Delete       | Eliminar      |
| Edit         | Editar        |
| Submit       | Enviar        |
| Loading...   | Cargando...   |
| Error        | Error         |
| Unauthorized | No autorizado |
| Not found    | No encontrado |

## Key Files

| Purpose                 | Location                                   |
| ----------------------- | ------------------------------------------ |
| Clinic content loader   | `web/lib/clinics.ts`                       |
| Supabase server client  | `web/lib/supabase/server.ts`               |
| Supabase browser client | `web/lib/supabase/client.ts`               |
| Theme provider          | `web/components/clinic-theme-provider.tsx` |
| Layout with theme       | `web/app/[clinic]/layout.tsx`              |

## Commands

```bash
cd web
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test:unit    # Vitest
npm run test:e2e     # Playwright
```

## Critical Rules

1. Tailwind v3 only (no v4)
2. CSS variables for colors (no hardcoded)
3. RLS on all tables
4. Auth check on all APIs
5. tenant_id filter on all queries
6. Spanish for user text
7. Plugin exports must be explicit (Windows compat)
