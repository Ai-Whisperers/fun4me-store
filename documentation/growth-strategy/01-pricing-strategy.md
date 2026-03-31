# Pricing Strategy

> Annual plans with high-touch onboarding for maximum LTV

## Overview

The pricing strategy focuses on **annual commitments** rather than monthly subscriptions to:
- Increase cash flow upfront (12x improvement)
- Reduce churn through commitment
- Justify personalized onboarding investment
- Improve customer lifetime value (3x increase)

---

## Pricing Plans

### Current Structure

| Plan | Price | Duration | Monthly Equivalent | Savings |
|------|-------|----------|-------------------|---------|
| **Free** | Gs 0 | Unlimited | - | - |
| **Professional Annual** | Gs 2,400,000 | 12 months | Gs 200,000 | 20% |
| **Professional 2-Year** | Gs 4,000,000 | 24 months | Gs 166,667 | 33% |
| **Enterprise** | Gs 6,000,000+ | 12 months | Custom | Custom |

### Configuration

Located in `web/lib/pricing/tiers.ts`:

```typescript
export const annualPlans: AnnualPlan[] = [
  {
    id: 'annual',
    name: 'Profesional Anual',
    months: 12,
    totalPrice: 2400000,        // Gs 2.4M/year
    monthlyEquivalent: 200000,  // Gs 200K/month effective
    savingsPercent: 0.20,       // 20% savings vs monthly
    onboardingCalls: 3,
    prioritySupport: true,
  },
  {
    id: 'biennial',
    name: 'Profesional 2 Años',
    months: 24,
    totalPrice: 4000000,        // Gs 4M/2 years
    monthlyEquivalent: 166667,  // Gs 167K/month effective
    savingsPercent: 0.33,       // 33% savings vs monthly
    onboardingCalls: 6,
    prioritySupport: true,
  },
]
```

---

## ROI Guarantee

### The Promise

> "Si no conseguís 6 clientes nuevos en 6 meses, los próximos 6 meses son GRATIS"

This guarantee:
- Eliminates buyer risk
- Demonstrates confidence in the product
- Creates urgency to track results
- Builds trust with skeptical clinic owners

### Configuration

```typescript
export const roiGuarantee = {
  evaluationMonths: 6,        // Period to achieve goal
  freeMonthsIfFailed: 6,      // Compensation if goal not met
  averageClientValue: 50000,  // Gs 50K average per visit
  minClientSpend: 100000,     // Minimum to count as "new client"
  enabled: true,              // Toggle for A/B testing
  message: 'Si no conseguís {min} clientes nuevos en 6 meses, los próximos 6 meses son GRATIS',
}
```

### How It Works

1. Clinic signs up for annual plan
2. System tracks new clients attributed to online booking
3. At 6-month mark, evaluate against goal (6 new clients)
4. If goal not met: Apply 6 free months to subscription
5. If goal met: Continue normally, collect testimonial

### Tracking Requirements

To validate ROI guarantee claims:
- Track `source` on appointments (online vs walk-in)
- Track new vs returning customers
- Generate monthly reports for clinic owner
- Dashboard showing progress toward guarantee

---

## Onboarding Structure

High-touch onboarding justifies annual pricing and reduces churn.

### Configuration

```typescript
export const onboardingConfig = {
  initialSetupMinutes: 60,
  weeklyCheckInMinutes: 30,
  weeklyCheckInCount: 4,
  monthlyOngoingMinutes: 15,
  callStructure: [
    {
      week: 0,
      type: 'setup',
      duration: 60,
      topics: [
        'Configurar página web',
        'Agregar servicios y precios',
        'Conectar WhatsApp',
        'Crear primer carnet digital',
        'Responder preguntas',
      ],
    },
    {
      week: 1,
      type: 'checkin',
      duration: 30,
      topics: ['Revisar primeras citas', 'Resolver problemas'],
    },
    {
      week: 2,
      type: 'checkin',
      duration: 30,
      topics: ['Entrenar funciones avanzadas', 'Revisar reportes'],
    },
    {
      week: 3,
      type: 'checkin',
      duration: 30,
      topics: ['Optimizar flujo de trabajo', 'Recoger feedback'],
    },
    {
      week: 4,
      type: 'checkin',
      duration: 30,
      topics: ['Recoger testimonial', 'Discutir referidos'],
    },
  ],
}
```

### Onboarding Schedule

| Week | Call Type | Duration | Focus |
|------|-----------|----------|-------|
| 0 | Initial Setup | 60 min | Full configuration |
| 1 | Check-in | 30 min | First appointments review |
| 2 | Check-in | 30 min | Advanced features training |
| 3 | Check-in | 30 min | Workflow optimization |
| 4 | Check-in | 30 min | Testimonial + referral discussion |
| Monthly | Ongoing | 15 min | Quick check-in, new features |

### Onboarding Script (Week 0)

```text
¡Hola [NOMBRE]! Bienvenido a Vetic.

En esta llamada vamos a:
1. Configurar tu página web (5 min)
2. Agregar tus servicios y precios (10 min)
3. Conectar tu WhatsApp (5 min)
4. Crear tu primer carnet digital (10 min)
5. Responder todas tus preguntas (30 min)

Al final, tu veterinaria va a estar 100% lista para
recibir citas online y entregar carnets digitales.

¿Empezamos?
```

---

## Helper Functions

### Getting Annual Plan Details

```typescript
import { annualPlans, getAnnualPlan, formatPlanPrice } from '@/lib/pricing/tiers'

// Get specific plan
const annual = getAnnualPlan('annual')
console.log(annual?.totalPrice) // 2400000

// Format for display
const formatted = formatPlanPrice(2400000)
console.log(formatted) // "Gs 2.400.000"

// Get all plans
annualPlans.forEach(plan => {
  console.log(`${plan.name}: ${formatPlanPrice(plan.totalPrice)}`)
})
```

### Checking ROI Guarantee Eligibility

```typescript
import { roiGuarantee, isEligibleForGuarantee } from '@/lib/pricing/tiers'

// Check if plan qualifies
const eligible = isEligibleForGuarantee('annual') // true
const notEligible = isEligibleForGuarantee('free') // false
```

---

## Trial Configuration

```typescript
export const trialConfig = {
  freeMonths: 3,           // 3 months free trial
  trialTier: 'professional', // Full features during trial
  features: [
    'Página web profesional',
    'Agenda online',
    'Carnet digital de vacunas',
    'Recordatorios automáticos',
    'Reportes básicos',
  ],
}
```

### Trial Flow

1. Clinic signs up (via claim, referral, or direct)
2. Gets 3 months of Professional tier free
3. At month 3, prompt to convert to paid annual plan
4. With ambassador referral: +2 months bonus (5 months total)

---

## Lifetime Value Comparison

| Approach | Avg Retention | LTV per Clinic | 100 Clinics LTV |
|----------|---------------|----------------|-----------------|
| Monthly (old) | 6 months | Gs 1,500,000 (~$206) | Gs 150M (~$20.6K) |
| Annual + Onboarding | 18 months | Gs 4,300,000 (~$590) | Gs 430M (~$59K) |

**Annual plans = 3x lifetime value**

---

## Database Fields

Tenants table pricing fields:

| Field | Type | Description |
|-------|------|-------------|
| `plan` | TEXT | Current plan: 'free', 'professional', 'enterprise' |
| `plan_expires_at` | TIMESTAMPTZ | When current plan expires |
| `billing_cycle` | TEXT | 'monthly', 'annual', 'biennial' |
| `referral_discount_percent` | NUMERIC | Stacked referral discounts |

---

## UI Components

### Pricing Display

Use the `PricingSection` component for landing pages:

```tsx
import { PricingSection } from '@/components/landing/pricing-section'

<PricingSection
  showAnnualPlans={true}
  highlightPlan="annual"
  showRoiGuarantee={true}
/>
```

### Plan Selection

```tsx
import { annualPlans, formatPlanPrice } from '@/lib/pricing/tiers'

{annualPlans.map(plan => (
  <div key={plan.id}>
    <h3>{plan.name}</h3>
    <p>{formatPlanPrice(plan.totalPrice)}</p>
    <p>Ahorrás {plan.savingsPercent * 100}%</p>
    <p>{plan.onboardingCalls} llamadas de onboarding incluidas</p>
  </div>
))}
```

---

## API Endpoints

### Get Pricing Info

```
GET /api/pricing
```

Returns current pricing configuration, plans, and ROI guarantee details.

### Apply Referral Discount

```
POST /api/referrals/apply
{
  "referralCode": "ADRIS26"
}
```

Applies referral discount to tenant's subscription.

---

## Testing

```bash
# Run pricing-related tests
npm test -- --grep "pricing"
```

Test cases:
- Annual plan calculations
- ROI guarantee eligibility
- Referral discount stacking
- Trial period handling

---

*Configuration file: `web/lib/pricing/tiers.ts`*
