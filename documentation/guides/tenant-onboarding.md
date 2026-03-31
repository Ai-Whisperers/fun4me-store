# Tenant Onboarding Guide

Complete guide for onboarding new veterinary clinics to the Vete platform.

## Overview

The Vete platform is a multi-tenant SaaS system. Each clinic (tenant) gets:
- Isolated database records with Row-Level Security
- Custom branding and theme
- Dedicated content (services, staff, policies)
- Separate domain routing (`/[clinic-slug]/*`)

## Quick Start

### 1. Create Tenant in Database

Use the automated script to create the tenant with all defaults:

```bash
cd web
npx tsx scripts/setup-tenant.ts "myclinic" "My Veterinary Clinic"
```

**What this does:**
- Creates tenant record in database
- Sets up 5 default payment methods
- Initializes invoice numbering sequence
- Creates 13 default veterinary services
- Sets up 6 default store categories
- Creates 3 default reminder templates

### 2. Create Content Folder

Copy the template folder and customize for the new clinic:

```bash
# Copy template
cp -r web/.content_data/_TEMPLATE web/.content_data/myclinic

# Edit configuration files
# - config.json: clinic name, contact, address, modules
# - theme.json: colors, fonts, gradients
# - services.json: service offerings
# - team.json: staff members
# - policies.json: clinic policies
```

### 3. Configure Theme

Edit `web/.content_data/myclinic/theme.json`:

```json
{
  "colors": {
    "primary": "#0066CC",
    "secondary": "#FF6B35",
    "accent": "#FFC107",
    "background": "#FFFFFF",
    "text": {
      "primary": "#1A1A1A",
      "secondary": "#6B7280",
      "muted": "#9CA3AF"
    }
  },
  "gradients": {
    "hero": "linear-gradient(135deg, #0066CC 0%, #004C99 100%)"
  },
  "fonts": {
    "heading": "Poppins, sans-serif",
    "body": "Inter, sans-serif"
  }
}
```

### 4. Configure Clinic Details

Edit `web/.content_data/myclinic/config.json`:

```json
{
  "id": "myclinic",
  "name": "My Veterinary Clinic",
  "contact": {
    "phone": "+595 XXX XXXXXX",
    "email": "info@myclinic.com",
    "whatsapp": "+595XXXXXXXXX",
    "address": "Av. Principal 123, Ciudad",
    "hours": {
      "monday": "08:00 - 18:00",
      "tuesday": "08:00 - 18:00",
      "wednesday": "08:00 - 18:00",
      "thursday": "08:00 - 18:00",
      "friday": "08:00 - 18:00",
      "saturday": "08:00 - 13:00",
      "sunday": "Cerrado"
    }
  },
  "branding": {
    "logo": "/clinics/myclinic/logo.png",
    "favicon": "/clinics/myclinic/favicon.ico",
    "tagline": "Cuidando a tu mejor amigo"
  },
  "modules": {
    "appointments": true,
    "store": true,
    "portal": true,
    "loyalty": true,
    "qr_tags": true
  }
}
```

### 5. Create Admin User

#### Option A: Via Supabase Dashboard

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User"
3. Enter email and password
4. User is created with pending profile

#### Option B: Via SQL

```sql
-- After user signs up, update their profile
UPDATE profiles
SET
  role = 'admin',
  tenant_id = 'myclinic',
  full_name = 'Admin Name'
WHERE email = 'admin@myclinic.com';
```

### 6. Update Static Routes

For static site generation, add the new tenant to `generateStaticParams()`:

Edit `web/app/[clinic]/page.tsx` and similar pages:

```typescript
export async function generateStaticParams() {
  return [
    { clinic: 'adris' },
    { clinic: 'petlife' },
    { clinic: 'myclinic' }  // Add new tenant
  ]
}
```

**Files to update:**
- `web/app/[clinic]/page.tsx`
- `web/app/[clinic]/services/page.tsx`
- `web/app/[clinic]/book/page.tsx`
- Any other `[clinic]` routes with `generateStaticParams()`

### 7. Deploy and Test

```bash
# Build the application
npm run build

# Test locally
npm run dev

# Visit the new clinic site
open http://localhost:3000/myclinic
```

## Default Data Created

### Payment Methods (5)

| Name | Type | Default |
|------|------|---------|
| Efectivo | cash | Yes |
| Tarjeta de Crédito | credit_card | No |
| Tarjeta de Débito | debit_card | No |
| Transferencia Bancaria | bank_transfer | No |
| Pago Móvil | mobile_payment | No |

### Services (13)

| Code | Name | Category | Price (PYG) | Duration |
|------|------|----------|-------------|----------|
| CONSULT-001 | Consulta General | consultation | 150,000 | 30 min |
| CONSULT-002 | Consulta de Emergencia | consultation | 300,000 | 45 min |
| VAC-001 | Vacunación Antirrábica | vaccination | 80,000 | 15 min |
| VAC-002 | Vacunación Séxtuple (Perros) | vaccination | 120,000 | 15 min |
| VAC-003 | Vacunación Triple Felina | vaccination | 100,000 | 15 min |
| SURG-001 | Castración (Perro) | surgery | 400,000 | 120 min |
| SURG-002 | Castración (Gato) | surgery | 300,000 | 90 min |
| EXAM-001 | Análisis de Sangre Completo | lab | 250,000 | 30 min |
| EXAM-002 | Radiografía Simple | imaging | 200,000 | 20 min |
| EXAM-003 | Ecografía Abdominal | imaging | 350,000 | 30 min |
| GROOM-001 | Baño y Corte | grooming | 150,000 | 60 min |
| DENT-001 | Limpieza Dental | dentistry | 300,000 | 60 min |
| HOSP-001 | Hospitalización (día) | hospitalization | 200,000 | 1440 min |

### Store Categories (6)

| Name | Slug | Description |
|------|------|-------------|
| Alimento para Perros | alimento-perros | Alimentos balanceados y naturales para perros |
| Alimento para Gatos | alimento-gatos | Alimentos balanceados y naturales para gatos |
| Antiparasitarios | antiparasitarios | Productos contra pulgas, garrapatas y parásitos |
| Accesorios | accesorios | Collares, correas, juguetes y más |
| Higiene | higiene | Shampoos, cepillos y productos de limpieza |
| Medicamentos | medicamentos | Medicamentos veterinarios |

### Reminder Templates (3)

| Name | Type | Days Before |
|------|------|-------------|
| Recordatorio de Vacuna | vaccine_due | 7 days |
| Recordatorio de Cita | appointment | 1 day |
| Seguimiento Post-Cirugía | post_surgery | 1 day |

## Advanced Configuration

### Custom Service Catalog

Add clinic-specific services via SQL:

```sql
INSERT INTO services (tenant_id, code, name, category, base_price, duration_minutes)
VALUES
  ('myclinic', 'CUSTOM-001', 'Servicio Especializado', 'specialty', 500000, 90),
  ('myclinic', 'CUSTOM-002', 'Otro Servicio', 'other', 200000, 45);
```

### Custom Payment Methods

Add alternative payment methods:

```sql
INSERT INTO payment_methods (tenant_id, name, type, is_active)
VALUES
  ('myclinic', 'Cryptocurrency', 'other', true),
  ('myclinic', 'Cheque', 'check', false);
```

### Invoice Customization

Change invoice prefix:

```sql
UPDATE invoice_sequences
SET prefix = 'CUSTOM'
WHERE tenant_id = 'myclinic';
```

## Management Functions

### Check Tenant Status

```sql
SELECT * FROM get_tenant_info('myclinic');
```

Returns:
- Tenant name
- Payment methods count
- Services count
- Categories count
- Users count
- Pets count
- Creation date

### Verify Tenant Exists

```sql
SELECT tenant_exists('myclinic');
```

Returns `true` or `false`.

### Delete Tenant (DANGER!)

**WARNING:** This permanently deletes ALL data for the tenant.

```sql
-- Confirm you want to delete everything
SELECT delete_tenant_cascade('myclinic');
```

This deletes:
- Tenant record
- All profiles (users)
- All pets and medical records
- All appointments
- All invoices and payments
- All inventory and products
- All messages and notifications
- Everything related to the tenant

## Troubleshooting

### "Tenant not found" error

**Cause:** Tenant record not created or incorrect tenant ID.

**Solution:**
```sql
SELECT tenant_exists('myclinic');
-- If false, create tenant
SELECT setup_new_tenant('myclinic', 'My Veterinary Clinic');
```

### Theme not loading

**Cause:** Content folder missing or invalid JSON.

**Solution:**
1. Check folder exists: `web/.content_data/myclinic/`
2. Validate JSON: `cat web/.content_data/myclinic/theme.json | jq`
3. Check file permissions
4. Restart dev server

### Routes return 404

**Cause:** Tenant not added to `generateStaticParams()`.

**Solution:**
1. Add tenant to all `[clinic]` pages
2. Rebuild: `npm run build`
3. Test: Visit `/myclinic`

### Admin user can't access dashboard

**Cause:** Profile not updated with correct role and tenant_id.

**Solution:**
```sql
UPDATE profiles
SET role = 'admin', tenant_id = 'myclinic'
WHERE email = 'admin@myclinic.com';
```

### Services not showing

**Cause:** Services not active or wrong tenant_id.

**Solution:**
```sql
-- Check services exist
SELECT * FROM services WHERE tenant_id = 'myclinic';

-- Make sure they're active
UPDATE services
SET is_active = true
WHERE tenant_id = 'myclinic';
```

## Migration from Existing System

### Import Services

```sql
-- Bulk import services from CSV or JSON
INSERT INTO services (tenant_id, code, name, category, base_price)
SELECT
  'myclinic',
  code,
  name,
  category,
  price
FROM imported_services;
```

### Import Products

```sql
-- Bulk import products
INSERT INTO store_products (tenant_id, sku, name, category_id, base_price)
SELECT
  'myclinic',
  sku,
  name,
  (SELECT id FROM store_categories WHERE tenant_id = 'myclinic' AND slug = category_slug),
  price
FROM imported_products;
```

### Import Client Data

```bash
# Use dedicated import script
npx tsx web/scripts/import-clients.ts myclinic clients.csv
```

## Best Practices

### Security

1. **Never share service role keys** with clinic admins
2. **Use strong passwords** for admin accounts
3. **Enable 2FA** for admin users
4. **Review RLS policies** before granting custom permissions
5. **Regular security audits** of tenant data access

### Performance

1. **Enable caching** for public content (services, team)
2. **Optimize images** in content folder
3. **Use CDN** for static assets
4. **Monitor query performance** for large tenants
5. **Set up materialized views** for analytics

### Branding

1. **High-resolution logos** (SVG preferred)
2. **Accessible color contrast** (WCAG AA minimum)
3. **Consistent typography** across all pages
4. **Mobile-friendly** layouts
5. **Fast-loading images** (WebP format)

### Data Management

1. **Regular backups** of tenant data
2. **Test restore procedures** periodically
3. **Archive old records** after retention period
4. **Monitor storage usage** for large files
5. **Set up automated reports** for clinic admins

## Support Contacts

For technical assistance:
- Email: tech@vete.com
- Slack: #vete-platform
- Docs: https://docs.vete.com

---

*Last updated: December 2024*
