# Pre-Generation System

> "Your website is already live" - The secret weapon for outreach

## Overview

The pre-generation system automatically creates clinic websites from scraped data before the clinic owner even knows about Vetic. This transforms the sales pitch from "sign up and configure" to "your website is already live, just claim it."

### Why This Works

1. **Zero friction**: No setup required to see value
2. **Social proof**: "We already built this for you"
3. **Urgency**: "Claim it before someone else does"
4. **Demonstration**: They see exactly what they'll get

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Pre-Generation Pipeline                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. DATA COLLECTION                                           │
│    • Google Maps scraping                                    │
│    • Instagram business profiles                             │
│    • Facebook pages                                          │
│    Output: leads.csv                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BULK GENERATION                                           │
│    • scripts/bulk-generate.ts                                │
│    • Creates JSON content files                              │
│    • Creates tenant records (status: pregenerated)           │
│    Output: .content_data/[slug]/*.json                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. OUTREACH                                                  │
│    • WhatsApp message with live URL                          │
│    • "Your website is already live at vetic.com/[slug]"      │
│    Output: Responses to claim                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CLAIM FLOW                                                │
│    • /api/claim API                                          │
│    • Creates user account                                    │
│    • Links to tenant                                         │
│    • Starts trial                                            │
│    Output: Active clinic owner                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tenant Pre-Generation Fields

Added to `tenants` table via `060_pregeneration_fields.sql`:

| Column | Type | Description |
|--------|------|-------------|
| `status` | TEXT | 'pregenerated', 'claimed', 'active', 'suspended' |
| `is_pregenerated` | BOOLEAN | Whether auto-generated from scraped data |
| `claimed_at` | TIMESTAMPTZ | When owner claimed the website |
| `claimed_by` | TEXT | User ID who claimed |
| `scraped_data` | JSONB | Original scraped data for reference |
| `clinic_type` | TEXT | 'general', 'emergency', 'specialist', 'grooming', 'rural' |
| `zone` | TEXT | Neighborhood/zone for local targeting |
| `google_rating` | TEXT | Rating from Google Maps |
| `instagram_handle` | TEXT | Instagram handle if available |

### Status Flow

```
pregenerated → claimed → active → (suspended)
     │            │         │
     │            │         └── Subscription lapsed
     │            │
     │            └── Owner claimed & started trial
     │
     └── Auto-generated, waiting for claim
```

### Indexes

```sql
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_pregenerated ON tenants(is_pregenerated) WHERE is_pregenerated = TRUE;
CREATE INDEX idx_tenants_zone ON tenants(zone) WHERE zone IS NOT NULL;
```

---

## Bulk Generation Script

### Location

`web/scripts/bulk-generate.ts`

### Usage

```bash
# Basic usage
npx tsx scripts/bulk-generate.ts --source=leads.csv

# With database creation
npx tsx scripts/bulk-generate.ts --source=leads.csv --db

# Custom output directory
npx tsx scripts/bulk-generate.ts --source=leads.csv --output=.content_data

# Dry run (preview without writing)
npx tsx scripts/bulk-generate.ts --source=leads.csv --dry-run
```

### CSV Format

```csv
name,phone,address,zone,clinic_type,google_rating,instagram_handle
"Veterinaria ABC","+595981123456","Av. España 123, Asunción","Villa Morra","general","4.5","@vetabc"
"Pet Emergency 24h","+595971234567","Calle 14 de Mayo 500","Centro","emergency","4.8","@petemergency"
```

### Required Columns

| Column | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Clinic name |
| `phone` | Yes | Phone number (used for WhatsApp) |
| `address` | Yes | Full address |
| `zone` | Yes | Neighborhood/area |
| `clinic_type` | Yes | One of: general, emergency, specialist, grooming, rural |
| `google_rating` | No | Google rating (e.g., "4.5") |
| `instagram_handle` | No | Instagram handle |
| `email` | No | Email address |
| `whatsapp` | No | WhatsApp number if different from phone |

### Output

For each clinic, the script generates:

```
.content_data/
└── [slug]/
    ├── config.json      # Name, contact, settings
    ├── theme.json       # Colors, fonts
    ├── home.json        # Hero, features, SEO
    ├── services.json    # Service catalog
    ├── about.json       # About page content
    ├── faq.json         # FAQ content
    ├── testimonials.json # Empty (no testimonials yet)
    └── legal.json       # Legal links
```

### Theme Presets by Clinic Type

| Type | Primary | Secondary | Hero Message |
|------|---------|-----------|--------------|
| `general` | Forest Green (#2F5233) | Gold (#F0C808) | "Cuidado Completo para tu Mascota" |
| `emergency` | Red (#DC2626) | White | "24 Horas a tu Lado" |
| `specialist` | Blue (#1E40AF) | Silver (#94A3B8) | "Tecnología Avanzada en Diagnóstico" |
| `grooming` | Pink (#DB2777) | Purple (#A855F7) | "Belleza y Salud para tu Mascota" |
| `rural` | Brown (#78350F) | Green (#22C55E) | "Veterinaria Rural Profesional" |

### Service Templates

Each clinic type gets appropriate default services:

**General** (8 services):
- Consulta General (Gs 100,000)
- Vacunación (Gs 150,000)
- Desparasitación (Gs 80,000)
- Cirugía Menor (Gs 300,000)
- Castración (Gs 400,000)
- Baño y Peluquería (Gs 80,000)
- Radiografía (Gs 200,000)
- Laboratorio (Gs 150,000)

**Emergency** (5 services):
- Urgencia 24hs (Gs 250,000)
- Internación (Gs 150,000/día)
- Cirugía de Emergencia (Gs 800,000)
- Consulta General (Gs 100,000)
- Vacunación (Gs 150,000)

**Specialist** (5 services):
- Ecografía Doppler (Gs 350,000)
- Radiología Digital (Gs 200,000)
- Ecocardiografía (Gs 400,000)
- Laboratorio In-House (Gs 150,000)
- Segunda Opinión (Gs 200,000)

**Grooming** (6 services):
- Baño Completo (Gs 80,000)
- Corte de Pelo (Gs 120,000)
- Spa Premium (Gs 200,000)
- Corte de Uñas (Gs 30,000)
- Limpieza de Oídos (Gs 40,000)
- Consulta Veterinaria (Gs 100,000)

**Rural** (5 services):
- Consulta a Domicilio (Gs 200,000)
- Vacunación Bovinos (Gs 50,000/cabeza)
- Cirugía de Campo (Gs 500,000)
- Ecografía Reproductiva (Gs 150,000)
- Atención Equinos (Gs 250,000)

---

## Claim API

### Endpoints

#### Check Availability

```
GET /api/claim?slug=veterinaria-abc
```

**Response (available)**:
```json
{
  "available": true,
  "clinic": {
    "name": "Veterinaria ABC",
    "type": "general",
    "zone": "Villa Morra",
    "isPregenerated": true
  }
}
```

**Response (already claimed)**:
```json
{
  "available": false,
  "message": "Esta clínica ya fue reclamada",
  "clinic": {
    "name": "Veterinaria ABC",
    "status": "claimed"
  }
}
```

#### Claim Clinic

```
POST /api/claim
Content-Type: application/json

{
  "clinicSlug": "veterinaria-abc",
  "ownerName": "Dr. Juan Pérez",
  "ownerEmail": "juan@vetabc.com",
  "ownerPhone": "+595981123456",
  "password": "securepassword123"
}
```

**Response (success)**:
```json
{
  "success": true,
  "message": "¡Felicitaciones! Tu clínica fue reclamada exitosamente.",
  "clinicId": "veterinaria-abc",
  "redirectUrl": "/veterinaria-abc/dashboard"
}
```

### Claim Process

1. **Validate input** - Zod schema validation
2. **Check clinic exists** - Must be in database
3. **Check not claimed** - Status must not be 'claimed' or 'active'
4. **Check email available** - No existing user with that email
5. **Create user account** - Supabase Auth signup
6. **Update tenant** - Set status to 'claimed', link user
7. **Create profile** - User profile with admin role
8. **Start trial** - Set plan_expires_at to trial end date

### Validation Schema

```typescript
const claimSchema = z.object({
  clinicSlug: z.string().min(1, 'Clinic slug is required'),
  ownerName: z.string().min(2, 'Nombre es requerido'),
  ownerEmail: z.string().email('Email inválido'),
  ownerPhone: z.string().min(8, 'Teléfono es requerido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
})
```

---

## Outreach Integration

### WhatsApp Message Template

```text
Hola [NOMBRE]!

Creamos una página web gratuita para tu veterinaria
usando información pública. Podés verla aquí:

👉 vetic.com/[slug]

Incluye:
✅ Tu información de contacto
✅ Botón de WhatsApp
✅ Agenda online
✅ Mapa de ubicación

Si te gusta, reclamala GRATIS. Te damos 3 meses Premium.
Si no te interesa, la eliminamos en 30 días.

¿Qué te parece?
```

### Follow-up Sequence

| Day | Action |
|-----|--------|
| 0 | Initial message with live URL |
| 2 | Screenshot of their website on mobile |
| 5 | "Vi que [competitor] ya tiene agenda online..." |
| 10 | Voice note (more personal) |

---

## Conversion Funnel

Expected conversion rates:

```
500 clinics scraped
    ↓
400 with valid phone (80%)
    ↓
60 responses (15% response rate)
    ↓
25 claim website (40% of responses)
    ↓
10 convert to paid (40% trial-to-paid)

= 10 paying customers from one batch
```

---

## Usage Example

### Step 1: Prepare Lead Data

Export from Google Maps or create manually:

```bash
# Example leads.csv
cat > leads.csv << EOF
name,phone,address,zone,clinic_type,google_rating,instagram_handle
"Veterinaria San Roque","+595981555555","Av. Mariscal López 1234","Recoleta","general","4.3","@vetsanroque"
"Pet Care 24h","+595971666666","España 500","Centro","emergency","4.7",""
"Grooming Paradise","+595991777777","Mcal. Estigarribia 890","Villa Morra","grooming","4.9","@groomingpy"
EOF
```

### Step 2: Run Bulk Generation

```bash
cd web
npx tsx scripts/bulk-generate.ts --source=../leads.csv --db
```

Output:
```
🏥 Vetic Bulk Clinic Generator
================================

📂 Reading: ../leads.csv
📊 Found 3 clinics

🔌 Connected to Supabase

✓ Generated: veterinaria-san-roque (general)
✓ Database: veterinaria-san-roque
✓ Generated: pet-care-24h (emergency)
✓ Database: pet-care-24h
✓ Generated: grooming-paradise (grooming)
✓ Database: grooming-paradise

================================
✅ Generated 3 clinics
📁 Output: .content_data
🗄️  Database records created

📋 Generated slugs:
   vetic.com/veterinaria-san-roque
   vetic.com/pet-care-24h
   vetic.com/grooming-paradise
```

### Step 3: Deploy

```bash
# Commit new content
git add .content_data/
git commit -m "Add pre-generated clinics batch 1"
git push

# Sites are now live at:
# https://vetic.com/veterinaria-san-roque
# https://vetic.com/pet-care-24h
# https://vetic.com/grooming-paradise
```

### Step 4: Outreach

Send WhatsApp messages to each clinic with their live URL.

---

## Database Queries

### Find Unclaimed Pre-generated Clinics

```sql
SELECT id, name, phone, zone, google_rating, created_at
FROM tenants
WHERE status = 'pregenerated'
AND is_pregenerated = TRUE
ORDER BY created_at DESC;
```

### Conversion Report

```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM tenants
WHERE is_pregenerated = TRUE
GROUP BY status;
```

### Clinics by Zone

```sql
SELECT
  zone,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
  COUNT(*) FILTER (WHERE status = 'active') as active
FROM tenants
WHERE is_pregenerated = TRUE
GROUP BY zone
ORDER BY total DESC;
```

---

## Cleanup

### Remove Unclaimed After 30 Days

```sql
-- Mark as expired (don't delete, keep for analytics)
UPDATE tenants
SET status = 'expired'
WHERE status = 'pregenerated'
AND is_pregenerated = TRUE
AND created_at < NOW() - INTERVAL '30 days';
```

### Delete Content Files

```bash
# Remove content for expired clinics
for slug in $(psql -c "SELECT id FROM tenants WHERE status='expired'" -t); do
  rm -rf .content_data/$slug
done
```

---

## Security Considerations

1. **No sensitive data scraped** - Only public information
2. **Claim requires email verification** - Supabase Auth handles this
3. **Rate limiting on claim API** - Prevent abuse
4. **Unique email per claim** - Can't claim multiple clinics with same email
5. **Status checks** - Can't claim already-claimed clinics

---

## Files Reference

| File | Purpose |
|------|---------|
| `web/scripts/bulk-generate.ts` | Bulk generation CLI tool |
| `web/app/api/claim/route.ts` | Claim API (GET/POST) |
| `web/db/migrations/060_pregeneration_fields.sql` | Database migration |
| `web/db/schema/tenants.ts` | Drizzle schema with new fields |
| `.content_data/_TEMPLATE/` | Template for new clinics |

---

*Last updated: January 2026*
