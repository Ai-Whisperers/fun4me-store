# Screens & User Interactions Reference

Complete documentation of all screens in the Vete platform, organized by section. Each screen documents:

- **Route** - URL path
- **Purpose** - What the screen does
- **User Access** - Which roles can access it
- **User Interactions** - All actions users can perform
- **Components Used** - Key React components

---

## Quick Stats

| Section | Screens | API Routes |
|---------|---------|------------|
| [Public Pages](./public-pages.md) | 15 | 5 |
| [Portal (Pet Owner)](./portal-pages.md) | 22 | 18 |
| [Dashboard (Staff/Admin)](./dashboard-pages.md) | 13 | 25 |
| [Global & Auth](./global-auth-pages.md) | 7 | 3 |
| **Total** | **57** | **51** |

---

## User Roles Quick Reference

| Role | Code | Access Level |
|------|------|--------------|
| **Pet Owner** | `owner` | Own pets, appointments, invoices |
| **Veterinarian** | `vet` | All patients, medical records, prescriptions |
| **Administrator** | `admin` | Everything + settings, team, finances |
| **Public** | - | Unauthenticated visitors |

---

## Screen Categories

### 1. [Public Pages](./public-pages.md)

Unauthenticated pages for clinic marketing and engagement:

- Homepage, About, Services
- Online Store with Cart
- Appointment Booking Wizard
- Interactive Tools (Age Calculator, Toxic Food Checker)
- Clinical Reference Pages (Drug Dosages, Diagnosis Codes, etc.)

### 2. [Portal Pages (Pet Owner)](./portal-pages.md)

Authenticated area for pet owners:

- Authentication (Login, Signup, Password Reset)
- Pet Management (Register, Edit, View, Delete)
- Vaccine & Medical Records
- Appointment Management
- Profile Settings

### 3. [Dashboard Pages (Staff/Admin)](./dashboard-pages.md)

Staff-only area for clinic operations:

- Appointments Calendar & Queue
- Invoicing System
- Staff Scheduling
- WhatsApp Messaging
- Inventory & Finance

### 4. [Global & Auth Pages](./global-auth-pages.md)

Cross-tenant and authentication pages:

- Root redirect
- Global signup
- QR Tag scanning
- Pet public profile

---

## Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUBLIC PAGES                             │
│  Homepage → Services → Service Detail → Book Appointment         │
│  Store → Cart → Checkout                                         │
│  Tools (Age Calculator, Toxic Food)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Login Required
┌─────────────────────────────────────────────────────────────────┐
│                      PORTAL (Pet Owners)                         │
│  Dashboard → My Pets → Pet Profile → Add Vaccine/Record          │
│  Appointments → Book New → View/Reschedule/Cancel                │
│  Profile Settings                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Staff Role Required
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD (Staff/Admin)                       │
│  Staff Dashboard → Appointments → Patient Management             │
│  Invoices → Create/Send/Record Payment                           │
│  Calendar → Schedules → Time Off                                 │
│  WhatsApp → Templates → Conversations                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Common Interaction Patterns

### Forms
- Real-time validation with error messages
- Loading spinners during submission
- Success/error toast notifications
- Spanish language labels and messages

### Modals
- Confirmation dialogs for destructive actions
- Detail views (appointments, invoices)
- Edit forms (reschedule, payment recording)

### Lists & Tables
- Pagination for large datasets
- Status filters (pending, completed, etc.)
- Date range filters
- Search/autocomplete

### Cards
- Hover effects with shadows
- Status badges (color-coded)
- Action buttons (edit, delete, view)

---

## Related Documentation

- [Features Overview](../../features/overview.md)
- [API Reference](../../api/overview.md)
- [Database Schema](../../database/schema-reference.md)
- [Architecture Overview](../../architecture/overview.md)

---

*Last updated: December 2024*
