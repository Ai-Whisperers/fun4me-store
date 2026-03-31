# Tenant Onboarding - Quick Reference

This document provides a quick reference for onboarding new clinics to the Vete platform.

## Prerequisites

- Supabase project set up with all migrations run
- Environment variables configured in `.env.local`
- Database includes `54_tenant_setup.sql` migration

## Quick Start (2 Steps)

### Step 1: Create Tenant in Database

```bash
cd web
npx tsx scripts/setup-tenant.ts "myclinic" "My Veterinary Clinic"
```

**What this creates automatically:**
- Tenant record
- 5 payment methods (cash, credit, debit, transfer, mobile)
- 13 default services (consults, vaccines, surgeries, labs, imaging, grooming, dentistry)
- 6 store categories (dog food, cat food, antiparasitics, accessories, hygiene, meds)
- 3 reminder templates (vaccine, appointment, post-surgery)
- Invoice sequence with auto-generated prefix

### Step 2: Create Content Folder

```bash
# Copy template and customize
cp -r web/.content_data/_TEMPLATE web/.content_data/myclinic

# Edit key files:
# - config.json: Clinic info, contact, modules
# - theme.json: Colors, fonts, gradients
# - services.json: Service offerings
# - team.json: Staff members
```

**Done!** The clinic is now accessible at `/myclinic`.

## Additional Steps (Optional)

### Create Admin User

```sql
-- After user signs up, make them admin
UPDATE profiles
SET role = 'admin', tenant_id = 'myclinic'
WHERE email = 'admin@myclinic.com';
```

### Add to Static Routes (for SSG)

Edit pages with `generateStaticParams()`:

```typescript
export async function generateStaticParams() {
  return [
    { clinic: 'adris' },
    { clinic: 'petlife' },
    { clinic: 'myclinic' }  // Add here
  ]
}
```

## Management Commands

### Check Tenant Status

```bash
# Via script
npx tsx scripts/setup-tenant.ts "myclinic" "My Veterinary Clinic"
# If exists, shows statistics

# Via SQL
psql $DATABASE_URL -c "SELECT * FROM get_tenant_info('myclinic');"
```

### Delete Tenant (DANGER!)

```sql
-- Deletes ALL tenant data - IRREVERSIBLE
SELECT delete_tenant_cascade('myclinic');
```

## Files Created

| File | Purpose |
|------|---------|
| `web/db/54_tenant_setup.sql` | SQL functions for tenant management |
| `web/scripts/setup-tenant.ts` | TypeScript script for easy onboarding |
| `documentation/guides/tenant-onboarding.md` | Comprehensive guide |

## Key Functions

| Function | Description |
|----------|-------------|
| `setup_new_tenant(id, name)` | Create tenant with all defaults |
| `tenant_exists(id)` | Check if tenant exists |
| `get_tenant_info(id)` | View tenant statistics |
| `delete_tenant_cascade(id)` | Delete tenant and all data |

## Default Data Summary

### Payment Methods (5)
Efectivo (default), Tarjeta de Crédito, Tarjeta de Débito, Transferencia Bancaria, Pago Móvil

### Services (13)
- **Consultations:** General (150k PYG), Emergency (300k PYG)
- **Vaccinations:** Rabies (80k), Sextuple/Dog (120k), Triple Feline (100k)
- **Surgery:** Castration Dog (400k), Castration Cat (300k)
- **Lab:** Blood Test (250k)
- **Imaging:** X-Ray (200k), Ultrasound (350k)
- **Other:** Grooming (150k), Dental Cleaning (300k), Hospitalization/day (200k)

### Store Categories (6)
Alimento para Perros, Alimento para Gatos, Antiparasitarios, Accesorios, Higiene, Medicamentos

### Reminder Templates (3)
Vaccine Due (7 days before), Appointment (1 day before), Post-Surgery Follow-up (1 day after)

## Example: Complete Setup

```bash
# 1. Create tenant in database
npx tsx scripts/setup-tenant.ts "petcare" "PetCare Veterinary Center"

# 2. Create content folder
cp -r web/.content_data/_TEMPLATE web/.content_data/petcare

# 3. Customize config
nano web/.content_data/petcare/config.json
nano web/.content_data/petcare/theme.json

# 4. Create admin user (after signup)
psql $DATABASE_URL -c "UPDATE profiles SET role='admin', tenant_id='petcare' WHERE email='admin@petcare.com';"

# 5. Test
npm run dev
open http://localhost:3000/petcare
```

## Troubleshooting

### Script fails with "Missing environment variables"

**Solution:** Check `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Tenant exists but theme not loading

**Solution:** Content folder missing or invalid JSON
```bash
# Validate JSON
cat web/.content_data/myclinic/config.json | jq
cat web/.content_data/myclinic/theme.json | jq
```

### Routes return 404

**Solution:** Add to `generateStaticParams()` and rebuild
```bash
npm run build
```

## Documentation

- **Comprehensive Guide:** `documentation/guides/tenant-onboarding.md`
- **Database README:** `web/db/README.md` (Tenant Onboarding section)
- **SQL Functions:** `web/db/54_tenant_setup.sql`
- **Setup Script:** `web/scripts/setup-tenant.ts`

## Next Steps After Onboarding

1. Add clinic-specific services and products
2. Upload clinic logo and branding assets
3. Configure clinic hours and contact information
4. Set up staff accounts (vets, admins)
5. Import existing client data (if migrating)
6. Test booking flow and payment processing
7. Train staff on the platform

---

**Need help?** See the comprehensive guide at `documentation/guides/tenant-onboarding.md`
