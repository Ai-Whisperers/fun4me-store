# Multi-Tenancy Architecture

Deep dive into how Vete serves multiple veterinary clinics from a single codebase.

## Overview

Vete uses a **single-codebase, multi-tenant architecture** where:

- One Next.js application serves all clinics
- Each clinic has isolated content and data
- Dynamic routing handles clinic-specific URLs
- Row-Level Security ensures data isolation

## Routing Pattern

### Dynamic Clinic Routes

```
URL: /adris/services
     └─┬──┘ └──┬───┘
       │       │
       │       └── Page within clinic site
       └────────── Clinic identifier (tenant slug)
```

### Route Structure

```
app/
├── [clinic]/
│   ├── layout.tsx          # Loads clinic config, applies theme
│   ├── page.tsx            # Clinic homepage
│   ├── about/
│   │   └── page.tsx
│   ├── services/
│   │   ├── page.tsx
│   │   └── [serviceId]/
│   │       └── page.tsx
│   ├── portal/             # Authenticated pages
│   │   ├── login/
│   │   ├── pets/
│   │   └── dashboard/
│   └── tools/
│       └── ...
```

### Static Generation

Clinic pages are pre-rendered at build time:

```typescript
// app/[clinic]/layout.tsx
export async function generateStaticParams() {
  const clinics = await getAllClinics();
  return clinics.map((clinic) => ({
    clinic: clinic.slug,
  }));
}
```

This generates:
- `/adris/*` pages
- `/petlife/*` pages
- Any other configured clinics

## Content Isolation

### JSON-CMS Structure

```
.content_data/
├── _TEMPLATE/              # Template for new clinics
│   ├── config.json
│   ├── theme.json
│   └── ...
├── adris/
│   ├── config.json         # Adris-specific config
│   ├── theme.json          # Adris colors/fonts
│   ├── home.json           # Adris homepage content
│   └── services.json       # Adris services
└── petlife/
    ├── config.json         # PetLife-specific config
    ├── theme.json          # PetLife colors/fonts
    └── ...
```

### Content Loading

```typescript
// lib/clinics.ts
export async function getClinicData(slug: string): Promise<ClinicData> {
  const basePath = `.content_data/${slug}`;

  const config = await readJson(`${basePath}/config.json`);
  const theme = await readJson(`${basePath}/theme.json`);
  const home = await readJson(`${basePath}/home.json`);
  const services = await readJson(`${basePath}/services.json`);

  return { config, theme, home, services, ... };
}

export async function getAllClinics(): Promise<string[]> {
  const dirs = await readdir('.content_data');
  return dirs.filter(d => !d.startsWith('_'));
}
```

### Usage in Pages

```tsx
// app/[clinic]/page.tsx
export default async function ClinicHomepage({ params }: Props) {
  const clinicData = await getClinicData(params.clinic);

  return (
    <div>
      <h1>{clinicData.config.name}</h1>
      <Hero content={clinicData.home.hero} />
      <Services services={clinicData.services} />
    </div>
  );
}
```

## Database Isolation

### Tenant Column Pattern

Every table includes a `tenant_id` column:

```sql
CREATE TABLE pets (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    ...
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    ...
);
```

### Row-Level Security

RLS policies ensure users only see their tenant's data:

```sql
-- Users can only see pets in their tenant
CREATE POLICY "Tenant pet access"
ON pets FOR SELECT
USING (
    tenant_id = (
        SELECT tenant_id
        FROM profiles
        WHERE id = auth.uid()
    )
);

-- Staff can manage pets in their tenant
CREATE POLICY "Staff manage pets"
ON pets FOR ALL
USING (is_staff_of(tenant_id));
```

### Authorization Helper

```sql
CREATE FUNCTION is_staff_of(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND tenant_id = in_tenant_id
        AND role IN ('vet', 'admin')
    );
$$ LANGUAGE sql SECURITY DEFINER;
```

## Theme Isolation

### Theme Configuration

Each clinic has a `theme.json`:

```json
{
  "colors": {
    "primary": {
      "main": "#2F5233",
      "light": "#4A7A50",
      "dark": "#1E3622"
    },
    "background": {
      "default": "#FAFAF5",
      "paper": "#FFFFFF"
    },
    "text": {
      "primary": "#333333",
      "secondary": "#666666"
    }
  },
  "gradients": {
    "primary": "linear-gradient(135deg, #2F5233 0%, #4A7A50 100%)"
  },
  "fonts": {
    "heading": "Poppins",
    "body": "Inter"
  }
}
```

### Theme Provider

```tsx
// components/clinic-theme-provider.tsx
"use client";

export function ClinicThemeProvider({ theme, children }: Props) {
  useEffect(() => {
    const root = document.documentElement;

    // Inject CSS variables
    root.style.setProperty('--primary', theme.colors.primary.main);
    root.style.setProperty('--primary-light', theme.colors.primary.light);
    root.style.setProperty('--primary-dark', theme.colors.primary.dark);
    root.style.setProperty('--bg-default', theme.colors.background.default);
    root.style.setProperty('--bg-paper', theme.colors.background.paper);
    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--gradient-primary', theme.gradients.primary);
    // ... more variables

  }, [theme]);

  return <>{children}</>;
}
```

### Usage in Components

```tsx
// No hardcoded colors - uses CSS variables
<button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white">
  Book Now
</button>

<div className="bg-[var(--bg-default)]">
  <h1 className="text-[var(--text-primary)]">Welcome</h1>
</div>
```

## User Association

### Profile-Tenant Relationship

Users are linked to tenants via the `profiles` table:

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    email TEXT NOT NULL,
    role TEXT NOT NULL, -- 'owner', 'vet', 'admin'
    ...
);
```

### New User Flow

```sql
-- On signup, user is associated with tenant
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for invite (staff) or default to adris (pet owner)
    INSERT INTO profiles (id, tenant_id, role, ...)
    VALUES (NEW.id, 'adris', 'owner', ...);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Staff Invitation

```sql
-- Staff invites associate user with clinic and role
INSERT INTO clinic_invites (tenant_id, email, role)
VALUES ('adris', 'vet@example.com', 'vet');

-- When invited user signs up, they get the correct tenant/role
```

## Request Flow

```
User requests /adris/services
         │
         ▼
┌─────────────────────────────────┐
│  Next.js Router                 │
│  Extracts: clinic = 'adris'     │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  layout.tsx                     │
│  - Load .content_data/adris/    │
│  - Apply Adris theme            │
│  - Render layout                │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  page.tsx                       │
│  - Load services.json           │
│  - Render with Adris branding   │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  If authenticated:              │
│  - Supabase checks tenant_id    │
│  - RLS filters to Adris data    │
└─────────────────────────────────┘
```

## Adding a New Clinic

1. **Create content directory:**
   ```bash
   cp -r .content_data/_TEMPLATE .content_data/newclinic
   ```

2. **Customize configuration:**
   ```json
   // .content_data/newclinic/config.json
   {
     "id": "newclinic",
     "name": "New Veterinary Clinic",
     "contact": { ... },
     "settings": { ... }
   }
   ```

3. **Customize theme:**
   ```json
   // .content_data/newclinic/theme.json
   {
     "colors": {
       "primary": { "main": "#FF6B00", ... }
     }
   }
   ```

4. **Add tenant to database:**
   ```sql
   INSERT INTO tenants (id, name)
   VALUES ('newclinic', 'New Veterinary Clinic');
   ```

5. **Deploy** - Pages auto-generate via `generateStaticParams()`

## Security Considerations

### What's Isolated

| Data Type | Isolation Method |
|-----------|------------------|
| Content JSON | Separate files per tenant |
| Database rows | RLS + tenant_id column |
| File uploads | Supabase Storage RLS |
| User sessions | Profile tenant_id check |

### What's Shared

| Resource | Notes |
|----------|-------|
| Application code | Single codebase |
| Database tables | Schema shared, data isolated |
| Static assets | CDN-served public assets |
| API routes | Tenant determined by auth |

### Cross-Tenant Protection

- RLS prevents any cross-tenant data access
- No tenant_id in URLs (determined by auth)
- Server-side tenant validation on all mutations
- No client-side tenant switching possible

## Performance Considerations

### Static Generation Benefits

- Clinic pages pre-rendered at build time
- Fast initial page loads
- Reduced server load
- CDN caching friendly

### Dynamic Data Fetching

- User-specific data fetched client-side
- Server Actions for mutations
- RLS adds minimal query overhead

---

## Related Documentation

- [Architecture Overview](overview.md)
- [JSON-CMS System](json-cms.md)
- [Theming Engine](theming.md)
- [Security & RLS](security.md)
