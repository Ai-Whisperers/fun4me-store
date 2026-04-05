# Fun4Me Store — Product Roadmap v4.0
## Post-Audit Edition — Gaps Closed, Stories Complete

*Upgraded from v3.0 after full codebase + live site audit on 2026-04-04*

---

## CURRENT STATE SUMMARY

### What's Live
- Age verification gate (DOB + 30-day cookie)
- Full storefront: homepage, categories (8), kinks (6), product detail, search
- 54 sample products in Supabase (12 tables)
- Cart drawer + cart page with free shipping bar
- Checkout flow (shipping form, zone detection, bank transfer / COD)
- Admin panel (dashboard, product CRUD, order management)
- SEO (sitemap.xml, robots.txt, JSON-LD, Open Graph)
- Ofertas (deals) page
- WhatsApp floating button
- Deployed on Hostinger VPS via Docker + Traefik

### What's Broken (Critical Bugs Found in Audit)
| # | Bug | Severity |
|---|-----|----------|
| B1 | Checkout does NOT save orders to Supabase — only sessionStorage | CRITICAL |
| B2 | Admin panel has ZERO auth protection — anyone can access /admin | CRITICAL |
| B3 | Product images don't show in cart (image_url vs images[] mismatch) | HIGH |
| B4 | Free shipping threshold inconsistent (300K vs 500K) | MEDIUM |
| B5 | Login page is non-functional stub (no Supabase auth) | HIGH |
| B6 | Newsletter signup does nothing (no API call) | MEDIUM |
| B7 | Footer "Ayuda" links are dead (Envios, Devolucion, FAQ, Privacidad) | MEDIUM |
| B8 | Ofertas nav link points to /#ofertas instead of /ofertas | LOW |
| B9 | Cart hydration mismatch (no mounted guard in drawer/cart page) | MEDIUM |
| B10 | Nested interactive elements: button inside Link in ProductCard | MEDIUM |
| B11 | formatPrice duplicated in 3 admin files | LOW |
| B12 | updateQuantity doesn't check max_stock | LOW |
| B13 | WhatsApp number masked in constants.ts but shown in footer | LOW |

---

## PHASE 1.5: BUG FIXES + HARDENING (Before anything else)

> **Goal:** Make the existing site actually work end-to-end.
> **Timeline:** 1-2 days. No new features until these are done.
> **Can do without client input:** YES — all items.

### EPIC: Critical Bug Fixes
| # | Story | Hrs | Priority |
|---|-------|-----|----------|
| H1 | Checkout: create API route that writes orders to Supabase (orders + order_items tables) | 4 | P0 |
| H2 | Checkout: validate stock before placing order, return error if insufficient | 2 | P0 |
| H3 | Checkout: add email field to form (needed for receipts + future comms) | 1 | P0 |
| H4 | Checkout: upload bank transfer receipt to Supabase Storage | 2 | P0 |
| H5 | Checkout: generate real order number (sequential via DB) not timestamp | 1 | P0 |
| H6 | Confirmation page: fetch order from Supabase by ID (don't rely on sessionStorage) | 2 | P0 |

### EPIC: Security Hardening
| # | Story | Hrs | Priority |
|---|-------|-----|----------|
| H7 | Admin auth: implement Supabase auth check on /admin routes via middleware | 3 | P0 |
| H8 | Login page: wire up Supabase email/password auth with error handling | 2 | P0 |
| H9 | Admin RLS: ensure products/orders writes require admin role (not anonymous) | 2 | P0 |
| H10 | Add rate limiting to checkout API route (prevent spam orders) | 1 | P1 |

### EPIC: Data Integrity Fixes
| # | Story | Hrs | Priority |
|---|-------|-----|----------|
| H11 | Fix ProductCard: read images[0] instead of image_url for product photos | 1 | P1 |
| H12 | Fix cart store: pass image_url when adding items so cart shows product images | 1 | P1 |
| H13 | Normalize free shipping threshold to single constant (300,000 Gs) | 0.5 | P1 |
| H14 | Fix Ofertas nav link: point to /ofertas not /#ofertas | 0.5 | P1 |
| H15 | Fix cart hydration: add mounted state guard in cart-drawer and carrito page | 1 | P1 |
| H16 | Fix ProductCard: move "Add to Cart" button outside the Link element | 1 | P1 |
| H17 | Consolidate formatPrice — use shared lib/utils/format.ts everywhere | 1 | P1 |
| H18 | Fix updateQuantity to check max_stock | 0.5 | P2 |
| H19 | Fix WhatsApp number consistency across constants.ts and footer | 0.5 | P2 |

### EPIC: Error Handling + Loading States
| # | Story | Hrs | Priority |
|---|-------|-----|----------|
| H20 | Add error.tsx boundary at (store) layout level (Spanish error page) | 1 | P1 |
| H21 | Add not-found.tsx at (store) layout level (Spanish 404 page) | 1 | P1 |
| H22 | Add loading.tsx skeletons: homepage, category, product detail, search, admin | 5 | P1 |
| H23 | Add error handling to all Supabase queries (graceful fallback, not blank page) | 2 | P1 |
| H24 | Header: add loading state while categories fetch client-side | 1 | P2 |

### EPIC: Accessibility
| # | Story | Hrs | Priority |
|---|-------|-----|----------|
| H25 | Add aria-labels to cart quantity buttons (+/-/delete) | 0.5 | P2 |
| H26 | Add aria-pressed to filter/zone/payment selection buttons | 1 | P2 |
| H27 | Add role="tab"/aria-selected to ProductTabs | 1 | P2 |
| H28 | Add aria-expanded to mobile menu hamburger + categories dropdown | 0.5 | P2 |
| H29 | Add role="progressbar" + aria-valuenow to free shipping bar | 0.5 | P2 |

**Phase 1.5 total: ~38h | EXIT: Site actually processes orders. Admin is protected.**

---

## PHASE 1 COMPLETION: REMAINING WEEK 3-4 GAPS

> **Goal:** Complete everything from the original Phase 1 plan that was missed.
> **Timeline:** 1 week after Phase 1.5.
> **Can do without client input:** Most items — noted where blocked.

### EPIC: Missing Catalog Features
| # | Story | Hrs | Blocked? |
|---|-------|-----|----------|
| C1 | Search autocomplete: typeahead dropdown as user types (Supabase ilike, debounced) | 4 | No |
| C2 | Pagination on category pages (12 products per page, prev/next + page numbers) | 3 | No |
| C3 | Pagination on search results page | 2 | No |
| C4 | Pagination on kink pages | 2 | No |
| C5 | Sort dropdown on category/kink/search pages (price asc/desc, newest, name) | 2 | No |

### EPIC: Missing Admin Features
| # | Story | Hrs | Blocked? |
|---|-------|-----|----------|
| C6 | Admin: category management CRUD (create, edit, delete, reorder, image) | 4 | No |
| C7 | Admin: kink category management CRUD | 3 | No |
| C8 | Admin: image upload via Supabase Storage (drag & drop, replace URL paste) | 4 | No |
| C9 | Admin: bank transfer receipt viewer + verify/reject buttons | 3 | No |
| C10 | Admin: print discreet packing slip (generic items, no product names) | 3 | No |
| C11 | Admin: mobile sidebar (hamburger menu for admin on mobile) | 2 | No |
| C12 | Admin: product search/filter on products list | 2 | No |
| C13 | Admin: pagination on products + orders lists (currently loads ALL) | 2 | No |

### EPIC: Missing Pages
| # | Story | Hrs | Blocked? |
|---|-------|-----|----------|
| C14 | Envios page: shipping zones, prices, delivery times, discreet packaging info | 2 | Partial — need real zones from Rach |
| C15 | Devolucion page: return/exchange policy | 2 | Blocked — need policy from Rach |
| C16 | FAQ page: common questions (materials, privacy, shipping, returns) | 3 | No — write generic, Rach refines |
| C17 | Privacidad page: privacy policy (GDPR-lite for Paraguay) | 2 | No |
| C18 | RTA adult meta tag in HTML head | 0.5 | No |

### EPIC: Email Integration (Resend)
| # | Story | Hrs | Blocked? |
|---|-------|-----|----------|
| C19 | Set up Resend: API key, domain verification, sender address | 1 | Blocked — need domain/API key |
| C20 | Order confirmation email template (branded, discreet subject line) | 3 | No — build template, connect later |
| C21 | Order shipped email template | 2 | No |
| C22 | Newsletter: actually collect emails to Supabase on signup | 1 | No |

**Phase 1 completion total: ~50h | EXIT: Full Phase 1 as originally planned.**

---

## PHASE 2: PAYMENTS + CONVERSION (Weeks 5-8)

> **Goal:** Remove buying friction. Add card payments. Increase AOV.
> **Measure:** Conversion rate improvement, AOV increase, payment method split.
> **Gate:** Only proceed if MVP is getting orders. If zero orders, FIX THAT first.

### EPIC: Bancard vPOS Integration (Blocked — needs merchant account)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| P51 | Bancard vPOS sandbox: create API routes for payment initiation + callback | 10 | Yes — needs credentials | Payment initiated, redirects to Bancard, returns to site |
| P52 | Checkout: add Bancard as 3rd payment option with redirect flow | 8 | Yes | User selects card, redirected to Bancard, returns on success/failure |
| P53 | Bancard webhook handler: verify signature, update order status automatically | 4 | Yes | Order goes from pending to payment_confirmed on successful webhook |
| P54 | Auto status update: pending → payment_confirmed on webhook success | 2 | Yes | No manual admin action needed for card payments |
| P55 | Cuotas display: show installment options at checkout (3/6/12 cuotas) | 4 | Yes | User sees monthly amount for each cuota option |
| P56 | Payment failure page: clear error message + retry button + alternative payment | 3 | No | User can retry or switch to bank transfer |
| P57 | Bancard production deployment: switch from sandbox to live credentials | 4 | Yes | Real transactions process successfully |
| P58 | Admin: payment transactions view with filters (status, method, date range) | 3 | No | Admin sees all payments, can filter and search |

### EPIC: Conversion Optimization (Unblocked)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| P59 | Abandoned cart recovery: save cart to Supabase when user has phone, WhatsApp reminder after 2h | 4 | Partial — needs WhatsApp API | Cart saved to DB, reminder sent via WhatsApp |
| P60 | Checkout upsell: "Agregar lubricante por Gs 25,000" based on cart contents | 4 | No | Related add-on appears at checkout, one-click add |
| P61 | Cross-sell on product page: "Clientes tambien compraron" (same category, random) | 3 | No | 4 related products shown below main product |
| P62 | Free shipping threshold: make configurable in admin settings (not hardcoded) | 2 | No | Admin can change threshold, all pages update |
| P63 | Coupon code engine: percentage off, fixed amount, free shipping | 5 | No | Coupons apply at checkout, validate min order / expiry / max uses |
| P64 | Admin: coupon CRUD + usage tracking dashboard | 3 | No | Admin creates/edits/deactivates coupons, sees usage stats |
| P65 | Announcement bar: admin-editable rotating promos (Supabase table) | 3 | No | Admin adds promo messages, they rotate on site |
| P66 | Stock urgency: show "Quedan solo X!" when stock < 5 on product page + card | 2 | No | Red badge appears when stock is low |
| P67 | Guest checkout optimization: phone-first, fewer required fields, autofill city | 3 | No | Checkout has 30% fewer fields, phone is primary identifier |
| P68 | Speed optimization: Next.js Image component, lazy loading, Cloudflare cache headers | 4 | No | Lighthouse performance score > 85 |

### EPIC: WhatsApp Business Integration (Blocked — needs Meta Cloud API)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| P69 | WhatsApp Cloud API setup: connect Meta Business, create message templates | 4 | Yes — needs Meta Business Manager | Templates approved by Meta |
| P70 | WhatsApp order confirmed notification: send on payment_confirmed status | 3 | Yes | Customer gets WhatsApp message with order number |
| P71 | WhatsApp shipped notification: send on shipped status with tracking info | 3 | Yes | Customer gets WhatsApp with delivery estimate |
| P72 | Admin: one-click WhatsApp trigger on order status change | 3 | Yes | Admin changes status, WhatsApp sends automatically |

**Phase 2 total: ~77h | Unblocked items: ~29h**

### Phase 2 Decision Gate
```
MEASURE AFTER 2 WEEKS OF CARD PAYMENTS:
- What % pay by card vs. COD vs. transfer?
- Has conversion rate improved vs. Phase 1?
- What's the new AOV? (cuotas should increase it)
- What are top search queries? (reveals unmet demand)
- What products get viewed but not bought? (pricing/trust issue?)
- Coupon redemption rate — are promos driving sales?
- Abandoned cart recovery rate — is WhatsApp follow-up working?
```

---

## PHASE 3: RETENTION + REPEAT PURCHASES (Weeks 9-12)

> **Goal:** Turn one-time buyers into repeat customers.
> **Measure:** Repeat purchase rate, review submission rate, email list size.
> **Gate:** Only build loyalty if you have 100+ customers. Otherwise, focus on acquisition.

### EPIC: Customer Accounts
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| R1 | Customer registration: email + password via Supabase Auth | 3 | No | User creates account, email verified |
| R2 | Login: persistent session + magic link option (passwordless) | 3 | No | User stays logged in across sessions |
| R3 | Customer profile page: edit name, phone, email, password | 3 | No | User updates info, saved to Supabase |
| R4 | Order history page: list past orders with status, date, total | 4 | No | User sees all orders, can click for detail |
| R5 | Order detail page: items, quantities, status timeline, receipt | 3 | No | Full order breakdown visible |
| R6 | Saved addresses: manage multiple delivery addresses | 3 | No | User adds/edits/deletes addresses, selects at checkout |
| R7 | Wishlist: heart icon on products → saved products page | 4 | No | Products saved to wishlist, persists across sessions |
| R8 | Account dropdown in header: replaces login icon when authenticated | 2 | No | Shows name, links to profile/orders/wishlist/logout |

### EPIC: Reviews System
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| R9 | Review submission: star rating (1-5) + text, only for verified purchasers | 5 | No | Only customers who bought the product can review |
| R10 | Review display on product page: average rating, individual reviews sorted by date | 3 | No | Star average + review list visible on product page |
| R11 | Admin: review moderation queue (approve/reject/delete) | 3 | No | Admin sees pending reviews, approves or rejects |
| R12 | Google review prompt: after 3rd purchase, show banner linking to Google Maps | 2 | No | Banner shows for repeat customers, links to GMB |
| R13 | Review reminder email: 7 days after delivered, ask for review via Resend | 2 | Partial — needs Resend | Automated email with direct review link |

### EPIC: Loyalty Program (Simple)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| R14 | Loyalty points: earn 1 point per Gs 1,000 spent (ONE tier only) | 4 | No | Points auto-credited on order completion |
| R15 | Points display: show balance in account page + checkout summary | 3 | No | User sees points balance and equivalent Gs value |
| R16 | Points redemption: apply points as checkout discount (1 point = Gs 1) | 3 | No | User redeems points, discount applied to order |
| R17 | Bonus points for reviews: +50 points per approved review | 1 | No | Points credited when admin approves review |

### EPIC: Email Marketing
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| R18 | Newsletter popup: delayed (30s), non-annoying, cookie to not repeat | 2 | No | Popup appears once, email collected to Supabase |
| R19 | Welcome email: triggered on newsletter signup with 10% off coupon | 2 | Partial — needs Resend | New subscriber gets welcome email + coupon code |
| R20 | First email campaign: top 10 products + seasonal coupon | 3 | Partial — needs Resend | Blast sent to subscriber list |
| R21 | WhatsApp broadcast: first promo to opt-in customer list | 2 | Partial — needs WA API | Message sent to customers who opted in |

### EPIC: Content & SEO
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| R22 | Blog infrastructure: markdown content in Supabase, blog index + detail pages | 5 | No | Blog page lists articles, each article has its own page |
| R23 | Write 5 SEO articles: product guides, BDSM basics, material care guides | 8 | No | Articles published, targeting PY-specific keywords |
| R24 | Blog sidebar: "Related Products" widget linking to store items | 2 | No | Each article shows relevant products |

### EPIC: Gift Cards
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| R25 | Digital gift card: purchase page with amount selection (50K/100K/200K/custom) | 3 | No | User buys gift card, receives code via email |
| R26 | Gift card email delivery: branded email with code + redemption instructions | 2 | Partial — needs Resend | Recipient gets email with card code |
| R27 | Gift card redemption: enter code at checkout, applies as payment | 3 | No | Code validated, balance deducted, remainder stored |
| R28 | Admin: gift card management (view issued, balances, deactivate) | 2 | No | Admin sees all gift cards and their status |

**Phase 3 total: ~72h**

### Phase 3 Decision Gate
```
CRITICAL METRICS:
- Repeat purchase rate — target >15% within 60 days
- Reviews submitted — target 50+ in first month
- Email list size — target 300+ subscribers
- Loyalty points redeemed — are people using it?
- Blog traffic — target 500+ monthly visitors from SEO
- Gift card sales — any traction?

BASED ON DATA, DECIDE:
- IF events/workshops interest validated → build events in Phase 4
- IF subscription box interest validated → build subscriptions in Phase 5
- IF community demand exists → launch Telegram group (FREE, instant)
- IF blog drives traffic → expand content in Phase 4
- IF none of the above → focus on more products + better marketing
```

---

## PHASE 4: GROWTH — CONTENT + EVENTS + BUNDLES (Weeks 13-16)

> **Goal:** New revenue streams. Leverage owner expertise.
> **Measure:** Event ticket revenue, bundle AOV, organic traffic growth.
> **Gate:** Only build what Phase 3 data says customers want.

### EPIC: Enhanced Kink Pages
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| G1 | Kink landing pages: full description, beginner guide, safety tips per kink | 6 | No | Each kink page educates + links to products |
| G2 | "What kink is right for me?" quiz: 5 questions → kink recommendation | 4 | No | Fun interactive quiz drives product discovery |
| G3 | Kink-specific bundles: curated starter kits per kink (e.g., "Kit Bondage Principiante") | 3 | Partial — needs real products | Bundle page shows items + total with discount |

### EPIC: Product Bundles
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| G4 | Bundle engine: admin creates bundles from existing products + sets discount % | 5 | No | Admin groups products, sets bundle price |
| G5 | Bundle display: on homepage ("Kits Populares") + relevant product pages | 3 | No | Bundles shown with savings callout |
| G6 | Bundle cart: add entire bundle as single item, shows savings | 3 | No | One-click add, cart shows bundle with discount |
| G7 | Bachelorette party bundles: "Despedida de Soltera" curated gift sets | 2 | Partial | Themed landing page + curated bundles |

### EPIC: Content Expansion
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| G8 | Blog: 10 more SEO articles (BDSM education, product guides, care tips) | 10 | No | Published, targeting high-volume PY keywords |
| G9 | Blog: "Related Products" improved — context-aware based on article tags | 2 | No | Articles show products mentioned in content |
| G10 | FAQ page expansion: 30+ questions organized by category | 3 | No | Comprehensive FAQ with search |
| G11 | Material guide page: silicone vs. glass vs. stainless vs. leather care | 3 | No | Educational page linking to products by material |

### EPIC: Referral Program
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| G12 | Referral system: unique code per customer, both get Gs 25,000 off | 4 | No | Code generated, shared via link, discount auto-applies |
| G13 | Referral tracking: customer sees their referrals + earnings in account | 2 | No | Dashboard shows referred friends + rewards earned |
| G14 | Referral prompt: post-purchase page suggests sharing for discount | 1 | No | After order, user sees "Share and save" CTA |

### EPIC: Events (Lightweight — only if validated)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| G15 | Events page: upcoming events list with image, date, location, price | 4 | No | Clean events listing page |
| G16 | Event detail page: full description, capacity, price, "Register" button | 3 | No | Single event page with all info |
| G17 | Event registration: simple form (name + email + phone) + Bancard payment for paid events | 4 | Partial — needs Bancard | Registration saved, payment processed |
| G18 | Event capacity tracking: sold count + "Sold Out" or "X spots left" | 2 | No | Real-time availability shown |
| G19 | Event reminder: WhatsApp 24h before event | 2 | Partial — needs WA API | Registered attendees get reminder |
| G20 | Admin: event CRUD + registration list + export attendees | 4 | No | Admin manages events end-to-end |
| G21 | "Shop supplies for this workshop" product links on event pages | 2 | No | Event pages cross-sell relevant products |

**Phase 4 total: ~66h**

---

## PHASE 5: SCALE WHAT WORKS (Weeks 17-20)

> **Goal:** Double down on proven winners. Cut what doesn't work.
> **This phase is DATA-DRIVEN. Features depend on Phase 3-4 results.**

### EPIC: Analytics & Intelligence (Always Build)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| S1 | Analytics dashboard: revenue trends (daily/weekly/monthly), conversion funnel | 6 | No | Admin sees revenue graphs + funnel metrics |
| S2 | Customer segmentation: new / returning / VIP / dormant, based on purchase history | 4 | No | Segments auto-update, visible in admin |
| S3 | Product analytics: views vs. purchases ratio, identify underperforming products | 3 | No | Admin sees which products get views but no sales |
| S4 | Search analytics: log all search queries, show "top searches" + "zero results" | 3 | No | Admin sees what customers search for |

### EPIC: Re-engagement (Always Build)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| S5 | Dormant customer WhatsApp: message customers inactive 30+ days with personalized offer | 3 | Partial — needs WA API | Automated outreach to dormant customers |
| S6 | Abandoned cart email sequence: 2h, 24h, 48h with product images + discount | 4 | Partial — needs Resend | 3-step email sequence for abandoned carts |
| S7 | Product recommendations: "Basado en tu historial" on homepage for logged-in users | 4 | No | Personalized product suggestions |
| S8 | Back-in-stock notification: subscribe to out-of-stock products, get notified | 3 | No | User subscribes, gets email/WhatsApp when restocked |

### EPIC: Admin Power Tools (Always Build)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| S9 | Bulk product import/export via CSV | 4 | No | Upload CSV to create/update products, download full catalog |
| S10 | Inventory alerts: email/WhatsApp when stock hits threshold | 3 | No | Admin gets notified for low stock items |
| S11 | Stock history: track quantity changes over time per product | 2 | No | Admin sees stock movement log |
| S12 | Admin activity log: who changed what and when | 3 | No | Audit trail for all admin actions |

### EPIC: Performance & SEO (Always Build)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| S13 | Core Web Vitals audit + fix: LCP, FID, CLS optimization | 4 | No | All metrics green in PageSpeed Insights |
| S14 | Schema markup audit: add BreadcrumbList, Organization, WebSite schemas | 2 | No | Rich snippets appear in Google search |
| S15 | Cloudflare cache optimization: page rules, edge caching for static assets | 2 | No | TTFB < 200ms for cached pages |
| S16 | Image optimization pipeline: auto-resize, WebP conversion via Supabase transform | 3 | No | All images served as optimized WebP |

### EPIC: Conditional — Subscription Box (only if validated in Phase 3)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| S17 | Subscription plan page: 1 tier, monthly, fixed price | 3 | Validation needed | Clear landing page with subscription offer |
| S18 | Subscription checkout: recurring billing via manual WhatsApp invoice (Bancard recurring not available in PY) | 3 | Validation needed | User subscribes, monthly invoice sent |
| S19 | Subscription admin: manage subscribers, track renewals, handle cancellations | 3 | Validation needed | Admin manages subscription lifecycle |
| S20 | Subscription box content: admin selects products for each month's box | 2 | Validation needed | Monthly curation workflow |

### EPIC: Conditional — Ambassador Program (only if referral program proves demand)
| # | Story | Hrs | Blocked? | Acceptance Criteria |
|---|-------|-----|----------|---------------------|
| S21 | Ambassador application: top referrers can apply for ambassador status | 2 | Validation needed | Application form + admin approval |
| S22 | Ambassador dashboard: unique link, commission tracking, payout history | 4 | Validation needed | Ambassadors see their performance |
| S23 | Ambassador perks: early access to new products, higher commission rate | 2 | Validation needed | Perks applied automatically |

**Phase 5 total: ~63h base + ~19h conditional**

---

## GAP ANALYSIS: WHAT'S MISSING FROM THE ORIGINAL ROADMAP

### Infrastructure Gaps (not in any phase)
| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No Playwright E2E tests | Can't catch regressions | Add in Phase 1.5 — at least checkout + cart + admin flows |
| No Umami analytics | Can't measure anything | Set up self-hosted Umami immediately — it's free |
| No error monitoring (Sentry) | Bugs go unnoticed | Add Sentry free tier for error tracking |
| No database backups | Data loss risk | Set up Supabase automatic backups + periodic export |
| No staging environment | Can't test before deploy | Add staging Docker config on same VPS (different port) |
| No CI tests running | Broken code ships | GitHub Actions should run Vitest + TypeScript check |
| DB types not generated | Type safety gaps | Run supabase gen types to generate database.ts from actual schema |

### UX Gaps (not in any phase)
| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No "empty cart" state | Confusing | Show friendly message + "Explorar Productos" CTA |
| No "no results" search state | Dead end | Show suggestions + popular products when search returns nothing |
| No breadcrumbs on product pages | Poor navigation | Add category > product breadcrumb trail |
| No recently viewed products | Missed re-engagement | Track in localStorage, show on homepage |
| No product image zoom | Can't inspect products | Add lightbox/zoom on product detail images |
| No product image gallery | Only 1 image visible | Thumbnail strip + main image viewer |
| No social share buttons | Missed organic reach | Add WhatsApp + Instagram share on product pages |
| No "Novedades" (New Arrivals) page | Missing nav section | Add page sorted by created_at desc |
| No "Mas Vendidos" dedicated page | Only on homepage | Add full page with all best sellers |

### Business Logic Gaps
| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No order status emails | Customer in the dark | Phase 1 completion: email on status change |
| No inventory tracking on purchase | Stock goes negative | Decrement stock_quantity on order creation |
| No duplicate order prevention | Double charges | Add idempotency key to checkout |
| No order cancellation flow | No way to cancel | Add cancel button (within 1h) for customers + admin |
| No refund workflow | Can't process returns | Admin: mark order as refunded, adjust stock |

---

## EXECUTION PRIORITY (What to work on NOW)

### Immediate (This week — no client input needed)
1. Phase 1.5 bug fixes (H1-H29) — 38h
2. Umami analytics setup — 2h
3. Playwright basic E2E — 4h
4. DB type generation — 1h

### Next (After Phase 1.5 — no client input needed)
5. Phase 1 completion catalog features (C1-C5) — 13h
6. Phase 1 completion admin features (C6-C13) — 23h
7. Phase 1 completion pages (C14-C18) — 9.5h
8. UX gap fixes (empty states, breadcrumbs, image zoom) — 12h

### Waiting on Rach
- Real product photos + inventory (blocks real launch)
- Shipping zones + prices (blocks C14)
- Return policy (blocks C15)
- Bancard merchant account (blocks Phase 2 payments)
- Resend API key + domain (blocks email features)
- WhatsApp Cloud API (blocks automated notifications)
- Brand assets / logo (blocks final design polish)

---

## SUCCESS METRICS (Updated)

| Phase | Week | North Star Metric | Target |
|-------|------|-------------------|--------|
| 1.5 | Now | All critical bugs fixed | 0 P0 bugs |
| 1 | 4 | First paid order | 1+ orders in week 4 |
| 1 | 4 | Products loaded | 100% of real inventory |
| 2 | 8 | Weekly orders | 10+ orders/week |
| 2 | 8 | Card payment adoption | >30% of orders |
| 2 | 8 | Conversion rate | >1.5% |
| 2 | 8 | Coupon redemption | >5% of orders use coupons |
| 3 | 12 | Repeat customers | >15% repeat within 60 days |
| 3 | 12 | Email list | 300+ subscribers |
| 3 | 12 | Reviews | 50+ reviews on products |
| 3 | 12 | Loyalty engagement | >20% of customers redeem points |
| 4 | 16 | Organic traffic | 500+ monthly from SEO |
| 4 | 16 | Event attendance | 15+ at first workshop |
| 4 | 16 | Bundle AOV lift | +20% AOV on bundle orders |
| 5 | 20 | Monthly revenue | Gs 15M+ (~$2,000 USD) |
| 5 | 20 | Customer base | 200+ unique customers |

---

*Document version: 4.0 — "Post-Audit Edition"*
*Created: 2026-04-04*
*Based on: v3.0 roadmap + full codebase audit + live site testing*
*Total stories: ~180 (up from ~116, includes bug fixes + gap fills)*
*Phases: 1.5 (new) + 1 completion + 2 + 3 + 4 + 5*
*Philosophy: Fix what's broken → Complete what's started → Build what's next*
