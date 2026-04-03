# Fun4Me Store — Complete Product Roadmap
## From MVP to V1: Online Adult Store for Paraguay

---

## 1. BUSINESS INTELLIGENCE

### Who is Fun4Me?
- **Name:** Fun4Me Sex Store
- **Type:** Boutique / Adult Store (physical location)
- **Address:** 25 de Mayo 2338, Asunción 1429, Paraguay
- **Phone:** +595 976 569739
- **Rating:** 4.9 stars on Google Maps
- **Category:** Boutique (Google classification)
- **Instagram:** @fun4me_store
- **Website:** None — currently only Instagram presence
- **Google Maps:** Listed, active, photos present

### Current Online Presence
| Channel          | Status    | Notes                                        |
|------------------|-----------|----------------------------------------------|
| Physical Store   | ✅ Active | 25 de Mayo 2338, Asunción                    |
| Google Maps      | ✅ Active | 4.9 stars, photos, address, phone listed     |
| Instagram        | ✅ Active | @fun4me_store — primary sales channel        |
| Facebook         | ❓ Unknown | May exist under different name               |
| TikTok           | ❓ Unknown | Not confirmed                                |
| Website          | ❌ None   | Links to Instagram from Google Maps          |
| WhatsApp         | ✅ Active | +595 976 569739 (likely used for orders)     |

### Market Context (Paraguay)
- Adult product sales are **legal** in Paraguay for 18+
- No specific restrictive regulation for sex shops
- Market is **fragmented** — most competitors are Instagram/WhatsApp-only
- **Huge opportunity**: very few professional ecommerce sites exist in this niche in PY
- Mobile traffic dominates (80%+ in Paraguay)
- Cash-based economy — COD (contra entrega) is critical
- Discreet packaging is the **#1 customer concern**

### Key Competitors
| Competitor         | Platform          | Strengths                    |
|-------------------|-------------------|------------------------------|
| Tentaciones PY    | WooCommerce       | Established, SEO presence    |
| Placer Total PY   | Instagram/WP      | Strong social media          |
| Boutique Sensual  | Instagram          | Lingerie focus, aesthetic    |
| MercadoLibre sellers | Marketplace    | Built-in traffic             |
| Instagram sellers | IG + WhatsApp     | Low overhead, personal touch |

### Competitive Advantages to Build
1. **Professional ecommerce site** (most competitors lack this)
2. **Online payments** with cuotas/installments
3. **Discreet packaging guaranteed** — make it a brand promise
4. **Same-day delivery** in Asunción
5. **Educational content** — wellness positioning, not just products
6. **Strong WhatsApp integration** for customer service

---

## 2. TECH STACK

| Layer              | Technology                                  | Reason                           |
|--------------------|--------------------------------------------|----------------------------------|
| Frontend           | Next.js 14+ (App Router)                   | SSR for SEO, team knows it       |
| Styling            | Tailwind CSS + shadcn/ui                   | Fast, consistent, team knows it  |
| State Management   | Zustand                                    | Lightweight cart state           |
| Database           | Supabase (PostgreSQL)                      | Auth, Storage, Realtime, RLS     |
| Auth               | Supabase Auth                              | Email/password, Google OAuth     |
| Image Storage      | Supabase Storage                           | Product images + transforms      |
| Payments (Primary) | Bancard vPOS                               | THE standard for PY card payments|
| Payments (COD)     | Custom                                     | Cash on delivery — essential     |
| Payments (Transfer)| Custom                                     | Bank transfer with receipt upload|
| Notifications      | WhatsApp Cloud API (Meta)                  | Primary channel in Paraguay      |
| Email              | Resend                                     | Transactional emails             |
| Analytics          | Umami (self-hosted) or Plausible           | Privacy-focused, lightweight     |
| Hosting            | Self-hosted VPS (Docker + Coolify)         | No platform censorship risk      |
| Search             | Supabase full-text search (tsvector)       | Built-in, no extra cost          |
| CDN                | Cloudflare                                 | Cache, DDoS, SSL                 |

### Why Self-Hosted (Not Vercel/Netlify)
- Vercel/Netlify AUP may restrict adult content
- Self-hosting on VPS gives full control
- Docker + Coolify makes it easy to deploy
- Can use existing Hostinger VPS or add a Hetzner box

---

## 3. DATABASE SCHEMA (Core Tables)

```
categories          products              product_variants
├── id              ├── id                ├── id
├── name            ├── name              ├── product_id (FK)
├── slug            ├── slug              ├── name (e.g. "Rosa", "Grande")
├── parent_id (FK)  ├── description       ├── sku
├── image_url       ├── price             ├── price_override
├── sort_order      ├── category_id (FK)  ├── stock_quantity
└── is_active       ├── images[]          ├── is_active
                    ├── sku               └── attributes (JSONB)
                    ├── is_active
                    ├── is_featured
                    ├── brand
                    ├── tags[]
                    └── meta (JSONB)

orders              order_items           customers (extends auth.users)
├── id              ├── id                ├── id
├── customer_id     ├── order_id (FK)     ├── email
├── status (enum)   ├── product_id (FK)   ├── full_name
├── total           ├── variant_id (FK)   ├── phone
├── subtotal        ├── quantity          ├── cedula_hash
├── shipping_cost   ├── unit_price        ├── age_verified
├── payment_method  └── line_total        ├── addresses (JSONB[])
├── payment_ref                           ├── default_address_idx
├── shipping_address (JSONB)              └── created_at
├── notes
├── is_gift
└── created_at

cart                cart_items            inventory_movements
├── id              ├── id                ├── id
├── customer_id     ├── cart_id (FK)      ├── product_variant_id (FK)
├── session_id      ├── variant_id (FK)   ├── quantity_change
├── expires_at      ├── quantity          ├── reason (enum)
└── created_at      └── added_at          ├── reference (order_id, etc.)
                                          └── created_at

shipping_zones      coupons               reviews
├── id              ├── id                ├── id
├── name            ├── code              ├── product_id (FK)
├── cities[]        ├── type (%, fixed)   ├── customer_id (FK)
├── price           ├── value             ├── rating (1-5)
├── est_days        ├── min_order         ├── comment
├── is_active       ├── uses_remaining    ├── is_approved
└── sort_order      ├── expires_at        └── created_at
                    └── is_active
```

Order status flow:
```
PENDING_PAYMENT → PAYMENT_CONFIRMED → PREPARING → SHIPPED → DELIVERED → COMPLETED
         ↓              ↓                ↓           ↓
      CANCELLED      CANCELLED        CANCELLED   RETURN_REQUESTED → RETURNED
```

---

## 4. PHASED ROADMAP

### ═══════════════════════════════════════════
### PHASE 0: Foundation (Week 1)
### ═══════════════════════════════════════════

**Goal:** Project setup, CI/CD, database schema, dev environment

| Task                                    | Priority | Effort  |
|-----------------------------------------|----------|---------|
| Init Next.js 14 project (App Router)    | P0       | 2h      |
| Configure Tailwind + shadcn/ui          | P0       | 1h      |
| Set up Supabase project + schema        | P0       | 4h      |
| Create RLS policies                     | P0       | 3h      |
| Set up Docker + docker-compose          | P0       | 2h      |
| CI pipeline (lint, typecheck, tests)    | P0       | 2h      |
| Configure ESLint + Prettier             | P0       | 1h      |
| Seed script with sample data            | P1       | 2h      |
| Set up Coolify deployment               | P1       | 3h      |
| Domain + SSL (Cloudflare)               | P1       | 1h      |

**Exit criteria:** `pnpm dev` runs, DB has tables, CI passes, deploy pipeline works.

---

### ═══════════════════════════════════════════
### PHASE 1: MVP — Browse & Buy (Weeks 2-4)
### ═══════════════════════════════════════════

**Goal:** Customers can browse products and place orders (manual payment confirmation)

#### 1A. Storefront (Week 2)

| Feature                                 | Priority | Effort  |
|-----------------------------------------|----------|---------|
| Age gate modal (18+ confirmation)       | P0       | 3h      |
| Homepage: hero, featured, categories    | P0       | 6h      |
| Category listing page with filters      | P0       | 6h      |
| Product detail page                     | P0       | 6h      |
| Product image gallery + zoom            | P0       | 3h      |
| Search bar (Supabase full-text)         | P1       | 4h      |
| Mobile-responsive layout                | P0       | 4h      |
| SEO: meta tags, OG images, sitemap      | P1       | 3h      |
| WhatsApp floating button                | P0       | 1h      |

#### 1B. Cart & Checkout (Week 3)

| Feature                                 | Priority | Effort  |
|-----------------------------------------|----------|---------|
| Shopping cart (Zustand + localStorage)  | P0       | 6h      |
| Cart drawer/page                        | P0       | 4h      |
| Guest checkout (no account required)    | P0       | 4h      |
| Shipping address form                   | P0       | 3h      |
| Shipping zone auto-calculation          | P0       | 3h      |
| Order summary + confirmation            | P0       | 3h      |
| Payment method: Bank Transfer           | P0       | 3h      |
| Payment method: Cash on Delivery        | P0       | 2h      |
| Receipt upload (bank transfer proof)    | P0       | 3h      |
| Order confirmation page + email         | P0       | 3h      |

#### 1C. Basic Admin Panel (Week 4)

| Feature                                 | Priority | Effort  |
|-----------------------------------------|----------|---------|
| Admin auth (role-based via Supabase)    | P0       | 3h      |
| Product CRUD (create, edit, delete)     | P0       | 8h      |
| Image upload to Supabase Storage        | P0       | 3h      |
| Category management                     | P0       | 4h      |
| Order list + detail view                | P0       | 6h      |
| Order status update (manual)            | P0       | 3h      |
| Simple dashboard (orders today, revenue)| P1       | 4h      |

**MVP Exit Criteria:**
- Customer can browse → add to cart → checkout → pay via transfer/COD
- Admin can manage products and process orders
- Site is mobile-responsive and fast
- Age gate works
- Deployed and accessible on fun4me domain

---

### ═══════════════════════════════════════════
### PHASE 2: Online Payments (Weeks 5-6)
### ═══════════════════════════════════════════

**Goal:** Accept card payments online via Bancard vPOS

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Bancard vPOS integration (sandbox)         | P0       | 8h      |
| Bancard checkout flow (redirect/iframe)    | P0       | 6h      |
| Payment webhook handler                    | P0       | 4h      |
| Auto order status on payment success       | P0       | 2h      |
| Payment failure handling + retry           | P0       | 3h      |
| Cuotas (installments) support              | P1       | 4h      |
| Bancard vPOS production deployment         | P0       | 4h      |
| QR payment via Bancard (if available)      | P2       | 4h      |
| Payment reconciliation in admin            | P1       | 4h      |
| Refund flow (admin-initiated)              | P1       | 4h      |

**Requirements:**
- RUC (business tax ID) registered
- Merchant agreement with Bancard signed
- Bank merchant account active

**Exit criteria:** Customers can pay with credit/debit cards. Payments auto-confirm orders.

---

### ═══════════════════════════════════════════
### PHASE 3: Notifications & Accounts (Weeks 7-8)
### ═══════════════════════════════════════════

**Goal:** Automated notifications, customer accounts, order tracking

#### 3A. WhatsApp Notifications

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| WhatsApp Cloud API setup (Meta Business)   | P0       | 4h      |
| Template messages (order confirmed, shipped, delivered) | P0 | 4h |
| DB trigger → Edge Function → WhatsApp      | P0       | 4h      |
| Discreet message content (no product names)| P0       | 1h      |
| Admin notification on new order            | P0       | 2h      |
| Low stock alert to admin via WhatsApp      | P1       | 2h      |

#### 3B. Customer Accounts

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Registration / Login (email + password)    | P0       | 4h      |
| Customer profile (name, phone, addresses)  | P0       | 4h      |
| Order history page                         | P0       | 4h      |
| Saved addresses (multiple)                 | P1       | 3h      |
| Password reset flow                        | P0       | 2h      |
| Google OAuth login                         | P2       | 2h      |

#### 3C. Email Notifications

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Resend integration                         | P0       | 2h      |
| Order confirmation email (HTML template)   | P0       | 3h      |
| Shipping notification email                | P1       | 2h      |
| Welcome email on registration              | P2       | 1h      |

**Exit criteria:** Customers get WhatsApp + email at each order stage. Accounts work.

---

### ═══════════════════════════════════════════
### PHASE 4: Inventory & Operations (Weeks 9-10)
### ═══════════════════════════════════════════

**Goal:** Proper inventory management, shipping workflow, admin efficiency

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Stock tracking per variant                 | P0       | 4h      |
| Auto-decrement on order                    | P0       | 2h      |
| Stock reservation (30min hold on checkout) | P1       | 4h      |
| Low stock alerts (configurable threshold)  | P0       | 3h      |
| Inventory movements log                    | P1       | 3h      |
| Bulk product import (CSV)                  | P1       | 4h      |
| Shipping label generation (PDF)            | P1       | 4h      |
| Delivery zone management in admin          | P0       | 3h      |
| Print packing slip                         | P1       | 3h      |
| Daily order summary report (email/WA)      | P2       | 3h      |
| Out-of-stock handling (hide/waitlist)      | P1       | 3h      |

**Exit criteria:** Admin has full inventory control. No overselling. Operational efficiency.

---

### ═══════════════════════════════════════════
### PHASE 5: Growth Features (Weeks 11-14) — V1
### ═══════════════════════════════════════════

**Goal:** Features that drive revenue growth, retention, and SEO

#### 5A. Marketing & Promotions

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Coupon/discount codes                      | P0       | 6h      |
| Free shipping threshold (e.g. >Gs 500K)   | P0       | 2h      |
| Product bundles / kits                     | P1       | 6h      |
| "Customers also bought" recommendations    | P2       | 4h      |
| Flash sales / limited-time pricing         | P2       | 4h      |
| Gift wrapping option at checkout           | P1       | 2h      |
| Referral program (share link, get discount)| P2       | 6h      |

#### 5B. Content & SEO

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Blog / educational articles                | P1       | 6h      |
| Product guides ("Cómo elegir tu primer...") | P1      | 4h      |
| Structured data (JSON-LD for products)     | P0       | 3h      |
| XML sitemap (dynamic from products)        | P0       | 2h      |
| RTA adult content meta tag                 | P0       | 1h      |
| Google Business Profile optimization       | P1       | 2h      |
| FAQ page                                   | P1       | 2h      |

#### 5C. Reviews & Social Proof

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Product reviews/ratings system             | P0       | 6h      |
| Review moderation in admin                 | P0       | 3h      |
| Star ratings on product cards              | P0       | 2h      |
| Review request after delivery (WhatsApp)   | P1       | 2h      |
| Testimonials section on homepage           | P2       | 2h      |

#### 5D. Wishlist & Personalization

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Wishlist (save for later)                  | P1       | 4h      |
| Recently viewed products                   | P2       | 3h      |
| Newsletter signup + email campaigns        | P1       | 4h      |
| Personalized product suggestions           | P2       | 6h      |

#### 5E. Analytics & Reporting

| Feature                                    | Priority | Effort  |
|--------------------------------------------|----------|---------|
| Umami/Plausible setup                      | P0       | 2h      |
| Ecommerce event tracking                   | P0       | 4h      |
| Admin dashboard: revenue, AOV, top products| P0       | 6h      |
| Conversion funnel tracking                 | P1       | 4h      |
| Cart abandonment tracking                  | P1       | 3h      |

**V1 Exit Criteria:**
- Full ecommerce operation: browse → pay → track → review
- Card payments working (Bancard vPOS)
- Automated WhatsApp + email notifications
- Inventory management with alerts
- Coupons and promotions
- SEO optimized with blog content
- Reviews and ratings
- Analytics dashboard
- Mobile-first, fast, accessible

---

## 5. POST-V1 BACKLOG (Future)

| Feature                              | Phase   | Notes                                  |
|--------------------------------------|---------|----------------------------------------|
| MercadoPago integration              | V1.1    | Secondary payment method               |
| Tigo Money / Personal Pay            | V1.1    | Mobile wallet payments                 |
| Subscription boxes                   | V1.2    | Monthly curated boxes                  |
| Loyalty points program               | V1.2    | Points per purchase → discounts        |
| Multi-language (Guaraní/English)     | V1.3    | Expand market reach                    |
| PWA (installable app)                | V1.2    | App-like experience, push notifs       |
| Live chat (Crisp/Tawk.to)           | V1.1    | Real-time customer support             |
| A/B testing (PostHog)                | V1.3    | Optimize conversion                    |
| Marketplace (third-party sellers)    | V2.0    | Major architectural change             |
| Physical POS integration             | V2.0    | Unify online + in-store inventory      |
| Mobile app (React Native)            | V2.0    | If traffic justifies it                |

---

## 6. CRITICAL BUSINESS REQUIREMENTS

### Legal / Compliance
- [ ] RUC registered for ecommerce
- [ ] Municipal commerce license (patente comercial)
- [ ] IVA (10%) configured on all prices
- [ ] Consumer protection compliance (Ley 1334/98)
- [ ] Clear return policy (hygiene restrictions for opened items)
- [ ] Privacy policy + terms of service
- [ ] Age verification (18+) on site entry
- [ ] Verify Bancard accepts adult product merchants
- [ ] DINAVISA registration for lubricants/intimate health products (if applicable)

### Brand & Trust Signals
- [ ] Discreet packaging — **brand promise on every page**
- [ ] Generic billing name on card statements
- [ ] SSL certificate (Cloudflare)
- [ ] Physical address displayed (builds trust)
- [ ] WhatsApp support prominently displayed
- [ ] Google Reviews integration
- [ ] Return/exchange policy clearly visible

### Payment Setup
- [ ] Bancard merchant account application
- [ ] Bank account for settlements
- [ ] COD process with delivery personnel
- [ ] Bank transfer account details + receipt workflow

---

## 7. TIMELINE SUMMARY

```
Week  1      ████  Phase 0: Foundation
Weeks 2-4    ████████████  Phase 1: MVP (Browse + Buy + Admin)
Weeks 5-6    ████████  Phase 2: Online Payments (Bancard vPOS)
Weeks 7-8    ████████  Phase 3: Notifications + Accounts
Weeks 9-10   ████████  Phase 4: Inventory + Operations
Weeks 11-14  ████████████████  Phase 5: Growth Features → V1 LAUNCH
```

**Total estimated time: 14 weeks (3.5 months)**
- MVP launch (basic orders): Week 4
- Card payments live: Week 6
- Full V1 launch: Week 14

---

## 8. KEY RISKS & MITIGATIONS

| Risk                                    | Impact | Mitigation                                    |
|-----------------------------------------|--------|-----------------------------------------------|
| Bancard rejects adult merchant          | HIGH   | Apply early; frame as "wellness/intimate products"; have MercadoPago as backup |
| Hosting platform removes site           | HIGH   | Self-host from day 1 (VPS + Docker)           |
| WhatsApp template rejected by Meta      | MEDIUM | Keep messages generic/discreet; no product names |
| Low initial traffic                     | MEDIUM | SEO from day 1; leverage existing IG following |
| Payment fraud                           | MEDIUM | Bancard handles card fraud; COD = no digital risk |
| DINAVISA requires registration          | LOW    | Consult lawyer early; applies mainly to lubricants |
| Competitor launches similar site        | LOW    | Move fast; first-mover advantage is huge in PY |

---

## 9. DEVELOPMENT PRINCIPLES

1. **Test-Driven Development** — Write tests first, code second (Vitest + Playwright)
2. **Mobile-First** — Design for phone screens, enhance for desktop
3. **Discreet by Default** — Every customer touchpoint must be private
4. **SEO from Day 1** — Server-rendered pages, meta tags, structured data
5. **Ship Fast, Iterate** — MVP in 4 weeks, gather real feedback, adjust
6. **WhatsApp-Native** — Paraguay lives on WhatsApp; make it the primary channel
7. **Guaraníes First** — All prices in PYG; USD optional display

---

*Document version: 1.0*
*Created: 2026-04-03*
*Repository: github.com/Ai-Whisperers/fun4me-store*
