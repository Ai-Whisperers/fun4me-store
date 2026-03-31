# Vetic - Complete Project Documentation

> **Last Updated**: January 2026
> **Purpose**: Comprehensive reference for understanding, maintaining, and extending the Vetic veterinary platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Server Actions](#6-server-actions)
7. [Components Architecture](#7-components-architecture)
8. [Multi-Tenancy System](#8-multi-tenancy-system)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [JSON-CMS Content System](#10-json-cms-content-system)
11. [Key Workflows](#11-key-workflows)
12. [Testing Strategy](#12-testing-strategy)
13. [Development Guide](#13-development-guide)
14. [Common Issues & Solutions](#14-common-issues--solutions)

---

## 1. Executive Summary

**Vetic** is a multi-tenant SaaS veterinary clinic management platform built for the Paraguay market. It serves multiple veterinary clinics from a single codebase using dynamic routing and tenant isolation.

### Key Numbers

| Metric             | Count       |
| ------------------ | ----------- |
| REST API Endpoints | 82+         |
| Server Actions     | 27          |
| React Components   | 271         |
| Database Tables    | 100+        |
| Test Coverage      | 1,125 tests |
| Static Pages       | 127         |

### Core Features

- **Public Websites**: Each clinic gets a branded public website (services, team, contact)
- **Pet Owner Portal**: Pet profiles, vaccine records, appointments, medical history
- **Staff Dashboard**: Appointments, patients, invoices, inventory, analytics
- **E-Commerce Store**: Products, cart, checkout, coupons
- **Clinical Tools**: Drug dosage calculator, diagnosis codes, growth charts
- **Hospitalization**: Patient admission, vitals, treatments, medications
- **Laboratory**: Test ordering, results tracking
- **Insurance**: Policy management, claims processing
- **Communications**: Internal messaging, WhatsApp, SMS, email

---

## 2. Technology Stack

### Core Framework

| Technology   | Version    | Purpose                            |
| ------------ | ---------- | ---------------------------------- |
| Next.js      | 15.5.9     | React framework (App Router)       |
| React        | 19.2.3     | UI library                         |
| TypeScript   | 5.x        | Type safety (strict mode)          |
| Tailwind CSS | **3.4.19** | Styling (**DO NOT upgrade to v4**) |

### Database & Auth

| Technology         | Version | Purpose                      |
| ------------------ | ------- | ---------------------------- |
| Supabase           | 2.88.0  | PostgreSQL + Auth + Storage  |
| Row Level Security | -       | Tenant isolation at DB level |

### Form & Validation

| Technology      | Version | Purpose               |
| --------------- | ------- | --------------------- |
| React Hook Form | 7.69.0  | Form state management |
| Zod             | 4.2.1   | Runtime validation    |

### Data Management

| Technology     | Version | Purpose                 |
| -------------- | ------- | ----------------------- |
| TanStack Query | 5.90.12 | Server state caching    |
| Zustand        | 5.0.9   | Client state management |
| date-fns       | 4.1.0   | Date utilities          |

### UI & Features

| Technology          | Version  | Purpose         |
| ------------------- | -------- | --------------- |
| lucide-react        | 0.561.0  | Icons (600+)    |
| @react-pdf/renderer | 4.3.1    | PDF generation  |
| recharts            | 3.6.0    | Charts & graphs |
| framer-motion       | 12.23.26 | Animations      |

### Communication

| Technology | Version | Purpose         |
| ---------- | ------- | --------------- |
| Resend     | 6.6.0   | Email sending   |
| Twilio     | 5.10.7  | SMS & WhatsApp  |
| Inngest    | 3.48.1  | Background jobs |

### Testing

| Technology | Version | Purpose      |
| ---------- | ------- | ------------ |
| Vitest     | 4.0.16  | Unit testing |
| Playwright | 1.57.0  | E2E testing  |
| MSW        | 2.12.4  | API mocking  |

---

## 3. Project Structure

```
Vete/
├── web/                          # Main Next.js application
│   ├── app/
│   │   ├── [clinic]/             # Multi-tenant routes (dynamic)
│   │   │   ├── page.tsx          # Homepage
│   │   │   ├── services/         # Service catalog
│   │   │   ├── book/             # Appointment booking
│   │   │   ├── store/            # E-commerce
│   │   │   ├── portal/           # Pet owner portal (auth required)
│   │   │   └── dashboard/        # Staff dashboard (vet/admin only)
│   │   ├── api/                  # REST API routes (119 files)
│   │   └── actions/              # Server Actions (27 files)
│   │
│   ├── components/               # React components (271 files)
│   │   ├── ui/                   # Base design system
│   │   ├── dashboard/            # Staff dashboard
│   │   ├── portal/               # Owner portal
│   │   ├── booking/              # Appointment wizard
│   │   ├── store/                # E-commerce
│   │   ├── clinical/             # Clinical tools
│   │   └── [domain]/             # Feature-specific components
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── supabase/             # Database clients
│   │   ├── auth/                 # Auth wrappers
│   │   ├── validation/           # Zod schemas
│   │   └── [utilities]/          # Various helpers
│   │
│   ├── db/                       # SQL migrations (42 files)
│   │   ├── 10_core/              # Tenants, profiles
│   │   ├── 20_pets/              # Pets, vaccines
│   │   ├── 30_clinical/          # Lab, medical records
│   │   ├── 40_scheduling/        # Appointments
│   │   ├── 50_finance/           # Invoices, payments
│   │   ├── 60_store/             # E-commerce
│   │   └── [domains]/            # Other domains
│   │
│   ├── .content_data/            # JSON-CMS (clinic content)
│   │   ├── adris/                # Veterinaria Adris
│   │   ├── petlife/              # PetLife Center
│   │   └── _TEMPLATE/            # New clinic template
│   │
│   └── tests/                    # Test suite
│       ├── unit/                 # Unit tests
│       ├── integration/          # Integration tests
│       └── e2e/                  # Playwright tests
│
├── documentation/                # Technical docs (18+ files)
├── supabase/                     # Supabase config & migrations
└── CLAUDE.md                     # AI assistant context
```

---

## 4. Database Schema

### Domain Organization

The database is organized into 13 logical domains:

| Domain         | Prefix | Tables | Key Entities                                  |
| -------------- | ------ | ------ | --------------------------------------------- |
| Core           | 10\_   | 3      | tenants, profiles, clinic_invites             |
| Pets           | 20\_   | 4      | pets, vaccines, qr_tags, lost_pets            |
| Clinical       | 30\_   | 20+    | lab_orders, medical_records, hospitalizations |
| Scheduling     | 40\_   | 2      | services, appointments                        |
| Finance        | 50\_   | 12     | invoices, payments, expenses, loyalty         |
| Store          | 60\_   | 9+     | products, inventory, orders                   |
| Communications | 70\_   | 6      | messages, reminders                           |
| Insurance      | 80\_   | 5      | policies, claims                              |
| System         | 85\_   | 8+     | staff, audit, notifications                   |

### Core Tables

#### `tenants` - Multi-Tenancy Root

```sql
tenants (
  id TEXT PRIMARY KEY,           -- URL slug: "adris", "petlife"
  name TEXT,                     -- Display name
  settings JSONB,                -- Currency, timezone, modules
  plan TEXT,                     -- free, starter, professional
  is_active BOOLEAN
)
```

#### `profiles` - Users

```sql
profiles (
  id UUID PRIMARY KEY,           -- Links to auth.users
  tenant_id TEXT REFERENCES tenants,
  role TEXT,                     -- 'owner' | 'vet' | 'admin'
  full_name TEXT,
  email TEXT,
  phone TEXT
)
```

#### `pets` - Core Entity

```sql
pets (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles,
  tenant_id TEXT REFERENCES tenants,
  name TEXT,
  species TEXT,                  -- dog, cat, bird, etc.
  breed TEXT,
  birth_date DATE,
  microchip_number TEXT UNIQUE
)
```

#### `appointments`

```sql
appointments (
  id UUID PRIMARY KEY,
  tenant_id TEXT,
  pet_id UUID,
  vet_id UUID,
  service_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT                    -- pending, confirmed, completed, cancelled
)
```

#### `invoices` & `payments`

```sql
invoices (
  id UUID PRIMARY KEY,
  tenant_id TEXT,
  invoice_number TEXT,           -- INV-001, sequential
  status TEXT,                   -- draft, sent, paid, overdue
  subtotal DECIMAL,
  tax_amount DECIMAL,
  total DECIMAL
)

payments (
  id UUID PRIMARY KEY,
  invoice_id UUID,
  amount DECIMAL,
  payment_date TIMESTAMPTZ,
  payment_method TEXT
)
```

### Row-Level Security (RLS)

All tables use RLS for tenant isolation:

```sql
-- Staff can access all data in their tenant
CREATE POLICY "Staff manage" ON pets
  FOR ALL TO authenticated
  USING (is_staff_of(tenant_id))
  WITH CHECK (is_staff_of(tenant_id));

-- Owners can only see their own pets
CREATE POLICY "Owner view own" ON pets
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
```

**Key RLS Functions:**

- `is_staff_of(tenant_id)` - Returns true if user is vet/admin in tenant
- `is_owner_of(pet_id)` - Returns true if user owns the pet

---

## 5. API Reference

### API Organization

All API routes are in `web/app/api/`:

```
api/
├── appointments/         # Appointment CRUD
├── invoices/             # Invoice operations
├── store/                # E-commerce
├── lab-orders/           # Laboratory
├── hospitalizations/     # Patient admissions
├── pets/                 # Pet management
├── clients/              # Client/owner management
├── staff/                # Staff management
├── dashboard/            # Analytics & stats
├── messages/             # Internal messaging
├── whatsapp/             # WhatsApp integration
├── insurance/            # Insurance claims
└── [other-resources]/
```

### Authentication Wrapper

All routes use `withAuth` middleware:

```typescript
import { withAuth } from "@/lib/auth/api-wrapper";

export const GET = withAuth(
  async ({ user, profile, supabase, request }) => {
    // profile contains: tenant_id, role, id
    const { data } = await supabase
      .from("table")
      .select("*")
      .eq("tenant_id", profile.tenant_id); // MANDATORY

    return NextResponse.json(data);
  },
  { roles: ["vet", "admin"] } // Optional role restriction
);
```

### Common Endpoints

#### Appointments

| Method | Endpoint                          | Purpose              |
| ------ | --------------------------------- | -------------------- |
| GET    | `/api/appointments`               | List appointments    |
| POST   | `/api/appointments`               | Create appointment   |
| GET    | `/api/appointments/[id]`          | Get appointment      |
| PUT    | `/api/appointments/[id]`          | Update appointment   |
| POST   | `/api/appointments/[id]/check-in` | Check-in patient     |
| POST   | `/api/appointments/[id]/complete` | Complete appointment |
| GET    | `/api/appointments/slots`         | Available time slots |

#### Invoices

| Method | Endpoint                      | Purpose        |
| ------ | ----------------------------- | -------------- |
| GET    | `/api/invoices`               | List invoices  |
| POST   | `/api/invoices`               | Create invoice |
| GET    | `/api/invoices/[id]/pdf`      | Download PDF   |
| POST   | `/api/invoices/[id]/send`     | Email invoice  |
| POST   | `/api/invoices/[id]/payments` | Record payment |

#### Store

| Method | Endpoint                      | Purpose          |
| ------ | ----------------------------- | ---------------- |
| GET    | `/api/store/products`         | List products    |
| POST   | `/api/store/checkout`         | Process checkout |
| POST   | `/api/store/coupons/validate` | Validate coupon  |
| GET    | `/api/store/orders`           | Order history    |

### Error Response Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Recurso no encontrado",
    "status": 404
  }
}
```

---

## 6. Server Actions

Server Actions handle form submissions and mutations. Located in `web/app/actions/`:

### Action Files

| File                           | Purpose                      |
| ------------------------------ | ---------------------------- |
| `create-pet.ts`                | Create pet with photo upload |
| `create-appointment.ts`        | Book appointment             |
| `create-vaccine.ts`            | Add vaccination record       |
| `update-appointment-status.ts` | Check-in/complete            |
| `invoices.ts`                  | Invoice operations           |
| `assign-tag.ts`                | Assign QR tag to pet         |
| `contact-form.ts`              | Contact page form            |
| `invite-client.ts`             | Send client invite           |
| `invite-staff.ts`              | Send staff invite            |
| `whatsapp.ts`                  | WhatsApp integration         |

### Action Pattern

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1, "Campo requerido"),
  species: z.enum(["dog", "cat", "bird"]),
});

export async function createPet(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado" };

  // 2. Validation
  const validation = schema.safeParse(Object.fromEntries(formData));
  if (!validation.success) {
    return {
      success: false,
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  // 3. Database operation
  const { error } = await supabase.from("pets").insert({
    ...validation.data,
    owner_id: user.id,
    tenant_id: profile.tenant_id,
  });

  if (error) return { success: false, error: "Error al guardar" };

  // 4. Revalidate & redirect
  revalidatePath("/portal/pets");
  return { success: true };
}
```

---

## 7. Components Architecture

### Component Categories

| Category     | Count | Purpose                                  |
| ------------ | ----- | ---------------------------------------- |
| `ui/`        | 40+   | Base design system (Button, Card, Input) |
| `dashboard/` | 25+   | Staff dashboard widgets                  |
| `portal/`    | 20+   | Pet owner portal                         |
| `booking/`   | 10+   | Appointment wizard                       |
| `store/`     | 15+   | E-commerce                               |
| `clinical/`  | 10+   | Clinical tools                           |
| `forms/`     | 15+   | Validated forms                          |

### Key Components

#### UI Components (`components/ui/`)

- `Button`, `Card`, `Badge` - Core elements
- `Input`, `Textarea`, `Select` - Form inputs
- `DataTable` - Sortable/filterable tables
- `Modal`, `SlideOver`, `Dialog` - Overlays
- `Tooltip`, `Breadcrumb` - Navigation aids
- `Skeleton` - Loading states

#### Dashboard Components (`components/dashboard/`)

- `DashboardShell` - Layout wrapper
- `StatsCards` - KPI metrics
- `AppointmentList` - Today's schedule
- `WaitingRoomStatus` - Check-in tracker
- `RevenueChart` - Financial overview

#### Booking Components (`components/booking/`)

- `BookingWizard` - Multi-step form
- `ServiceSelector` - Choose service
- `DateTimeSelection` - Pick slot
- `PetSelector` - Select pet
- `Confirmation` - Review & confirm

### Styling Pattern

**Always use CSS variables for colors:**

```tsx
// ✅ CORRECT
<div className="bg-[var(--primary)] text-[var(--text-primary)]">

// ❌ WRONG - Never hardcode colors
<div className="bg-blue-500 text-gray-900">
```

**CSS Variables (defined in theme.json):**

- `--primary`, `--primary-dark`, `--primary-light`
- `--secondary`, `--accent`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--bg-default`, `--bg-subtle`, `--bg-card`
- `--border`, `--error`, `--success`, `--warning`

---

## 8. Multi-Tenancy System

### URL Structure

```
http://localhost:3000/[clinic-slug]/[page]

Examples:
├── /adris                    → Adris homepage
├── /adris/services           → Adris services
├── /adris/portal             → Adris owner portal
├── /adris/dashboard          → Adris staff dashboard
├── /petlife                  → PetLife homepage
└── /petlife/dashboard        → PetLife staff dashboard
```

### Tenant Identification

1. **URL Slug**: Extracted from `params.clinic`
2. **Database Lookup**: `tenants` table matches slug to config
3. **User Profile**: `profiles.tenant_id` links users to clinics
4. **Content Loading**: `getClinicData(slug)` loads JSON-CMS

### Tenant Isolation

**Every database query must filter by tenant_id:**

```typescript
// In API route or Server Action
const { data } = await supabase
  .from("pets")
  .select("*")
  .eq("tenant_id", profile.tenant_id); // MANDATORY!
```

**RLS enforces at database level:**

```sql
CREATE POLICY "Staff manage" ON pets
  USING (is_staff_of(tenant_id));
```

### Adding a New Clinic

1. Create folder: `web/.content_data/[clinic-slug]/`
2. Copy from `_TEMPLATE/`: config.json, theme.json, etc.
3. Customize content and branding
4. Add to database: `INSERT INTO tenants (id, name) VALUES ('slug', 'Name');`
5. Deploy - routes auto-generate

---

## 9. Authentication & Authorization

### Auth Flow

1. **Login**: Supabase Auth (email/password)
2. **Session**: Stored in cookies, refreshed in middleware
3. **Profile**: Created automatically on signup via `handle_new_user()` trigger

### User Roles

| Role    | Access                                 |
| ------- | -------------------------------------- |
| `owner` | Own pets, appointments, invoices       |
| `vet`   | All patients in clinic, clinical tools |
| `admin` | Everything + settings, team, finance   |

### Route Protection

```
Public:     /[clinic]/*        (homepage, services, etc.)
Auth:       /[clinic]/portal/* (login required)
Staff:      /[clinic]/dashboard/* (vet/admin only)
```

### Middleware (`middleware.ts`)

```typescript
// Protects routes, refreshes sessions
if (path.includes("/dashboard")) {
  if (profile?.role !== "vet" && profile?.role !== "admin") {
    return redirect("/portal");
  }
}
```

---

## 10. JSON-CMS Content System

### File Structure

```
.content_data/
├── adris/                    # Clinic content
│   ├── config.json           # Settings, modules, branding
│   ├── theme.json            # Colors, fonts, CSS variables
│   ├── home.json             # Homepage content
│   ├── services.json         # Service catalog
│   ├── about.json            # Team, mission, facilities
│   ├── faq.json              # FAQ items
│   ├── testimonials.json     # Customer reviews
│   └── legal.json            # Privacy, terms
└── _TEMPLATE/                # Copy for new clinics
```

### config.json Example

```json
{
  "id": "adris",
  "name": "Veterinaria Adris",
  "contact": {
    "phone": "+595 981 123 456",
    "email": "info@adris.vet",
    "address": "Av. Mariscal López 1234"
  },
  "settings": {
    "currency": "PYG",
    "timezone": "America/Asuncion",
    "modules": {
      "store": true,
      "booking": true,
      "lab": true,
      "hospitalization": true
    }
  },
  "branding": {
    "logo_url": "/branding/adris/logo.png",
    "hero_image": "/branding/adris/hero-bg.jpg"
  }
}
```

### theme.json Example

```json
{
  "colors": {
    "primary": "#2563eb",
    "primary_dark": "#1d4ed8",
    "secondary": "#64748b",
    "accent": "#f59e0b",
    "text_primary": "#1e293b",
    "text_secondary": "#475569",
    "background": "#ffffff",
    "surface": "#f8fafc"
  },
  "fonts": {
    "heading": "Poppins",
    "body": "Inter"
  }
}
```

### Loading Content

```typescript
import { getClinicData } from "@/lib/clinics";

export default async function Page({ params }) {
  const { clinic } = await params;
  const clinicData = await getClinicData(clinic);

  if (!clinicData) notFound();

  return (
    <ClinicThemeProvider clinicData={clinicData}>
      <PageContent data={clinicData.home} />
    </ClinicThemeProvider>
  );
}
```

---

## 11. Key Workflows

### Appointment Booking Flow

```
1. User selects service → /book
2. Picks date/time → slots API checks availability
3. Selects/creates pet
4. Confirms booking
5. Server Action creates appointment
6. Email confirmation sent
7. Appears in dashboard waiting room
```

### Invoice Flow

```
1. Staff creates invoice (line items)
2. Status: draft
3. Send to client (email/PDF)
4. Status: sent
5. Client pays → Staff records payment
6. Status: paid
```

### Hospitalization Flow

```
1. Admit patient → assign kennel
2. Record vitals periodically
3. Administer medications
4. Log feedings
5. Daily treatments
6. Discharge → generate invoice
```

### Pet Registration Flow

```
1. Owner creates account (or invited)
2. Adds pet profile
3. Optional: assigns QR tag
4. Vet adds vaccines, records
5. Owner sees history in portal
```

---

## 12. Testing Strategy

### Test Structure

```
tests/
├── unit/                 # Fast, isolated tests
│   ├── actions/          # Server action tests
│   ├── lib/              # Utility tests
│   └── components/       # Component tests
├── integration/          # Database integration
└── e2e/                  # Full browser tests
```

### Running Tests

```bash
# Unit tests (fast)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (slow)
npm run test:e2e

# All tests
npm test

# Coverage report
npm run test:coverage
```

### Example Test

```typescript
// tests/unit/actions/create-pet.test.ts
describe("createPet", () => {
  it("validates required fields", async () => {
    const formData = new FormData();
    formData.append("name", ""); // Invalid

    const result = await createPet(null, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toBeDefined();
  });
});
```

---

## 13. Development Guide

### Setup

```bash
# Clone repository
git clone <repo>
cd Vete/web

# Install dependencies
npm install

# Environment setup
cp .env.example .env.local
# Edit with Supabase credentials

# Start dev server
npm run dev
```

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint check
npm run typecheck        # TypeScript check

# Testing
npm run test:unit        # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report

# Database
npm run db:generate      # Generate types from schema
npm run db:seed          # Seed demo data
```

### Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
DATABASE_URL=postgresql://...

# Optional
RESEND_API_KEY=xxx           # Email
TWILIO_ACCOUNT_SID=xxx       # SMS/WhatsApp
INNGEST_API_KEY=xxx          # Background jobs
```

### Adding a New Feature

1. **Database**: Add migration in `db/XX_domain/`
2. **API Route**: Create in `app/api/[resource]/route.ts`
3. **Server Action**: Add in `app/actions/`
4. **Component**: Create in `components/[domain]/`
5. **Page**: Add in `app/[clinic]/[page]/page.tsx`
6. **Tests**: Write in `tests/`

---

## 14. Common Issues & Solutions

### Issue: Build fails with Tailwind error

**Cause**: Tailwind v4 was installed
**Solution**: Keep Tailwind at v3.4.19

```bash
npm install tailwindcss@3.4.19
```

### Issue: Cross-tenant data leak

**Cause**: Missing `tenant_id` filter in query
**Solution**: Always filter:

```typescript
.eq('tenant_id', profile.tenant_id)
```

### Issue: Colors don't match theme

**Cause**: Hardcoded colors like `bg-blue-500`
**Solution**: Use CSS variables:

```tsx
className = "bg-[var(--primary)]";
```

### Issue: Auth redirect loop

**Cause**: Middleware misconfiguration
**Solution**: Check `middleware.ts` matcher patterns

### Issue: Form validation not in Spanish

**Cause**: Default Zod messages
**Solution**: Add Spanish messages:

```typescript
z.string().min(1, "Campo requerido");
```

### Issue: Large commit fails to push

**Solution**: Increase buffer:

```bash
git config http.postBuffer 524288000
```

---

## Quick Reference

### Key Files

| File                          | Purpose                      |
| ----------------------------- | ---------------------------- |
| `CLAUDE.md`                   | AI context, coding standards |
| `middleware.ts`               | Route protection             |
| `lib/supabase/server.ts`      | Database client              |
| `lib/auth/api-wrapper.ts`     | Auth middleware              |
| `lib/clinics.ts`              | JSON-CMS loader              |
| `.content_data/*/config.json` | Clinic settings              |

### Critical Rules

1. **Always filter by `tenant_id`** in every query
2. **Never hardcode colors** - use CSS variables
3. **Keep Tailwind at v3.4.19** - don't upgrade
4. **All user text in Spanish** (Paraguay market)
5. **Use Server Components** by default
6. **Test before committing** - run `npm test`

---

_For detailed technical documentation, see the `documentation/` folder._
_For AI assistant context, see `CLAUDE.md`._
