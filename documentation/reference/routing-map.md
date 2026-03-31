# Vete Platform - Complete Routing Map

> All routes documented with authentication requirements and descriptions.

---

## Route Summary

| Area | Routes | Auth Required |
|------|--------|---------------|
| Public Website | 15 | No |
| Portal (Owners) | 35 | Yes (any role) |
| Dashboard (Staff) | 30 | Yes (vet/admin) |
| Tools | 8 | Mixed |
| Auth | 6 | No |
| API | 83 | Most require auth |
| **Total** | **177** | |

---

## 1. Public Website Routes

No authentication required.

| Route | Description |
|-------|-------------|
| `/[clinic]` | Homepage with hero, features, testimonials |
| `/[clinic]/about` | About clinic, team, certifications |
| `/[clinic]/services` | Service catalog |
| `/[clinic]/services/[serviceId]` | Individual service details |
| `/[clinic]/store` | Product catalog |
| `/[clinic]/store/product/[id]` | Product details |
| `/[clinic]/faq` | Frequently asked questions |
| `/[clinic]/privacy` | Privacy policy |
| `/[clinic]/terms` | Terms of service |
| `/[clinic]/book` | Appointment booking (redirects to login if needed) |
| `/[clinic]/consent/[token]` | Consent document signing (token-based access) |

### Public Tools

| Route | Description |
|-------|-------------|
| `/[clinic]/tools/toxic-food` | Toxic food checker for pets |
| `/[clinic]/tools/age-calculator` | Pet age calculator (10 species) |
| `/[clinic]/diagnosis_codes` | Diagnosis code search (VeNom/SNOMED) |
| `/[clinic]/drug_dosages` | Drug dosage calculator |
| `/[clinic]/growth_charts` | Growth chart reference |

---

## 2. Authentication Routes

| Route | Description | Auth |
|-------|-------------|------|
| `/[clinic]/portal/login` | Login page | No |
| `/[clinic]/portal/signup` | Registration page | No |
| `/[clinic]/portal/forgot-password` | Password reset request | No |
| `/[clinic]/portal/reset-password` | Password reset form | No |
| `/[clinic]/portal/logout` | Logout action | Yes |
| `/auth/callback` | OAuth callback handler | No |

---

## 3. Portal Routes (Pet Owners)

Requires authentication. Any role can access.

### My Pets

| Route | Description |
|-------|-------------|
| `/[clinic]/portal/pets` | My pets list |
| `/[clinic]/portal/pets/new` | Register new pet |
| `/[clinic]/portal/pets/[id]` | Pet details |
| `/[clinic]/portal/pets/[id]/edit` | Edit pet |
| `/[clinic]/portal/pets/[id]/vaccines` | Vaccine records |
| `/[clinic]/portal/pets/[id]/vaccines/new` | Add vaccine |
| `/[clinic]/portal/pets/[id]/records` | Medical records |
| `/[clinic]/portal/pets/[id]/records/new` | Add medical record |

### Appointments

| Route | Description |
|-------|-------------|
| `/[clinic]/portal/appointments` | My appointments |
| `/[clinic]/portal/appointments/new` | Book appointment |
| `/[clinic]/portal/appointments/[id]` | Appointment details |
| `/[clinic]/portal/schedule` | View clinic schedule |

### Communications

| Route | Description |
|-------|-------------|
| `/[clinic]/portal/messages` | Message inbox |
| `/[clinic]/portal/messages/[id]` | Message thread |
| `/[clinic]/portal/messages/new` | New message |
| `/[clinic]/portal/notifications` | Notification center |

### Account

| Route | Description |
|-------|-------------|
| `/[clinic]/portal/profile` | My profile |
| `/[clinic]/portal/settings/notifications` | Notification preferences |
| `/[clinic]/portal/settings/security` | Security settings |
| `/[clinic]/portal/payments` | Payment methods |
| `/[clinic]/portal/onboarding` | First-time setup wizard |

### Shopping

| Route | Description |
|-------|-------------|
| `/[clinic]/cart` | Shopping cart |
| `/[clinic]/cart/checkout` | Checkout flow |
| `/[clinic]/store/orders` | Order history |

---

## 4. Dashboard Routes (Staff Only)

Requires `vet` or `admin` role.

### Core

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard` | Main dashboard with stats |
| `/[clinic]/portal/dashboard` | Owner dashboard view |
| `/[clinic]/portal/dashboard/patients` | Patient network |

### Appointments & Calendar

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/appointments` | All appointments |
| `/[clinic]/dashboard/calendar` | Calendar view |
| `/[clinic]/dashboard/schedules` | Staff schedules |
| `/[clinic]/dashboard/schedules/[staffId]` | Individual schedule editor |

### Clients

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/clients` | Client list |
| `/[clinic]/dashboard/clients/[id]` | Client details |
| `/[clinic]/dashboard/clients/invite` | Invite new client |

### Invoicing

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/invoices` | Invoice list |
| `/[clinic]/dashboard/invoices/new` | Create invoice |
| `/[clinic]/dashboard/invoices/[id]` | Invoice details |

### Hospitalization

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/hospital` | Hospital dashboard |
| `/[clinic]/dashboard/hospital/[id]` | Patient admission details |

### Laboratory

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/lab` | Lab orders list |
| `/[clinic]/dashboard/lab/new` | New lab order |
| `/[clinic]/dashboard/lab/[id]` | Lab order details |

### Insurance

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/insurance` | Insurance dashboard |
| `/[clinic]/dashboard/insurance/policies` | Policy list |
| `/[clinic]/dashboard/insurance/claims/new` | New claim |
| `/[clinic]/dashboard/insurance/claims/[id]` | Claim details |

### Consents

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/consents` | Consent documents |
| `/[clinic]/dashboard/consents/[id]` | Consent details |
| `/[clinic]/dashboard/consents/templates` | Consent templates |

### Communications

| Route | Description |
|-------|-------------|
| `/[clinic]/dashboard/whatsapp` | WhatsApp inbox |
| `/[clinic]/dashboard/whatsapp/templates` | Message templates |

---

## 5. Admin-Only Routes

Requires `admin` role.

| Route | Description |
|-------|-------------|
| `/[clinic]/portal/team` | Team management |
| `/[clinic]/portal/admin/audit` | Audit logs |
| `/[clinic]/portal/epidemiology` | Disease reports |
| `/[clinic]/portal/finance` | Financial dashboard |
| `/[clinic]/portal/inventory` | Inventory management |
| `/[clinic]/portal/products` | Product management |
| `/[clinic]/portal/campaigns` | Campaign management |

---

## 6. Global/Special Routes

| Route | Description | Auth |
|-------|-------------|------|
| `/` | Marketing landing page | No |
| `/global/stats` | Platform statistics | No |
| `/scan/[id]` | Pet QR code scan | No |
| `/tag/[code]` | Tag lookup | No |
| `/owner/pets` | Legacy owner pets view | ? |

---

## 7. API Routes (83 endpoints)

See [API Overview](../api/overview.md) for complete documentation.

### Grouped by Domain

| Domain | Endpoints |
|--------|-----------|
| Appointments | `/api/appointments/*`, `/api/booking` |
| Services | `/api/services` |
| Pets | `/api/pets/*` |
| Invoices | `/api/invoices/*` |
| Hospitalization | `/api/hospitalizations/*`, `/api/kennels` |
| Laboratory | `/api/lab-orders/*`, `/api/lab-catalog` |
| Insurance | `/api/insurance/*` |
| Consents | `/api/consents/*` |
| Store | `/api/store/*` |
| Communications | `/api/conversations/*`, `/api/messages/*`, `/api/whatsapp/*` |
| Dashboard | `/api/dashboard/*` |
| Finance | `/api/finance/*` |
| Inventory | `/api/inventory/*` |
| Clinical | `/api/diagnosis_codes`, `/api/drug_dosages`, etc. |
| Notifications | `/api/notifications/*` |
| Search | `/api/search` |

---

## 8. Layout Hierarchy

```
Root Layout (app/layout.tsx)
├── Fonts, globals.css
│
├── [clinic] Layout (app/[clinic]/layout.tsx)
│   ├── ClinicThemeProvider
│   ├── CartProvider
│   ├── ToastProvider
│   ├── Header (MainNav)
│   └── Footer
│   │
│   ├── portal Layout (app/[clinic]/portal/layout.tsx)
│   │   ├── Auth check (redirect if not logged in)
│   │   ├── Portal header
│   │   └── Mobile navigation
│   │
│   └── dashboard Layout (app/[clinic]/dashboard/layout.tsx)
│       ├── Auth + role check (redirect if not staff)
│       ├── DashboardShell
│       ├── Sidebar navigation
│       └── Command palette
│
└── Auth routes (no clinic layout)
```

---

## 9. Authentication Flow

```
User visits protected route
         │
         ▼
    ┌────────────────┐
    │ Layout checks  │
    │ auth.getUser() │
    └───────┬────────┘
            │
     ┌──────┴──────┐
     │             │
   No user      Has user
     │             │
     ▼             ▼
  Redirect    ┌──────────┐
  to login    │ Check    │
              │ role     │
              └────┬─────┘
                   │
           ┌───────┴───────┐
           │               │
      Staff only       Any role
           │               │
           ▼               ▼
    ┌──────────────┐  ┌──────────┐
    │ is_staff_of  │  │ Render   │
    │ tenant_id?   │  │ page     │
    └──────┬───────┘  └──────────┘
           │
    ┌──────┴──────┐
    │             │
   Yes           No
    │             │
    ▼             ▼
  Render      Redirect to
  page        /portal/dashboard
```

---

*Generated: December 2024*
