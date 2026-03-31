# Ambassador Program

> Cash commissions for students, assistants, and teachers who refer clinics

## Overview

The ambassador program is designed for individuals (not clinics) who can refer veterinary clinics to Vetic. Unlike the clinic-to-clinic referral system (which offers discounts), ambassadors earn **cash commissions** based on a tiered structure.

### Target Ambassadors

| Type | Description | How to Find |
|------|-------------|-------------|
| **Students** | Veterinary students at universities | University outreach, career fairs |
| **Assistants** | Vet technicians working in clinics | Instagram DMs, job boards |
| **Teachers** | Professors at vet schools | LinkedIn, university directories |
| **Other** | Anyone with clinic connections | Referrals from existing ambassadors |

### Value Proposition

For ambassadors:
- **Lifetime Professional plan** free
- **30-50% commission** on first-year subscriptions
- **No limit** on referrals
- **Monthly payouts** via bank transfer

For referred clinics:
- **+2 months trial** bonus (5 months total)
- Personalized onboarding
- Support from ambassador who understands the product

---

## Tier Structure

| Tier | Conversions | Commission | Bonus |
|------|-------------|------------|-------|
| **Embajador** | 1+ | 30% | Lifetime Pro |
| **Promotor** | 5+ | 40% | Lifetime Pro + Gs 50K/referral |
| **Super Embajador** | 10+ | 50% | Lifetime Pro + Priority Features |

### Commission Examples

Based on Gs 2,400,000/year subscription:

| Tier | Commission Rate | Per Referral | 10 Referrals |
|------|-----------------|--------------|--------------|
| Embajador | 30% | Gs 720,000 | Gs 7,200,000 |
| Promotor | 40% | Gs 960,000 | Gs 9,600,000 |
| Super | 50% | Gs 1,200,000 | Gs 12,000,000 |

### Automatic Tier Upgrades

Tiers upgrade automatically when conversion thresholds are met:
- Database trigger `update_ambassador_tier()` fires on referral conversion
- Commission rate updates for future referrals
- Existing pending commissions keep their original rate

---

## Database Schema

### Migration: `061_ambassador_program.sql`

#### ambassadors Table

```sql
CREATE TABLE ambassadors (
    id UUID PRIMARY KEY,

    -- Personal info
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),

    -- Ambassador details
    type TEXT NOT NULL DEFAULT 'student',  -- student, assistant, teacher, other
    university TEXT,
    institution TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, active, suspended, inactive
    tier TEXT NOT NULL DEFAULT 'embajador',  -- embajador, promotor, super

    -- Referral tracking
    referral_code TEXT NOT NULL UNIQUE,
    referrals_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,

    -- Commission tracking (Guaraníes)
    commission_rate NUMERIC(5,2) DEFAULT 30.00,
    total_earned NUMERIC(12,2) DEFAULT 0,
    total_paid NUMERIC(12,2) DEFAULT 0,
    pending_payout NUMERIC(12,2) DEFAULT 0,

    -- Bank details
    bank_name TEXT,
    bank_account TEXT,
    bank_holder_name TEXT,

    -- Metadata
    notes TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### ambassador_referrals Table

```sql
CREATE TABLE ambassador_referrals (
    id UUID PRIMARY KEY,
    ambassador_id UUID REFERENCES ambassadors(id),
    tenant_id TEXT REFERENCES tenants(id),

    -- Status
    status TEXT DEFAULT 'pending',  -- pending, trial_started, converted, expired, cancelled

    -- Timeline
    referred_at TIMESTAMPTZ DEFAULT NOW(),
    trial_started_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,

    -- Commission
    subscription_amount NUMERIC(12,2),
    commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(12,2),

    -- Payout
    payout_status TEXT DEFAULT 'pending',  -- pending, scheduled, paid
    payout_id UUID,
    paid_at TIMESTAMPTZ,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    UNIQUE(tenant_id)  -- Each clinic can only be referred once
);
```

#### ambassador_payouts Table

```sql
CREATE TABLE ambassador_payouts (
    id UUID PRIMARY KEY,
    ambassador_id UUID REFERENCES ambassadors(id),

    -- Payout details
    amount NUMERIC(12,2) NOT NULL,
    referral_ids UUID[] NOT NULL,

    -- Status
    status TEXT DEFAULT 'pending',  -- pending, approved, processing, completed, failed

    -- Bank details
    bank_name TEXT,
    bank_account TEXT,
    bank_holder_name TEXT,
    transfer_reference TEXT,

    -- Processing
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Functions

#### generate_ambassador_code(p_name)
Generates unique referral code from ambassador name + random digits.

```sql
SELECT generate_ambassador_code('Juan Pérez');
-- Returns: 'JUAN1234'
```

#### process_ambassador_referral(p_code, p_tenant_id, ...)
Process a clinic signup with ambassador code.

```sql
SELECT process_ambassador_referral('JUAN1234', 'veterinaria-abc');
-- Creates referral record, updates ambassador stats
```

#### convert_ambassador_referral(p_referral_id, p_subscription_amount)
Convert referral when clinic becomes paying customer.

```sql
SELECT convert_ambassador_referral('uuid-here', 2400000);
-- Calculates commission, updates ambassador earnings
```

#### get_ambassador_stats(p_ambassador_id)
Get comprehensive stats for ambassador dashboard.

```sql
SELECT * FROM get_ambassador_stats('uuid-here');
-- Returns: total_referrals, pending, converted, earned, tier info
```

---

## API Reference

### Base URL: `/api/ambassador`

### Registration

#### POST /api/ambassador
Register as new ambassador.

**Request:**
```json
{
  "fullName": "Juan Pérez",
  "email": "juan@universidad.edu.py",
  "phone": "+595981123456",
  "password": "securepass123",
  "type": "student",
  "university": "Universidad Nacional de Asunción"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registro exitoso. Tu cuenta será revisada y activada pronto.",
  "ambassador": {
    "id": "uuid",
    "email": "juan@universidad.edu.py",
    "referral_code": "JUAN1234",
    "status": "pending"
  }
}
```

#### GET /api/ambassador
Get current ambassador profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "juan@universidad.edu.py",
  "full_name": "Juan Pérez",
  "phone": "+595981123456",
  "type": "student",
  "status": "active",
  "tier": "embajador",
  "referral_code": "JUAN1234",
  "referrals_count": 3,
  "conversions_count": 1,
  "commission_rate": 30.00,
  "total_earned": 720000,
  "pending_payout": 720000,
  "share_url": "https://vetic.com/signup?amb=JUAN1234",
  "share_message": "¡Únete a Vetic usando mi código JUAN1234..."
}
```

### Statistics

#### GET /api/ambassador/stats
Get referral statistics.

**Response:**
```json
{
  "total_referrals": 5,
  "pending_referrals": 2,
  "converted_referrals": 2,
  "total_earned": 1440000,
  "pending_payout": 720000,
  "tier": "embajador",
  "commission_rate": 30.00,
  "next_tier": "promotor",
  "referrals_to_next_tier": 3,
  "tier_info": {
    "name": "Embajador",
    "commission": 30,
    "color": "blue",
    "benefits": ["Lifetime Professional", "30% comisión"]
  },
  "next_tier_info": {
    "name": "Promotor",
    "commission": 40,
    "benefits": ["Lifetime Professional", "40% comisión", "Gs 50K bonus"]
  }
}
```

### Referrals

#### GET /api/ambassador/referrals
List referrals with pagination and filters.

**Query Parameters:**
- `status`: Filter by status (pending, trial_started, converted, expired)
- `limit`: Results per page (default 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "referrals": [
    {
      "id": "uuid",
      "status": "converted",
      "referred_at": "2026-01-01T10:00:00Z",
      "converted_at": "2026-01-15T14:30:00Z",
      "subscription_amount": 2400000,
      "commission_rate": 30.00,
      "commission_amount": 720000,
      "payout_status": "pending",
      "tenant": {
        "id": "veterinaria-abc",
        "name": "Veterinaria ABC",
        "zone": "Villa Morra"
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Code Validation

#### GET /api/ambassador/validate?code=JUAN1234
Validate ambassador code during clinic signup.

**Response (valid):**
```json
{
  "valid": true,
  "ambassador": {
    "name": "Juan Pérez",
    "tier": "embajador"
  },
  "benefits": {
    "trial_bonus_days": 60,
    "welcome_message": "Referido por Juan Pérez - Obtén 2 meses extra de prueba gratis!"
  }
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "error": "Código no encontrado"
}
```

### Payouts

#### GET /api/ambassador/payouts
Get payout history and summary.

**Response:**
```json
{
  "payouts": [
    {
      "id": "uuid",
      "amount": 720000,
      "status": "completed",
      "bank_name": "Banco Continental",
      "bank_account": "****5678",
      "created_at": "2026-01-10T10:00:00Z",
      "completed_at": "2026-01-15T14:30:00Z"
    }
  ],
  "summary": {
    "pending_payout": 720000,
    "total_paid": 720000,
    "minimum_payout": 500000,
    "can_request_payout": true,
    "saved_bank_details": {
      "bank_name": "Banco Continental",
      "bank_account": "1234567890",
      "bank_holder_name": "Juan Pérez"
    }
  }
}
```

#### POST /api/ambassador/payouts
Request a payout.

**Request:**
```json
{
  "bankName": "Banco Continental",
  "bankAccount": "1234567890",
  "bankHolderName": "Juan Alberto Pérez"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Solicitud de pago enviada. Será procesada en 3-5 días hábiles.",
  "payout": {
    "id": "uuid",
    "amount": 720000,
    "status": "pending"
  }
}
```

---

## UI Pages

### Ambassador Portal Routes

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/ambassador` | Main dashboard | Yes |
| `/ambassador/login` | Login page | No |
| `/ambassador/register` | Registration form | No |
| `/ambassador/referrals` | Full referrals list | Yes |
| `/ambassador/payouts` | Payout history & requests | Yes |

### Components

| Component | File | Description |
|-----------|------|-------------|
| AmbassadorDashboard | `components/ambassador/ambassador-dashboard.tsx` | Main dashboard with stats, code, referrals |
| AmbassadorRegisterForm | `components/ambassador/ambassador-register-form.tsx` | Registration form |

### Dashboard Features

1. **Referral Code Card**
   - Large display of code
   - Copy button
   - Share button (native share API)
   - Tier progress bar

2. **Stats Grid**
   - Total referrals
   - Converted referrals
   - Total earned (Gs)
   - Pending payout

3. **Recent Referrals**
   - Last 5 referrals
   - Status badges
   - Commission amounts
   - Link to full list

4. **How It Works**
   - 3-step explanation
   - Commission rate display

---

## Approval Workflow

### New Ambassador Flow

```
Registration → Pending Review → Approved/Rejected
     │              │                │
     │              │                ├── Active: Can start referring
     │              │                │
     │              │                └── Rejected: Email notification
     │              │
     │              └── Admin reviews in admin panel
     │
     └── Creates pending ambassador record
```

### Approval Actions (Admin)

```sql
-- Approve ambassador
UPDATE ambassadors
SET status = 'active', approved_by = 'admin-user-id', approved_at = NOW()
WHERE id = 'ambassador-uuid';

-- Reject ambassador
UPDATE ambassadors
SET status = 'inactive', notes = 'Razón del rechazo'
WHERE id = 'ambassador-uuid';
```

### Payout Flow

```
Request → Pending → Approved → Processing → Completed
   │         │          │           │            │
   │         │          │           │            └── Money transferred
   │         │          │           │
   │         │          │           └── Bank transfer initiated
   │         │          │
   │         │          └── Admin approved payout
   │         │
   │         └── Waiting for admin review
   │
   └── Ambassador requested payout
```

---

## Integration with Signup

### Clinic Signup with Ambassador Code

When a clinic signs up with an ambassador code (`?amb=JUAN1234`):

1. **Validate code** via `/api/ambassador/validate`
2. **Show benefits** ("Referido por Juan - 2 meses extra!")
3. **Create tenant** with `referred_by_ambassador_id`
4. **Create referral record** via `process_ambassador_referral()`
5. **Apply trial bonus** (5 months instead of 3)

### Claim Flow with Ambassador Code

The claim API can be extended to accept ambassador codes:

```typescript
// In claim schema, add optional field
referralCode: z.string().optional(),

// In claim handler, process ambassador referral
if (referralCode) {
  await supabase.rpc('process_ambassador_referral', {
    p_ambassador_code: referralCode,
    p_tenant_id: clinicSlug,
  })
}
```

---

## Outreach Scripts

### For Students

```text
Hola! 👋 Soy [TU NOMBRE] de Vetic.

Estamos buscando estudiantes de veterinaria para
nuestro programa de embajadores.

Beneficios:
🎓 Plan Professional GRATIS de por vida
💰 30-50% de comisión por cada clínica referida
📱 Sin límite de referidos

Si conocés veterinarias que usan papel o WhatsApp
para agendar, podés ayudarles y ganar plata.

¿Te interesa? Te mando más info.
```

### For Assistants/Technicians

```text
Hola! Vi que trabajás en veterinaria.

Ofrecemos un programa de embajadores donde podés
ganar comisiones refiriendo clínicas a Vetic.

💰 30-50% de comisión (hasta Gs 1.2M por clínica)
🎁 Plan Professional gratis para vos
🏦 Pagos mensuales a tu cuenta

¿Tu clínica usa Vetic? Si no, podés referirla
y ganar la comisión vos.

¿Te cuento más?
```

### For Teachers/Professors

```text
Estimado/a Profesor/a [NOMBRE],

Estamos desarrollando Vetic, un software de gestión
para clínicas veterinarias en Paraguay.

Nos gustaría invitarlo a nuestro programa de embajadores:

• Acceso gratuito para uso académico
• Comisiones por referidos (30-50%)
• Material para clases prácticas

¿Podemos coordinar 15 minutos para mostrarle?

Saludos,
[TU NOMBRE]
```

---

## Metrics & Reporting

### Key Metrics

| Metric | Query |
|--------|-------|
| Active ambassadors | `SELECT COUNT(*) FROM ambassadors WHERE status = 'active'` |
| Total referrals | `SELECT SUM(referrals_count) FROM ambassadors` |
| Conversion rate | `SELECT SUM(conversions_count)::float / NULLIF(SUM(referrals_count), 0) FROM ambassadors` |
| Total commissions paid | `SELECT SUM(total_paid) FROM ambassadors` |
| Pending payouts | `SELECT SUM(pending_payout) FROM ambassadors` |

### Ambassador Leaderboard

```sql
SELECT
  a.full_name,
  a.tier,
  a.conversions_count,
  a.total_earned,
  a.referral_code
FROM ambassadors a
WHERE a.status = 'active'
ORDER BY a.conversions_count DESC, a.total_earned DESC
LIMIT 10;
```

### Monthly Report

```sql
SELECT
  DATE_TRUNC('month', ar.converted_at) as month,
  COUNT(*) as conversions,
  SUM(ar.commission_amount) as total_commissions,
  COUNT(DISTINCT ar.ambassador_id) as active_ambassadors
FROM ambassador_referrals ar
WHERE ar.status = 'converted'
AND ar.converted_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', ar.converted_at)
ORDER BY month DESC;
```

---

## Security & RLS

### Row Level Security Policies

```sql
-- Ambassadors can view their own record
CREATE POLICY "Ambassador view own" ON ambassadors
    FOR SELECT USING (user_id = auth.uid());

-- Ambassadors can view their own referrals
CREATE POLICY "Ambassador view own referrals" ON ambassador_referrals
    FOR SELECT USING (
        ambassador_id IN (SELECT id FROM ambassadors WHERE user_id = auth.uid())
    );

-- Ambassadors can view their own payouts
CREATE POLICY "Ambassador view own payouts" ON ambassador_payouts
    FOR SELECT USING (
        ambassador_id IN (SELECT id FROM ambassadors WHERE user_id = auth.uid())
    );

-- Service role has full access for admin operations
CREATE POLICY "Service role full access" ON ambassadors
    FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Payout Security

- Minimum payout: Gs 500,000 (prevents micro-transactions)
- One pending payout at a time
- Bank details saved but masked in responses
- Admin approval required for payouts

---

## Files Reference

| File | Purpose |
|------|---------|
| `web/db/migrations/061_ambassador_program.sql` | Database schema |
| `web/app/api/ambassador/route.ts` | Registration & profile |
| `web/app/api/ambassador/stats/route.ts` | Statistics |
| `web/app/api/ambassador/referrals/route.ts` | Referrals list |
| `web/app/api/ambassador/validate/route.ts` | Code validation |
| `web/app/api/ambassador/payouts/route.ts` | Payout management |
| `web/app/ambassador/page.tsx` | Dashboard page |
| `web/app/ambassador/login/page.tsx` | Login page |
| `web/app/ambassador/register/page.tsx` | Registration page |
| `web/app/ambassador/referrals/page.tsx` | Referrals list page |
| `web/app/ambassador/payouts/page.tsx` | Payouts page |
| `web/components/ambassador/ambassador-dashboard.tsx` | Dashboard component |
| `web/components/ambassador/ambassador-register-form.tsx` | Registration form |

---

*Last updated: January 2026*
