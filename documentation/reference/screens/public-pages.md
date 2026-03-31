# Public Pages Reference

All unauthenticated pages accessible to visitors. These pages are multi-tenant, served under `/[clinic]/*` routes.

---

## Table of Contents

1. [Homepage](#1-homepage)
2. [About Page](#2-about-page)
3. [Services Catalog](#3-services-catalog)
4. [Service Detail](#4-service-detail)
5. [Online Store](#5-online-store)
6. [Shopping Cart](#6-shopping-cart)
7. [Checkout](#7-checkout)
8. [Appointment Booking](#8-appointment-booking)
9. [Pet Age Calculator](#9-pet-age-calculator)
10. [Toxic Food Checker](#10-toxic-food-checker)
11. [Drug Dosages Reference](#11-drug-dosages-reference)
12. [Diagnosis Codes Reference](#12-diagnosis-codes-reference)
13. [Growth Charts Reference](#13-growth-charts-reference)
14. [Vaccine Reactions Reference](#14-vaccine-reactions-reference)
15. [Reproductive Cycles Reference](#15-reproductive-cycles-reference)
16. [Euthanasia Assessments](#16-euthanasia-assessments)
17. [Loyalty Points Info](#17-loyalty-points-info)
18. [Prescriptions Info](#18-prescriptions-info)

---

## 1. Homepage

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]` |
| **File** | `web/app/[clinic]/page.tsx` |
| **Access** | Public |
| **Content Source** | `.content_data/[clinic]/home.json` |

### Purpose
Main landing page for each clinic. Showcases services, builds trust, and drives conversions.

### Sections
1. **Hero Section** - Large banner with clinic tagline, CTA buttons
2. **Features Grid** - Key service highlights with icons
3. **Services Preview** - Featured services with pricing
4. **Testimonials** - Client reviews carousel
5. **Contact Section** - Address, phone, WhatsApp, hours
6. **Footer** - Links, social media, legal

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Agendar Cita" button | Click | Navigate to `/[clinic]/book` |
| "Ver Servicios" button | Click | Navigate to `/[clinic]/services` |
| Service cards | Click | Navigate to `/[clinic]/services/[id]` |
| WhatsApp button | Click | Opens WhatsApp with clinic number |
| Phone number | Click | Initiates phone call (mobile) |
| Navigation links | Click | Navigate to respective pages |
| Mobile menu toggle | Click | Opens/closes mobile navigation drawer |

### Components Used
- `main-nav.tsx` - Navigation bar
- `service-card.tsx` - Service preview cards
- `appointment-form.tsx` - Quick contact form

---

## 2. About Page

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/about` |
| **File** | `web/app/[clinic]/about/page.tsx` |
| **Access** | Public |
| **Content Source** | `.content_data/[clinic]/about.json` |

### Purpose
Clinic information, team profiles, history, and mission statement.

### Sections
1. **Clinic Story** - History and mission
2. **Team Section** - Veterinarian profiles with photos
3. **Facilities** - Photo gallery of clinic
4. **Certifications** - Professional credentials
5. **Contact CTA** - Call to action to book

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Team member cards | Hover | Shows specialty/bio |
| "Contactar" button | Click | Scrolls to contact section or opens WhatsApp |
| Photo gallery | Click | Opens lightbox viewer |
| Back to home | Click | Navigate to `/[clinic]` |

---

## 3. Services Catalog

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/services` |
| **File** | `web/app/[clinic]/services/page.tsx` |
| **Access** | Public |
| **Content Source** | `.content_data/[clinic]/services.json` |

### Purpose
Complete list of veterinary services offered with pricing and descriptions.

### Sections
1. **Page Header** - Title and introduction
2. **Category Filter** - Filter by service type
3. **Services Grid** - Cards for each service
4. **Pricing Info** - Transparency about costs

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Category filter buttons | Click | Filters visible services |
| Service card | Click | Navigate to `/[clinic]/services/[id]` |
| Service card | Hover | Subtle shadow/scale animation |
| "Agendar" button on card | Click | Navigate to booking with service pre-selected |
| Price display | View | Shows price range or "Consultar" |

### Components Used
- `service-card.tsx` - Individual service display
- `services-grid.tsx` - Grid layout container

---

## 4. Service Detail

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/services/[serviceId]` |
| **File** | `web/app/[clinic]/services/[serviceId]/page.tsx` |
| **Access** | Public |
| **Content Source** | `.content_data/[clinic]/services.json` |

### Purpose
Detailed information about a specific service.

### Sections
1. **Service Header** - Name, icon, category badge
2. **Description** - Full service details
3. **Pricing** - Cost breakdown
4. **Duration** - Estimated time
5. **What's Included** - Bullet list of inclusions
6. **FAQ** - Common questions
7. **Book CTA** - Large booking button

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Agendar Cita" button | Click | Navigate to `/[clinic]/book?service=[id]` |
| "Volver a Servicios" | Click | Navigate to `/[clinic]/services` |
| FAQ accordion | Click | Expands/collapses answer |
| Share button | Click | Opens share sheet (mobile) |

---

## 5. Online Store

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/store` |
| **File** | `web/app/[clinic]/store/page.tsx` |
| **Access** | Public |
| **Data Source** | `store_products` table via API |

### Purpose
E-commerce storefront for pet products, food, accessories.

### Sections
1. **Category Navigation** - Product categories
2. **Search Bar** - Product search
3. **Product Grid** - Product cards
4. **Cart Summary** - Floating cart indicator

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Category buttons | Click | Filters products by category |
| Search input | Type | Filters products by name |
| Product card image | Hover | Zoom effect |
| Quantity selector (+/-) | Click | Adjusts quantity (1 to max stock) |
| "Agregar al Carrito" | Click | Adds item to cart, shows toast |
| Cart icon (header) | Click | Navigate to `/[clinic]/cart` |
| Out of stock overlay | View | Striped overlay, button disabled |
| Sale badge | View | Animated "En Oferta!" badge |
| Low stock indicator | View | Red text "Solo X unidades" |

### Components Used
- `product-card.tsx` - Product display with stock management
- `add-to-cart-button.tsx` - Cart integration

---

## 6. Shopping Cart

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/cart` |
| **File** | `web/app/[clinic]/cart/page.tsx` |
| **Access** | Public |
| **State** | React Context (CartProvider) |

### Purpose
Review cart contents before checkout.

### Sections
1. **Cart Items List** - Products with quantities
2. **Quantity Controls** - Adjust amounts
3. **Subtotal** - Per-item totals
4. **Order Summary** - Subtotal, shipping, total
5. **Checkout Button** - Proceed to payment

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Quantity (+) | Click | Increases quantity (up to stock limit) |
| Quantity (-) | Click | Decreases quantity (min 1) |
| Remove item (X) | Click | Removes item from cart |
| "Seguir Comprando" | Click | Navigate to `/[clinic]/store` |
| "Finalizar Compra" | Click | Navigate to `/[clinic]/cart/checkout` |
| Empty cart state | View | Shows message + "Ver Productos" link |

---

## 7. Checkout

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/cart/checkout` |
| **File** | `web/app/[clinic]/cart/checkout/page.tsx` |
| **Access** | Public (may require login) |

### Purpose
Complete purchase with shipping and payment details.

### Sections
1. **Order Summary** - Final cart review
2. **Contact Information** - Name, email, phone
3. **Shipping Address** - Delivery details
4. **Payment Method** - Payment selection
5. **Order Confirmation** - Final review

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Contact form fields | Input | Validates email, phone format |
| Address fields | Input | Required fields validation |
| Payment method radio | Select | Shows relevant payment details |
| "Confirmar Pedido" | Click | Submits order, shows confirmation |
| Terms checkbox | Toggle | Required to proceed |
| "Volver al Carrito" | Click | Navigate back to cart |

---

## 8. Appointment Booking

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/book` |
| **File** | `web/app/[clinic]/book/page.tsx` |
| **Access** | Public |
| **Components** | `booking-wizard.tsx` |

### Purpose
Multi-step wizard for booking veterinary appointments.

### Steps

#### Step 1: Service Selection
| Element | Interaction | Result |
|---------|-------------|--------|
| Service cards | Click | Selects service, advances to Step 2 |
| Service card | Hover | Icon scales up, arrow appears |

**Available Services:**
- Vacunacion (Vaccination)
- Consulta General (General Consultation)
- Peluqueria (Grooming)
- Especialista (Specialist)
- Medicina Interna (Internal Medicine)

#### Step 2: Pet Selection
| Element | Interaction | Result |
|---------|-------------|--------|
| Pet cards | Click | Selects pet, advances to Step 3 |
| "Registrar Mascota" | Click | Navigate to pet registration (if no pets) |
| Back arrow | Click | Returns to Step 1 |

#### Step 3: Date & Time Selection
| Element | Interaction | Result |
|---------|-------------|--------|
| Calendar date picker | Click date | Selects date |
| Time slot buttons | Click | Selects time (09:00-16:30) |
| Selected time | View | Highlighted in gray-900 |
| "Continuar" | Click | Advances to Step 4 |
| Back arrow | Click | Returns to Step 2 |

**Time Slots:** 12 slots from 09:00 to 16:30 (30-minute intervals)

#### Step 4: Confirmation
| Element | Interaction | Result |
|---------|-------------|--------|
| Notes textarea | Input | Optional appointment notes |
| "Confirmar Cita" | Click | Submits appointment, shows Step 5 |
| Loading spinner | View | Shows during submission |
| Back arrow | Click | Returns to Step 3 |

#### Step 5: Success
| Element | Interaction | Result |
|---------|-------------|--------|
| Success animation | View | Checkmark animation |
| "Volver al Inicio" | Click | Navigate to `/[clinic]/portal/dashboard` |
| "Descargar Ticket" | Click | Downloads appointment ticket |

### Sidebar Summary
Real-time display of selections:
- Selected service with icon
- Selected pet name
- Selected date and time
- Total price

---

## 9. Pet Age Calculator

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/tools/age-calculator` |
| **File** | `web/app/[clinic]/tools/age-calculator/page.tsx` |
| **Access** | Public |
| **Components** | `age-calculator.tsx` |

### Purpose
Convert pet birth date to age in human and pet years.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Birth date picker | Select date | Calculates age in real-time |
| Species selector | Select Dog/Cat | Adjusts human-years calculation |
| Results display | View | Shows age in years, months, weeks |
| Human age equivalent | View | Shows "X human years" |
| Progress bar | View | Visual age indicator |

### Calculation Logic
- Dogs: First 2 years = 10.5 human years each, then 4 per year
- Cats: First year = 15, second = 9, then 4 per year

---

## 10. Toxic Food Checker

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/tools/toxic-food` |
| **File** | `web/app/[clinic]/tools/toxic-food/page.tsx` |
| **Access** | Public |

### Purpose
Search database of foods to check if safe for pets.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Search input | Type | Shows autocomplete suggestions |
| Suggestion item | Click | Displays food details |
| Safe indicator | View | Green checkmark + "Seguro" |
| Toxic indicator | View | Red X + "Toxico" + severity |
| Symptoms section | View | Lists potential symptoms if toxic |
| "Ver Mas" | Click | Expands detailed information |

---

## 11. Drug Dosages Reference

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/drug_dosages` |
| **File** | `web/app/[clinic]/drug_dosages/page.tsx` |
| **Access** | Public |
| **Data Source** | `drug_dosages` table |

### Purpose
Reference database of veterinary drug dosages by species and weight.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Drug search | Type | Filters drug list (debounced 300ms) |
| Species filter | Select | Filters to Dog/Cat/Both |
| Drug row | Click | Expands dosage details |
| Weight input | Enter kg | Calculates specific dosage |
| Route filter | Select | Filters by administration route |
| Copy dosage | Click | Copies to clipboard |

### Data Displayed
- Drug name
- Concentration (mg/ml)
- Dosage per kg
- Administration route
- Species applicability
- Contraindications
- Notes

---

## 12. Diagnosis Codes Reference

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/diagnosis_codes` |
| **File** | `web/app/[clinic]/diagnosis_codes/page.tsx` |
| **Access** | Public |
| **Data Source** | `diagnosis_codes` table (VeNom/SNOMED) |

### Purpose
Searchable database of veterinary diagnosis codes.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Code search | Type | Searches code and term |
| Category filter | Select | Filters by body system |
| Code row | Click | Shows full description |
| Copy code | Click | Copies code to clipboard |
| "Ver Detalles" | Click | Expands related codes |

### Data Structure
- Code (VeNom format)
- Term (condition name)
- Description
- Category/body system
- Related codes

---

## 13. Growth Charts Reference

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/growth_charts` |
| **File** | `web/app/[clinic]/growth_charts/page.tsx` |
| **Access** | Public |
| **Components** | `growth-chart.tsx` (recharts) |

### Purpose
Standard growth curves for different breeds to compare pet development.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Species selector | Select | Shows Dog/Cat charts |
| Breed dropdown | Select | Loads breed-specific curve |
| Size category | Select | Small/Medium/Large breeds |
| Chart hover | Mouse move | Shows exact weight at age |
| Date range | Select | Adjusts visible timeline |
| "Comparar con Mi Mascota" | Click | Opens pet selector (if logged in) |

---

## 14. Vaccine Reactions Reference

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/vaccine_reactions` |
| **File** | `web/app/[clinic]/vaccine_reactions/page.tsx` |
| **Access** | Public |
| **Data Source** | `vaccine_reactions` table |

### Purpose
Information about potential vaccine reactions and monitoring guidelines.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Vaccine type filter | Select | Filters by vaccine |
| Reaction severity | Toggle | Shows mild/moderate/severe |
| Symptom list | View | Common reactions per vaccine |
| "Que Hacer" section | View | Emergency response guidelines |
| Contact clinic button | Click | Opens WhatsApp/phone |

---

## 15. Reproductive Cycles Reference

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/reproductive_cycles` |
| **File** | `web/app/[clinic]/reproductive_cycles/page.tsx` |
| **Access** | Public |
| **Data Source** | `reproductive_cycles` table |

### Purpose
Information about pet reproductive cycles for breeding management.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Species selector | Select | Dog/Cat information |
| Cycle phase diagram | View | Visual cycle stages |
| Date calculator | Input date | Calculates expected phases |
| Fertility window | View | Highlighted optimal dates |
| "Consultar Veterinario" | Click | Opens booking page |

---

## 16. Euthanasia Assessments

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/euthanasia_assessments` |
| **File** | `web/app/[clinic]/euthanasia_assessments/page.tsx` |
| **Access** | Public |
| **Components** | `qol-assessment.tsx` |

### Purpose
Quality of Life assessment tool using HHHHHMM scale for end-of-life decisions.

### HHHHHMM Categories
1. **Hurt** - Pain level
2. **Hunger** - Appetite
3. **Hydration** - Water intake
4. **Hygiene** - Cleanliness/grooming
5. **Happiness** - Joy and responsiveness
6. **Mobility** - Ability to move
7. **More Good Days** - Good vs bad days ratio

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Category sliders | Drag | Sets score 0-10 for each |
| Score display | View | Real-time score per category |
| Total score | View | Sum of all categories (0-70) |
| Result interpretation | View | Green (>35) or Red (<35) |
| Scoring guide table | View | Reference for each score level |
| "Consultar" button | Click | Opens booking for consultation |
| Print/save button | Click | Downloads PDF assessment |

---

## 17. Loyalty Points Info

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/loyalty_points` |
| **File** | `web/app/[clinic]/loyalty_points/page.tsx` |
| **Access** | Public |

### Purpose
Information page about the clinic's loyalty rewards program.

### Sections
1. **How It Works** - Points earning explanation
2. **Rewards Catalog** - Available redemptions
3. **Tiers** - Membership levels
4. **FAQ** - Common questions

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Rewards cards | View | Shows points required |
| Tier benefits | View | Lists benefits per level |
| "Registrarse" | Click | Navigate to signup |
| FAQ accordion | Click | Expands/collapses answers |

---

## 18. Prescriptions Info

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/prescriptions` |
| **File** | `web/app/[clinic]/prescriptions/page.tsx` |
| **Access** | Public |

### Purpose
Information about digital prescriptions and how to access them.

### Sections
1. **What Are Digital Prescriptions** - Explanation
2. **How to Access** - Via portal
3. **PDF Downloads** - How to get copies
4. **Refills** - How to request refills

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Acceder al Portal" | Click | Navigate to login |
| Sample prescription | View | Example PDF preview |
| "Contactar" | Click | Opens WhatsApp |

---

## Navigation Component

### Main Navigation (`main-nav.tsx`)

Present on all public pages.

| Element | Interaction | Result |
|---------|-------------|--------|
| Logo | Click | Navigate to `/[clinic]` |
| "Inicio" | Click | Navigate to `/[clinic]` |
| "Servicios" | Click | Navigate to `/[clinic]/services` |
| "Tienda" | Click | Navigate to `/[clinic]/store` |
| "Nosotros" | Click | Navigate to `/[clinic]/about` |
| "Zona Propietario" | Click | Navigate to `/[clinic]/portal/login` |
| Cart icon | Click | Navigate to `/[clinic]/cart` |
| Cart badge | View | Shows item count |
| Mobile menu (hamburger) | Click | Opens drawer navigation |
| Mobile menu backdrop | Click | Closes drawer |
| Logout button (if logged in) | Click | Logs out, redirects to login |

### Role-Based Navigation
- **Public**: Shows "Zona Propietario" (login)
- **Owner**: Shows portal dashboard link
- **Vet/Admin**: Shows "Inventario" link + dashboard

---

*Last updated: December 2024*
