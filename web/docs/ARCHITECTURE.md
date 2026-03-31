# Vete Architecture Overview

_Comprehensive technical documentation for the Vete veterinary platform_

**Last Updated:** 2026-02-06

---

## System Overview

Vete is a multi-tenant SaaS platform for veterinary clinics in Latin America. Each clinic gets a branded subdomain/path with their own data, completely isolated from other tenants.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│  Pet Owners (Portal)  │  Staff (Dashboard)  │  Admins (Admin)   │
└───────────────┬───────┴──────────┬──────────┴─────────┬─────────┘
                │                  │                    │
┌───────────────▼──────────────────▼────────────────────▼─────────┐
│                     NEXT.JS 15 APP ROUTER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /[clinic]   │  │ /dashboard  │  │ /admin                  │  │
│  │ Pet Portal  │  │ Staff UI    │  │ Platform Admin          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        API LAYER                                 │
│  312 API Routes  │  Server Actions  │  Webhooks  │  Cron Jobs   │
├─────────────────────────────────────────────────────────────────┤
│                     BUSINESS LOGIC                               │
│  lib/domain/     │  lib/services/   │  lib/schemas/             │
├─────────────────────────────────────────────────────────────────┤
│                     DATA LAYER                                   │
│  Supabase (PostgreSQL)  │  Drizzle ORM  │  Row-Level Security   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 15.5.9 | App Router, RSC, API Routes |
| **Language** | TypeScript 5.x | Strict mode, full type safety |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
| **Database** | Supabase (PostgreSQL) | Multi-tenant with RLS |
| **ORM** | Drizzle ORM 0.45 | Type-safe SQL queries |
| **Validation** | Zod 4.2 | Runtime type validation |
| **State** | Zustand 5.0 | Client-side state |
| **Data Fetching** | TanStack Query 5.90 | Server state management |
| **Forms** | React Hook Form 7.69 | Form management |
| **Auth** | Supabase Auth | JWT-based authentication |
| **Background Jobs** | Inngest 3.48 | Event-driven workflows |
| **Rate Limiting** | Upstash 2.0 | Redis-based rate limiting |
| **Payments** | Stripe 20.1 | Payment processing |
| **SMS** | Twilio 5.10 | SMS notifications |
| **Email** | Resend 6.6 | Transactional emails |
| **i18n** | next-intl 4.7 | Internationalization |
| **Testing** | Vitest 4.0 + Playwright 1.57 | Unit, integration, E2E |
| **Docs** | Storybook 8.6 | Component documentation |

---

## Directory Structure

```
web/
├── app/                          # Next.js App Router
│   ├── [clinic]/                 # Dynamic clinic routes
│   │   ├── dashboard/            # Staff dashboard (33 modules)
│   │   ├── portal/               # Pet owner portal
│   │   ├── book/                 # Booking flow
│   │   └── cart/                 # E-commerce cart
│   ├── api/                      # API routes (312 endpoints)
│   ├── admin/                    # Platform admin
│   └── auth/                     # Auth pages
│
├── lib/                          # Business logic (57 modules)
│   ├── domain/                   # Domain services
│   ├── schemas/                  # Zod validation schemas
│   ├── auth/                     # Auth utilities
│   ├── billing/                  # Billing logic
│   ├── clinical/                 # Clinical calculations
│   └── ...                       # 50+ more modules
│
├── components/                   # React components
│   ├── ui/                       # Shadcn/ui primitives
│   ├── dashboard/                # Dashboard components
│   ├── clinical/                 # Clinical components
│   └── ...                       # Domain-specific components
│
├── db/                           # Database
│   ├── migrations/               # SQL migrations (87+)
│   ├── seeds/                    # Test data
│   └── scripts/                  # DB utilities
│
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests (31 files)
│   ├── integration/              # Integration tests (80 files)
│   ├── api/                      # API tests (42 files)
│   └── e2e/                      # End-to-end tests
│
└── documentation/                # Additional docs
```

---

## Multi-Tenancy

### Routing Pattern

```
https://vete.app/[clinic-slug]/...
https://vete.app/terrapet/dashboard/patients
https://vete.app/clinicavet/portal
```

### Data Isolation

All tables include a `tenant_id` column. Row-Level Security (RLS) policies enforce isolation:

```sql
CREATE POLICY tenant_isolation ON patients
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Clinic Configuration

Each clinic has a JSON config for branding, features, and settings:

```typescript
interface ClinicConfig {
  slug: string;
  name: string;
  branding: { logo, colors, fonts };
  features: { ecommerce, loyalty, insurance };
  settings: { timezone, currency, locale };
}
```

---

## Feature Modules

### Patient Management
- Pet profiles with medical history
- Owner/client records
- Species, breeds, diagnosis codes

### Appointments
- Online booking with availability
- Calendar integration
- Automated reminders (SMS/Email)

### Clinical
- Medical records (SOAP notes)
- Prescriptions with drug dosing
- Vaccinations with schedules
- Laboratory orders and results
- Hospitalization with vitals tracking
- Diagnosis codes (ICD-VET)

### E-Commerce
- Product catalog
- Shopping cart
- Checkout with Stripe
- Inventory management
- Prescription verification

### Financial
- Invoicing with tax support
- Payment tracking
- Insurance claims
- Commissions tracking

### Analytics
- Operational metrics
- Revenue analytics
- Patient statistics
- Epidemiology tracking

---

## API Design

### Route Pattern

```
app/api/[resource]/route.ts         # Collection
app/api/[resource]/[id]/route.ts    # Single item
```

### Authentication

All routes use Supabase JWT auth:

```typescript
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

### Validation (Zod)

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(["dog", "cat", "bird", "other"]),
});

const result = schema.safeParse(body);
if (!result.success) {
  return Response.json({ error: result.error.issues }, { status: 400 });
}
```

---

## Testing Strategy

| Type | Count | Location | Purpose |
|------|-------|----------|---------|
| Unit | 31 files | tests/unit/ | Business logic |
| Integration | 80 files | tests/integration/ | Service layer |
| API | 42 files | tests/api/ | HTTP endpoints |
| E2E | 10+ files | tests/e2e/ | User flows |

**Current Status:** 1,626 tests passing

---

## Deployment

### Production
- **URL:** http://34.151.201.27
- **Platform:** GCP Compute Engine (e2-medium)
- **Database:** Supabase Cloud

### CI/CD
- GitHub Actions workflows
- Automated testing on PR
- Deploy on merge to main

---

## Security

- ✅ Row-Level Security (RLS) on all tables
- ✅ Rate limiting on API routes
- ✅ Zod validation (77/312 routes, expanding)
- ✅ Auth hardening with failed login monitoring
- ✅ HTTPS in production
- ✅ Environment variables for secrets

---

## Performance

- Server Components by default
- Edge-compatible where possible
- Query caching with React Query
- Optimized images with next/image
- Bundle analysis available (`npm run build:analyze`)

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow.

---

_Maintained by AI Whisperers_
