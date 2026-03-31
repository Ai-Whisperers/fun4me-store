# Features Overview

Comprehensive list of all implemented features in the Vete platform.

> **Last Updated**: January 2026  
> **Total API Routes**: 313 files (~480+ HTTP methods)  
> **Total Server Actions**: 37  
> **Total Pages**: 130  
> **Database Tables**: 100+  
> **Database Migrations**: 94 sequential migrations  
> **Database Views**: 1 (unified_clinic_inventory)  
> **React Components**: 674  
> **Custom Hooks**: 10

---

## Feature Matrix

### Public Website

| Feature | Status | Routes |
|---------|--------|--------|
| Homepage | ✅ Live | `/[clinic]` |
| Services Catalog | ✅ Live | `/[clinic]/services` |
| Service Details | ✅ Live | `/[clinic]/services/[id]` |
| About Page | ✅ Live | `/[clinic]/about` |
| Appointment Booking | ✅ Live | `/[clinic]/book` |
| Online Store | ✅ Live | `/[clinic]/store` |
| Shopping Cart | ✅ Live | `/[clinic]/cart` |
| Checkout | ✅ Live | `/[clinic]/cart/checkout` |

### Interactive Tools

| Feature | Status | Routes |
|---------|--------|--------|
| Toxic Food Checker | ✅ Live | `/[clinic]/tools/toxic-food` |
| Pet Age Calculator | ✅ Live | `/[clinic]/tools/age-calculator` |
| Diagnosis Code Search | ✅ Live | `/[clinic]/diagnosis_codes` |
| Drug Dosage Calculator | ✅ Live | `/[clinic]/drug_dosages` |
| Growth Charts | ✅ Live | `/[clinic]/growth_charts` |

### Authentication

| Feature | Status | Routes |
|---------|--------|--------|
| User Registration | ✅ Live | `/auth/signup` |
| Portal Login | ✅ Live | `/[clinic]/portal/login` |
| Portal Logout | ✅ Live | `/[clinic]/portal/logout` |
| Password Recovery | ✅ Live | `/auth/forgot-password` |
| Password Reset | ✅ Live | `/auth/reset-password` |
| Auth Callback | ✅ Live | `/auth/callback` |

### Pet Management (Portal)

| Feature | Status | Routes |
|---------|--------|--------|
| Pet List | ✅ Live | `/[clinic]/portal/pets` |
| Pet Registration | ✅ Live | `/[clinic]/portal/pets/new` |
| Pet Profile | ✅ Live | `/[clinic]/portal/pets/[id]` |
| Edit Pet | ✅ Live | `/[clinic]/portal/pets/[id]/edit` |
| Vaccine Records | ✅ Live | `/[clinic]/portal/pets/[id]/vaccines/new` |
| Medical Records | ✅ Live | `/[clinic]/portal/pets/[id]/records/new` |
| QR Tag Assignment | ✅ Live | `/tag/[code]` |
| Pet Profile Scan | ✅ Live | `/scan/[id]` |

### Clinical Tools

| Feature | Status | Routes |
|---------|--------|--------|
| Prescription Creation | ✅ Live | `/[clinic]/portal/prescriptions/new` |
| Prescription List | ✅ Live | `/[clinic]/prescriptions` |
| Vaccine Reactions | ✅ Live | `/[clinic]/vaccine_reactions` |
| Reproductive Cycles | ✅ Live | `/[clinic]/reproductive_cycles` |
| Euthanasia Assessment (HHHHHMM) | ✅ Live | `/[clinic]/euthanasia_assessments` |

### Appointments

| Feature | Status | Routes |
|---------|--------|--------|
| View Appointments | ✅ Live | `/[clinic]/portal/appointments` |
| Book Appointment | ✅ Live | `/[clinic]/portal/appointments/new` |
| Appointment Details | ✅ Live | `/[clinic]/portal/appointments/[id]` |
| Schedule View | ✅ Live | `/[clinic]/portal/schedule` |

### Staff Dashboard

| Feature | Status | Routes |
|---------|--------|--------|
| Dashboard Home | ✅ Live | `/[clinic]/dashboard` |
| Patient Management | ✅ Live | `/[clinic]/portal/dashboard/patients` |
| Calendar View | ✅ Live | `/[clinic]/dashboard/calendar` |
| Client Management | ✅ Live | `/[clinic]/dashboard/clients` |
| Client Details | ✅ Live | `/[clinic]/dashboard/clients/[id]` |

### Invoicing & Billing

| Feature | Status | Routes |
|---------|--------|--------|
| Invoice List | ✅ Live | `/[clinic]/dashboard/invoices` |
| Create Invoice | ✅ Live | `/[clinic]/dashboard/invoices/new` |
| Invoice Details | ✅ Live | `/[clinic]/dashboard/invoices/[id]` |
| Record Payment | ✅ Live | API: `/api/invoices/[id]/payments` |
| Send Invoice | ✅ Live | API: `/api/invoices/[id]/send` |
| Process Refund | ✅ Live | API: `/api/invoices/[id]/refund` |

### Hospitalization

| Feature | Status | Routes |
|---------|--------|--------|
| Hospitalization Dashboard | ✅ Live | `/[clinic]/dashboard/hospital` |
| Patient Admission | ✅ Live | API: `/api/hospitalizations` |
| Vitals Monitoring | ✅ Live | API: `/api/hospitalizations/[id]/vitals` |
| Treatment Records | ✅ Live | API: `/api/hospitalizations/[id]/treatments` |
| Feeding Logs | ✅ Live | API: `/api/hospitalizations/[id]/feedings` |
| Kennel Management | ✅ Live | API: `/api/kennels` |

### Laboratory

| Feature | Status | Routes |
|---------|--------|--------|
| Lab Order List | ✅ Live | `/[clinic]/dashboard/lab` |
| Create Lab Order | ✅ Live | API: `/api/lab-orders` |
| Lab Order Details | ✅ Live | `/[clinic]/dashboard/lab/[id]` |
| Result Entry | ✅ Live | API: `/api/lab-orders/[id]/results` |
| Lab Comments | ✅ Live | API: `/api/lab-orders/[id]/comments` |

### Insurance

| Feature | Status | Routes |
|---------|--------|--------|
| Insurance Dashboard | ✅ Live | `/[clinic]/dashboard/insurance` |
| Policy Management | ✅ Live | API: `/api/insurance/policies` |
| Claims Submission | ✅ Live | API: `/api/insurance/claims` |
| Pre-Authorizations | ✅ Live | API: `/api/insurance/pre-authorizations` |
| Provider Directory | ✅ Live | API: `/api/insurance/providers` |

### Consent Management

| Feature | Status | Routes |
|---------|--------|--------|
| Consent List | ✅ Live | `/[clinic]/dashboard/consents` |
| Consent Templates | ✅ Live | `/[clinic]/dashboard/consents/templates` |
| Blanket Consents | ✅ Live | API: `/api/consents/blanket` |
| Consent Audit Trail | ✅ Live | API: `/api/consents/[id]/audit` |

### Communications

| Feature | Status | Routes |
|---------|--------|--------|
| Message Inbox | ✅ Live | `/[clinic]/portal/messages` |
| Message Thread | ✅ Live | `/[clinic]/portal/messages/[id]` |
| WhatsApp Dashboard | ✅ Live | `/[clinic]/dashboard/whatsapp` |
| WhatsApp Templates | ✅ Live | `/[clinic]/dashboard/whatsapp/templates` |
| Send WhatsApp | ✅ Live | API: `/api/whatsapp/send` |
| Quick Replies | ✅ Live | API: `/api/messages/quick-replies` |
| Message Templates | ✅ Live | API: `/api/messages/templates` |

### E-Commerce / Store

| Feature | Status | Routes |
|---------|--------|--------|
| Product Catalog | ✅ Live | API: `/api/store/products` |
| Product Search | ✅ Live | API: `/api/store/search` |
| Product Details | ✅ Live | API: `/api/store/products/[id]` |
| Product Creation (Staff) | ✅ Live | API: `POST /api/store/products` |
| Shopping Cart | ✅ Live | `/[clinic]/cart` |
| Cart Persistence | ✅ Live | API: `/api/store/cart` |
| Checkout | ✅ Live | API: `/api/store/checkout` |
| Order Management | ✅ Live | API: `/api/store/orders` |
| Coupon Validation | ✅ Live | API: `/api/store/coupons/validate` |
| Product Reviews | ⚠️ UI Only | API exists but UI has no onClick handler |
| Wishlist Page | ✅ Live | `/[clinic]/portal/wishlist` |
| Wishlist API | ✅ Live | API: `/api/store/wishlist` |
| Stock Alerts | ✅ Live | API: `/api/store/stock-alerts` |
| Notify When Available | ✅ Live | Component: `NotifyWhenAvailable` |
| Prescription Upload | ✅ Live | API: `/api/store/prescriptions/upload` |
| Prescription Approval | ✅ Live | API: `/api/store/orders/[id]/prescription` |
| Prescription Orders Dashboard | ✅ Live | `/[clinic]/dashboard/orders/prescriptions` |

### Staff Management

| Feature | Status | Routes |
|---------|--------|--------|
| Staff Schedules | ✅ Live | `/[clinic]/dashboard/schedules` |
| Individual Schedule | ✅ Live | `/[clinic]/dashboard/schedules/[staffId]` |
| Time-Off Requests | ✅ Live | API: `/api/staff/time-off` |
| Time-Off Types | ✅ Live | API: `/api/staff/time-off/types` |

### Finance & Inventory

| Feature | Status | Routes |
|---------|--------|--------|
| Financial Dashboard | ✅ Live | `/[clinic]/portal/finance` |
| Expense Tracking | ✅ Live | API: `/api/finance/expenses` |
| P&L Report | ⚠️ API Only | API exists, no frontend dashboard |
| Inventory Management | ✅ Live | `/[clinic]/portal/inventory` |
| Inventory Alerts | ✅ Live | API: `/api/inventory/alerts` |
| Inventory Stats | ✅ Live | API: `/api/inventory/stats` |
| Bulk Import | ✅ Live | API: `/api/inventory/import` |
| Bulk Export | ✅ Live | API: `/api/inventory/export` |
| Loyalty Points | ✅ Live | API: `/api/loyalty/points` |

### Inventory Management (Enhanced)

| Feature | Status | Routes |
|---------|--------|--------|
| Unified Inventory View | ✅ Live | `/[clinic]/dashboard/inventory` |
| Reorder Suggestions | ✅ Live | `/[clinic]/dashboard/inventory/reorders` |
| Expiring Products | ✅ Live | `/[clinic]/dashboard/inventory/expiring` |
| Stock Adjustment | ✅ Live | API: `/api/inventory/adjust` |
| Stock Receiving | ✅ Live | API: `/api/inventory/receive` |
| Reorder Suggestions API | ✅ Live | API: `/api/inventory/reorder-suggestions` |
| Product History | ✅ Live | API: `/api/inventory/[productId]/history` |
| Stock History Modal | ✅ Live | Component: `StockHistoryModal` |
| Barcode Lookup | ✅ Live | API: `/api/inventory/barcode-lookup` |
| Product Mappings | ✅ Live | API: `/api/inventory/mappings` |

### Lost & Found (Pet Safety)

| Feature | Status | Routes | Documentation |
|---------|--------|--------|---------------|
| Lost Pet Reporting | ✅ Live | API: `/api/lost-found` | [Full Docs](./lost-pets-system.md) |
| Lost Pet Dashboard | ✅ Live | `/[clinic]/dashboard/lost-pets` | Staff management interface |
| Lost Pet Details | ✅ Live | API: `/api/lost-found/[id]` | View full report |
| Update Lost Pet | ✅ Live | API: `PUT /api/lost-found/[id]` | Update status, details |
| Mark Pet Found | ✅ Live | Service: `markPetFound()` | Status transitions |
| Sighting Reporting | ✅ Live | API: `/api/lost-found/[id]/sightings` | Public can report sightings |
| List Sightings | ✅ Live | API: `GET /api/lost-found/[id]/sightings` | View all sightings |
| Verify Sighting | ✅ Live | Service: `verifySighting()` | Staff verification |
| Match Suggestions | ✅ Live | DB: `pet_match_suggestions` | Automatic matching |
| Review Matches | ✅ Live | Service: `reviewMatch()` | Staff review matches |
| Public Registry | ✅ Live | Service: `listPublicLostPets()` | Public access to lost pets |
| Location-Based Search | ✅ Live | Service filters | GPS radius search |

### Background Jobs (Cron)

| Feature | Status | Endpoint |
|---------|--------|----------|
| Release Cart Reservations | ✅ Live | `/api/cron/release-reservations` |
| Process Subscriptions | ✅ Live | `/api/cron/process-subscriptions` |
| Expiry Alerts | ✅ Live | `/api/cron/expiry-alerts` |
| Stock Alerts | ✅ Live | `/api/cron/stock-alerts` |
| Reminders | ✅ Live | `/api/cron/reminders` |

### Developer Utilities

| Feature | Status | Location |
|---------|--------|----------|
| Custom Hooks Library | ✅ Live | `web/lib/hooks/` |
| useAsyncData | ✅ Live | Data fetching with loading/error states |
| useFormState | ✅ Live | Form management with Zod validation |
| useModal / useModalWithData | ✅ Live | Modal state management |
| useSyncedState | ✅ Live | localStorage + API sync |
| useConfirmation | ✅ Live | Promise-based confirmation dialogs |
| useLocalStorage | ✅ Live | Simple localStorage persistence |
| useDashboardLabels | ✅ Live | Dashboard label provider |

### Administration

| Feature | Status | Routes |
|---------|--------|--------|
| User Profile | ✅ Live | `/[clinic]/portal/profile` |
| Team Management | ✅ Live | `/[clinic]/portal/team` |
| Product Management | ✅ Live | `/[clinic]/portal/products` |
| Audit Logs | ✅ Live | `/[clinic]/portal/admin/audit` |
| Epidemiology Dashboard | ✅ Live | `/[clinic]/portal/epidemiology` |
| Campaign Management | ⚠️ Partial | UI exists, email sending not implemented |

### Other

| Feature | Status | Routes |
|---------|--------|--------|
| QR Tag Scanning | ✅ Live | `/tag/[code]` |
| Pet Profile Scan | ✅ Live | `/scan/[id]` |
| Owner Pet View | ✅ Live | `/owner/pets` |
| Global Stats | ✅ Live | `/global/stats` |
| Global Search | ✅ Live | API: `/api/search` |
| Notifications | ✅ Live | API: `/api/notifications` |

---

## Feature Categories Detail

### Public Website

The public-facing website for each clinic includes:

- **Dynamic Homepage** - Hero section, features, testimonials, contact info
- **Service Catalog** - Filterable list of services with pricing and duration
- **About Page** - Team profiles, clinic information, certifications
- **Booking Flow** - Multi-step appointment booking wizard with slot availability
- **Online Store** - Full e-commerce with cart, checkout, reviews, wishlist

### Pet Management

Complete pet profile management:

- **Pet Profiles** - Photos, details, medical conditions, allergies
- **Vaccine Records** - Track vaccinations with due dates and PDF export
- **Medical History** - Timeline of consultations, exams, surgeries
- **QR Tags** - Physical tags for pet identification with scan history
- **Lost & Found** - Registry for lost pets with finder notification

### Clinical Tools

Professional veterinary tools:

- **Digital Prescriptions** - Create and PDF export prescriptions with digital signature
- **Diagnosis Codes** - VeNom/SNOMED code search with category filtering
- **Drug Dosages** - Dosing calculator by species/weight with route and frequency
- **Growth Charts** - Track pet weight against breed-specific standards
- **Vaccine Reactions** - Monitor adverse reactions with severity tracking
- **Quality of Life** - HHHHHMM assessment scale for end-of-life decisions
- **Reproductive Cycles** - Breeding management and cycle tracking

### Hospitalization

Inpatient management system:

- **Kennels** - Cage/kennel assignment with availability tracking
- **Vitals** - Regular vitals monitoring (temp, HR, RR, pain scale)
- **Treatments** - Scheduled treatments with medication tracking
- **Feeding** - Feeding logs with food type and amount
- **Discharge** - Discharge workflows with summary generation

### Laboratory

Lab order management:

- **Test Catalog** - Available tests with reference ranges
- **Lab Panels** - Pre-configured test panels
- **Order Management** - Create, track, and complete lab orders
- **Result Entry** - Enter results with abnormal flagging
- **Attachments** - Upload result PDFs and images
- **Comments** - Internal notes and discussion

### Insurance

Insurance integration:

- **Policies** - Track pet insurance policies
- **Claims** - Submit and track insurance claims
- **Pre-Auth** - Request pre-authorization for procedures
- **Providers** - Insurance provider directory

### Business Tools

Clinic operations management:

- **Appointments** - Scheduling with calendar view and overlap detection
- **Invoicing** - Full invoice system with payments, refunds, and PDF generation
- **Inventory** - Stock management with WAC (Weighted Average Cost)
- **Expenses** - Track operational costs with receipt upload
- **Loyalty Program** - Points earning and redemption system
- **Campaigns** - Marketing campaign management

### Communication

Multi-channel communication:

- **In-App Messaging** - Conversations between staff and clients
- **WhatsApp Integration** - Bidirectional WhatsApp messaging
- **Message Templates** - Pre-built templates for common messages
- **Quick Replies** - Fast response library
- **Notifications** - In-app notification system

---

## User Roles & Access

### Pet Owners (`owner`)

| Feature | Access |
|---------|--------|
| Public website | Full |
| Own pet profiles | Full CRUD |
| Own appointments | Create, View, Cancel |
| Own invoices | View, Pay |
| Own messages | Full |
| Store | Browse, Purchase |
| Loyalty points | View, Redeem |

### Veterinarians (`vet`)

| Feature | Access |
|---------|--------|
| All owner features | Full |
| All patients | View, Edit |
| Medical records | Full CRUD |
| Prescriptions | Create, View |
| Clinical tools | Full |
| Appointments | Manage all |
| Lab orders | Full |
| Hospitalizations | Full |

### Administrators (`admin`)

| Feature | Access |
|---------|--------|
| All vet features | Full |
| Team management | Full |
| Inventory | Full |
| Finances | Full |
| Settings | Full |
| Audit logs | View |
| Reports | Full |
| Insurance | Full |

---

## API Coverage

All features are accessible via:

- **REST API** - 167 endpoints at `/api/*`
- **Server Actions** - 22 actions at `/app/actions/*.ts`
- **Cron Jobs** - 5 endpoints at `/api/cron/*`

See [API Documentation](../api/overview.md) for details.

---

## Planned Features

See [Development Tickets](../tickets/README.md) for detailed implementation plans:

| Feature | Priority | Effort | Ticket |
|---------|----------|--------|--------|
| Multi-language Support (i18n) | P2 | 40h | [FEAT-001](../tickets/features/FEAT-001-multi-language.md) |
| Mobile App (React Native) | P3 | 8 weeks | [FEAT-002](../tickets/features/FEAT-002-mobile-app.md) |
| Telemedicine Integration | P3 | 5 weeks | [FEAT-003](../tickets/features/FEAT-003-telemedicine.md) |
| Advanced Analytics Dashboard | P2 | 48h | [FEAT-004](../tickets/features/FEAT-004-analytics-dashboard.md) |
| Automated Reminder Campaigns | P2 | 32h | [FEAT-005](../tickets/features/FEAT-005-automated-reminders.md) |
| AI-assisted Diagnosis | P3 | TBD | Backlog |

---

## Related Documentation

- [API Reference](../api/overview.md)
- [Database Schema](../database/schema-reference.md)
- [Architecture Overview](../architecture/overview.md)
- [Routing Map](../reference/routing-map.md)
- [Codebase Statistics](../reference/codebase-statistics.md)
- [Development Tickets](../tickets/README.md)
- [Security Audit](../../.claude/SUPABASE_AUDIT.md)
