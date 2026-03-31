# Website Update Recommendations

> Aligning vetic.com with the growth strategy for 100 clinics in 6 months

## Executive Summary

After analyzing the current website against our growth strategy, there are **critical gaps** that need addressing. The website currently lacks our key differentiators: **ROI guarantee**, **high-touch onboarding messaging**, **annual pricing emphasis**, **ambassador program visibility**, and **claim website flow for pre-generated sites**.

---

## Priority 1: Critical Updates (This Week)

### 1.1 Add ROI Guarantee to Hero Section

**Current State:** Hero mentions "Empezar Gratis" but no trust-building risk reversal.

**Recommended Change:** Add ROI guarantee prominently in the hero section.

**Location:** `web/components/landing/hero.tsx`

```tsx
// Add after subheadline, before CTAs
<div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
  <Shield className="h-4 w-4" />
  <span>Garantía: 6 clientes nuevos en 6 meses o los próximos 6 meses GRATIS</span>
</div>
```

**Why:** ROI guarantee is our #1 differentiator. It removes risk for clinic owners and builds immediate trust.

---

### 1.2 Update Pricing Page for Annual Plans

**Current State:** Pricing shows monthly/yearly toggle, but doesn't emphasize annual plans as the primary option.

**Recommended Changes:**

| Element | Current | Recommended |
|---------|---------|-------------|
| Default selection | Monthly | Annual (yearly) |
| Annual pricing display | Gs 200K/mo equivalent | Show Gs 2.4M/year prominently |
| 2-Year option | Not shown | Add as premium option |
| Onboarding calls | Not mentioned | "Incluye 3 llamadas de onboarding" |
| ROI guarantee | Not shown | Add prominently to Professional card |

**Location:** `web/components/landing/pricing-section.tsx`

**Key Changes:**
1. Default to `billingPeriod = 'yearly'` instead of `'monthly'`
2. Add "Incluye X llamadas de onboarding" to Professional tier features
3. Add ROI guarantee badge to Professional tier card
4. Add 2-year plan option (Gs 4M/2 años)

---

### 1.3 Add Onboarding Value Proposition

**Current State:** No mention of personalized onboarding support.

**Recommended:** Add "Onboarding Section" to pricing page or create dedicated section.

**New Section Content:**

```markdown
## Onboarding Personalizado

Cuando elegís el Plan Profesional, no estás solo:

**Semana 0 - Setup Inicial (60 min)**
- Configuramos tu página web juntos
- Agregamos tus servicios y precios
- Conectamos WhatsApp
- Creamos tu primer carnet digital

**Semanas 1-4 - Check-ins Semanales (30 min c/u)**
- Revisamos tus primeras citas
- Entrenamos funciones avanzadas
- Optimizamos tu flujo de trabajo
- Recogemos tu feedback
```

---

### 1.4 Add Ambassador Program Link to Navigation

**Current State:** Navigation has no link to ambassador program.

**Recommended Change:** Add "Embajadores" link to navigation.

**Location:** `web/components/landing/landing-nav.tsx`

```tsx
const navLinks = [
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/precios', label: 'Precios' },
  { href: '/red', label: 'Red' },
  { href: '/demo', label: 'Demo' },
  { href: '/ambassador', label: 'Embajadores' }, // ADD THIS
  { href: '/faq', label: 'FAQ' },
  { href: '/nosotros', label: 'Nosotros' },
]
```

---

## Priority 2: New Pages Needed (Next 2 Weeks)

### 2.1 Claim Website Page (`/reclamar`)

**Purpose:** Landing page for pre-generated clinic websites where owners can claim their site.

**Flow:**
1. User arrives at `vetic.com/reclamar?slug=veterinaria-abc`
2. Sees preview of their pre-generated website
3. Fills form: name, email, phone, password
4. Clicks "Reclamar Mi Sitio"
5. Gets redirected to their dashboard

**Components Needed:**
- `web/app/reclamar/page.tsx`
- `web/components/claim/claim-form.tsx`
- `web/components/claim/site-preview.tsx`

**API Already Exists:** `/api/claim` (GET and POST)

---

### 2.2 Ambassador Landing Page Enhancement

**Current State:** Basic ambassador pages exist but need enhancement.

**Recommended Additions:**

**For `/ambassador` (main landing):**
- Add tier progression visual (Embajador → Promotor → Super)
- Add success stories/testimonials from ambassadors
- Add earnings calculator ("Si referís 10 clínicas, ganás Gs X")
- Add university/institution badge options

**For `/ambassador/register`:**
- Add type selection with better descriptions
- Add institution/university field
- Add social proof ("Ya hay X embajadores activos")

---

### 2.3 Enterprise/Multi-Location Page (`/empresas`)

**Current State:** No dedicated enterprise page.

**Recommended:** Create a page for clinic chains with:
- Custom pricing info
- Multi-location features
- Dedicated support promise
- Contact form for enterprise sales

---

## Priority 3: Content Updates (Ongoing)

### 3.1 Update Nosotros (About) Page Stats

**Current State:**
```
{ value: '2024', label: 'Año de fundación' },
{ value: '100+', label: 'Veterinarios usuarios' },
{ value: '10,000+', label: 'Mascotas registradas' },
{ value: '99.9%', label: 'Uptime garantizado' },
```

**Recommended:** Update with real metrics or growth targets:
```
{ value: '500+', label: 'Clínicas pre-generadas' },
{ value: '20+', label: 'Embajadores activos' },
{ value: '15%', label: 'Tasa de conversión' },
{ value: '6 meses', label: 'Garantía ROI' },
```

---

### 3.2 Update FAQ with Growth Strategy Topics

**Add New FAQ Categories:**

**"Programa de Embajadores"**
- ¿Cómo funciona el programa de embajadores?
- ¿Cuánto puedo ganar como embajador?
- ¿Cómo me registro como embajador?

**"Garantía ROI"**
- ¿Qué es la garantía de ROI?
- ¿Cómo se mide si conseguí 6 clientes nuevos?
- ¿Qué pasa si no alcanzo la meta?

**"Reclamo de Sitio"**
- ¿Por qué ya existe un sitio para mi veterinaria?
- ¿Cómo reclamo mi sitio web?
- ¿Qué incluye el sitio pre-generado?

---

### 3.3 Update Hero Messaging for Pre-Generation Strategy

**Current:** "Gestiona tu veterinaria sin complicaciones"

**Recommended Variations for A/B Testing:**

1. **For Pre-Generated Sites:**
   > "Tu página web veterinaria ya está lista. Solo reclamala."

2. **For Cold DMs:**
   > "La web de tu veterinaria en 24 horas. Gratis para empezar."

3. **For University Network:**
   > "El software que usan las mejores veterinarias de Paraguay."

---

## Priority 4: Technical Improvements

### 4.1 Add "Claim Your Website" CTA for Pre-Generated Sites

**Scenario:** When a pre-generated site exists, show special CTA.

**Implementation:**
1. Check if clinic slug is pre-generated and unclaimed
2. Show prominent "Reclamar Este Sitio" button
3. Link to `/reclamar?slug={slug}`

---

### 4.2 Add Referral Code Field to Signup

**Current State:** Signup doesn't ask for referral code.

**Recommended:** Add referral code field to registration flow.

**Location:** `/registro/page.tsx` or signup form

```tsx
<div>
  <label>¿Tenés código de referido?</label>
  <input
    name="referralCode"
    placeholder="Ej: JUAN1234"
    onChange={handleReferralCodeValidation}
  />
  {validCode && (
    <p className="text-green-600">
      ✓ Referido por {ambassadorName} - ¡2 meses extra gratis!
    </p>
  )}
</div>
```

---

### 4.3 Add Social Proof Elements

**Recommended Additions:**

1. **Testimonials Section** on homepage
2. **Clinic Counter** ("500+ veterinarias confían en Vetic")
3. **Ambassador Counter** ("30+ embajadores activos")
4. **Logo Carousel** of partner clinics/universities

---

## File Changes Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `components/landing/hero.tsx` | Add ROI guarantee badge | P1 |
| `components/landing/pricing-section.tsx` | Default to annual, add onboarding | P1 |
| `components/landing/landing-nav.tsx` | Add ambassador link | P1 |
| `lib/pricing/tier-ui.tsx` | Add ROI guarantee to features | P1 |
| `app/reclamar/page.tsx` | **NEW** - Claim page | P2 |
| `app/ambassador/page.tsx` | Enhance with tier progression | P2 |
| `app/empresas/page.tsx` | **NEW** - Enterprise page | P3 |
| `app/faq/page.tsx` | Add new FAQ categories | P3 |
| `app/nosotros/page.tsx` | Update stats | P3 |

---

## Implementation Order

### Week 1
1. ✅ Add ROI guarantee to hero
2. ✅ Update pricing to default to annual
3. ✅ Add onboarding info to pricing cards
4. ✅ Add ambassador link to nav

### Week 2
1. Create `/reclamar` page for claim flow
2. Enhance ambassador landing page
3. Add referral code to signup

### Week 3
1. Create enterprise page
2. Add new FAQ categories
3. Add social proof elements

### Week 4
1. A/B test hero messaging
2. Update about page stats
3. Add testimonials section

---

## Copy/Content Needed

### ROI Guarantee Copy
```
Garantía de ROI: 6 clientes nuevos en 6 meses o los próximos 6 meses son GRATIS

¿Cómo funciona?
1. Usá Vetic normalmente durante 6 meses
2. Registrá los clientes nuevos que llegan por tu web
3. Si no llegás a 6 clientes nuevos, te damos 6 meses gratis

Sin letra chica. Sin trampas. Confiamos en nuestro producto.
```

### Onboarding Copy
```
No estás solo. Con el Plan Profesional:

✓ Setup inicial de 60 minutos
✓ 4 check-ins semanales de 30 minutos
✓ Soporte prioritario por WhatsApp
✓ Te acompañamos hasta que tu clínica despegue
```

### Ambassador Program Copy
```
Ganá dinero recomendando Vetic

Embajador (1+ referido): 30% comisión + Vetic Lifetime
Promotor (5+ referidos): 40% comisión + Gs 50K extra/referido
Super (10+ referidos): 50% comisión + Features exclusivos

¿Sos estudiante o trabajás en una veterinaria? Este programa es para vos.
```

---

## Tracking Implementation

After implementing changes, track:

1. **Hero Changes:**
   - Click-through rate on "Empezar Gratis" button
   - Bounce rate on homepage

2. **Pricing Changes:**
   - % of signups choosing annual vs monthly
   - Conversion rate from pricing page

3. **Ambassador:**
   - Ambassador registrations per week
   - Referral conversions

4. **Claim Flow:**
   - Claim completion rate
   - Time from page visit to claim completion

---

*Last updated: January 2026*
