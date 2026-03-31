# API Overview

Vete provides both REST API endpoints and Server Actions for data operations.

> **Last Updated**: January 2026  
> **Total API Route Files**: 313 files  
> **Total HTTP Methods**: ~480+ endpoints  
> **Total Server Actions**: 37  
> **Total Cron Jobs**: 18

---

## API Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT                                     │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │  Server         │      │  Client         │                   │
│  │  Components     │      │  Components     │                   │
│  └────────┬────────┘      └────────┬────────┘                   │
│           │                        │                             │
│           │ Direct                 │ fetch()                     │
│           ▼                        ▼                             │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │  Server         │      │  REST API       │                   │
│  │  Actions        │      │  Routes         │                   │
│  │  /actions/*.ts  │      │  /api/*         │                   │
│  └────────┬────────┘      └────────┬────────┘                   │
└───────────┼────────────────────────┼────────────────────────────┘
            │                        │
            ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT                               │
│           (RLS automatically filters by tenant)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## REST API Endpoints (313 Route Files, ~480+ HTTP Methods)

**Note**: This section documents the major endpoint categories. For complete API reference, see the route files in `web/app/api/`.

### Appointments & Booking (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/booking` | List appointments |
| POST | `/api/booking` | Create appointment |
| PUT | `/api/booking` | Update appointment |
| DELETE | `/api/booking` | Cancel appointment |
| GET | `/api/appointments/slots` | Get available time slots |
| POST | `/api/appointments/[id]/check-in` | Check in for appointment |
| POST | `/api/appointments/[id]/complete` | Mark appointment complete |

### Pets & Medical (4 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pets/[id]` | Get pet details |
| POST | `/api/pets/[id]` | Create pet |
| PUT | `/api/pets/[id]` | Update pet |
| GET/POST | `/api/pets/[id]/qr` | Generate/get QR code |

### Clinical Tools (9 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/diagnosis_codes` | Search diagnosis codes |
| GET | `/api/drug_dosages` | Get drug dosages |
| GET | `/api/growth_charts` | Get growth chart data |
| GET | `/api/growth_standards` | Get breed growth standards |
| GET/POST | `/api/prescriptions` | List/create prescriptions |
| PUT/DELETE | `/api/prescriptions` | Update/delete prescriptions |
| GET/POST | `/api/vaccine_reactions` | Vaccine reactions CRUD |
| POST | `/api/vaccine_reactions/check` | Check reaction risk |
| GET/POST | `/api/reproductive_cycles` | Reproductive cycle tracking |
| GET/POST | `/api/euthanasia_assessments` | QoL assessments |

### Invoicing & Payments (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/invoices/[id]` | Get invoice details |
| POST | `/api/invoices/[id]` | Update invoice |
| POST | `/api/invoices/[id]/payments` | Record payment |
| POST | `/api/invoices/[id]/send` | Send invoice via email |
| POST | `/api/invoices/[id]/refund` | Process refund |

### Hospitalization (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hospitalizations` | List hospitalizations |
| POST | `/api/hospitalizations` | Admit patient |
| GET | `/api/hospitalizations/[id]` | Get hospitalization details |
| PATCH | `/api/hospitalizations/[id]` | Update/discharge |
| GET/POST | `/api/hospitalizations/[id]/vitals` | Vital signs |
| GET/POST | `/api/hospitalizations/[id]/treatments` | Treatments |
| GET/POST | `/api/hospitalizations/[id]/feedings` | Feeding logs |
| GET | `/api/kennels` | List kennels |

### Laboratory (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/lab-orders` | Lab order CRUD |
| GET/PATCH | `/api/lab-orders/[id]` | Individual order |
| POST | `/api/lab-orders/[id]/results` | Upload results |
| POST | `/api/lab-orders/[id]/comments` | Add comments |
| GET | `/api/lab-catalog` | Available tests |

### Consent Management (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/consents` | Consent CRUD |
| GET/POST | `/api/consents/[id]` | Individual consent |
| GET | `/api/consents/[id]/audit` | Audit trail |
| GET/POST | `/api/consents/blanket` | Blanket consents |
| GET/POST | `/api/consents/requests` | Consent requests |
| GET/POST | `/api/consents/templates` | Templates |
| GET/POST | `/api/consents/templates/[id]` | Individual template |

### Insurance (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/insurance/policies` | Policy management |
| GET/POST | `/api/insurance/claims` | Claims CRUD |
| GET/POST | `/api/insurance/claims/[id]` | Individual claim |
| GET/POST | `/api/insurance/pre-authorizations` | Pre-auth requests |
| GET | `/api/insurance/providers` | Provider directory |

### E-Commerce / Store (18 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/store/products` | List products |
| POST | `/api/store/products` | Create product (staff only) |
| GET | `/api/store/products/[id]` | Product details |
| GET | `/api/store/search` | Product search |
| GET/PUT/DELETE | `/api/store/cart` | Cart persistence (logged-in users) |
| POST/DELETE | `/api/store/cart/items` | Add/remove cart items with stock reservation |
| GET/POST | `/api/store/orders` | Order management |
| POST | `/api/store/checkout` | Process checkout |
| GET | `/api/store/orders/pending-prescriptions` | Orders pending prescription review |
| GET/PUT | `/api/store/orders/[id]/prescription` | Prescription review (approve/reject) |
| POST | `/api/store/prescriptions/upload` | Upload prescription file |
| POST | `/api/store/coupons/validate` | Validate coupon |
| GET/POST | `/api/store/reviews` | Product reviews |
| GET/POST/DELETE | `/api/store/wishlist` | User wishlist |
| GET/POST | `/api/store/stock-alerts` | Stock alerts |
| GET/POST | `/api/store/subscriptions` | Recurring order management |

### Communications (11 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/conversations` | Conversations CRUD |
| DELETE | `/api/conversations` | Delete conversation |
| GET | `/api/conversations/[id]` | Conversation details |
| POST | `/api/conversations/[id]` | Update conversation |
| DELETE | `/api/conversations/[id]` | Delete conversation |
| GET/POST | `/api/conversations/[id]/messages` | Messages |
| GET/POST | `/api/messages/templates` | Message templates |
| GET/POST/DELETE | `/api/messages/quick-replies` | Quick replies |
| GET | `/api/whatsapp` | WhatsApp conversations |
| POST | `/api/whatsapp/send` | Send WhatsApp message |
| GET/POST | `/api/whatsapp/templates` | WhatsApp templates |
| GET/POST/DELETE | `/api/whatsapp/templates/[id]` | Individual template |

### Staff Management (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/staff/schedule` | Staff schedules |
| GET/POST | `/api/staff/time-off` | Time off requests |
| GET | `/api/staff/time-off/types` | Time off types |

### Inventory (12 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/alerts` | Low stock alerts |
| GET/POST | `/api/inventory/stats` | Inventory statistics |
| POST | `/api/inventory/import` | Bulk import from CSV/Excel |
| POST | `/api/inventory/import/preview` | Preview import before commit |
| POST | `/api/inventory/export` | Export inventory to file |
| POST | `/api/inventory/adjust` | Adjust stock with reason |
| POST | `/api/inventory/receive` | Receive stock, update WAC |
| GET | `/api/inventory/reorder-suggestions` | Products needing reorder |
| GET | `/api/inventory/[productId]/history` | Stock transaction history |
| GET | `/api/inventory/barcode-lookup` | Product lookup by barcode |
| GET/POST | `/api/inventory/mappings` | Catalog product mappings |
| PUT/DELETE | `/api/inventory/mappings/[id]` | Update/delete mapping |

### Cron / Background Jobs (18 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/release-reservations` | Release expired cart reservations |
| GET | `/api/cron/process-subscriptions` | Process subscription renewals |
| GET | `/api/cron/expiry-alerts` | Send product expiry notifications |
| GET | `/api/cron/stock-alerts` | Send low stock email alerts |
| GET | `/api/cron/reminders` | Process scheduled reminders |
| GET | `/api/cron/billing/auto-charge` | Auto-charge subscriptions |
| GET | `/api/cron/check-health` | Health check for cron jobs |
| GET | `/api/cron/billing/*` | Additional billing cron jobs |
| GET | `/api/cron/*` | +10 more background jobs |

**Note**: See `web/app/api/cron/` for complete list of 18 cron endpoints.

### Finance (3 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/finance/expenses` | Expense tracking |
| GET | `/api/finance/pl` | Profit/Loss report |

### Dashboard Analytics (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | General statistics |
| GET | `/api/dashboard/appointments` | Appointment analytics |
| GET | `/api/dashboard/revenue` | Revenue reporting |
| GET | `/api/dashboard/vaccines` | Vaccine coverage |
| GET | `/api/dashboard/inventory-alerts` | Inventory alerts |

### Other (7 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/clients` | Client management |
| GET | `/api/services` | Service catalog |
| GET | `/api/notifications` | User notifications |
| POST | `/api/notifications/mark-all-read` | Mark all read |
| GET | `/api/loyalty/points` | Loyalty program |
| GET | `/api/search` | Global search |
| GET | `/api/epidemiology/heatmap` | Disease heatmap |

---

## Server Actions (37 Total)

Server Actions are used for mutations from Server Components.

### Location: `/app/actions/`

| File | Actions | Description |
|------|---------|-------------|
| `appointments.ts` | `cancelAppointment()`, `rescheduleAppointment()` | Appointment management |
| `create-appointment.ts` | `createAppointment()` | Book new appointment |
| `update-appointment.ts` | - | Update appointment details |
| `update-appointment-status.ts` | - | Change appointment status |
| `create-pet.ts` | `createPet()` | Add new pet |
| `pets.ts` | - | Pet management operations |
| `pet-documents.ts` | `uploadPetDocuments()`, `deletePetDocument()`, `getPetDocuments()` | Pet document management |
| `create-vaccine.ts` | `createVaccine()` | Record vaccination |
| `create-medical-record.ts` | `createMedicalRecord()` | Add clinical notes |
| `medical-records.ts` | - | Medical record operations |
| `assign-tag.ts` | - | Assign QR tag to pet |
| `create-product.ts` | - | Create store product |
| `update-product.ts` | - | Update store product |
| `delete-product.ts` | - | Delete store product |
| `store.ts` | - | Store operations |
| `invoices.ts` | - | Invoice operations |
| `invoices/create.ts` | - | Create invoice |
| `invoices/update.ts` | - | Update invoice |
| `invoices/send.ts` | - | Send invoice email |
| `invoices/payment.ts` | - | Record payment |
| `invoices/void.ts` | - | Void invoice |
| `invite-staff.ts` | - | Invite team members |
| `invite-client.ts` | - | Invite pet owners |
| `update-profile.ts` | - | Update user profile |
| `schedules.ts` | - | Schedule management |
| `time-off.ts` | - | Time off requests |
| `whatsapp.ts` | `getConversations()` | WhatsApp operations |
| `messages.ts` | - | Message operations |
| `send-email.ts` | - | Email notifications |
| `contact-form.ts` | - | Public contact form |
| `safety.ts` | - | Security operations |
| `network-actions.ts` | - | Network operations |
| `system-configs.ts` | - | System configuration |

### Example Usage

```typescript
// In a Server Component or form action
import { createPet } from '@/app/actions/create-pet';

export default function NewPetForm() {
  return (
    <form action={createPet}>
      <input name="name" required />
      <input name="species" required />
      <button type="submit">Crear Mascota</button>
    </form>
  );
}
```

---

## Authentication

All API requests require authentication via Supabase:

### Cookie-based (Browser)

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  // User is authenticated, RLS handles tenant isolation
  const { data } = await supabase.from('pets').select('*');
  return Response.json(data);
}
```

### Service Role (Server-to-Server)

For administrative operations, use service role client:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

---

## Rate Limiting

Rate limiting is implemented on sensitive endpoints:

| Endpoint Type | Limit |
|---------------|-------|
| Search endpoints | 30 requests/minute |
| Write operations | 20 requests/minute |
| Authentication | 10 requests/minute |

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (wrong role/tenant) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Server Error |

### Common Error Messages (Spanish)

| Code | Message |
|------|---------|
| AUTH_REQUIRED | "No autorizado" |
| NOT_FOUND | "No encontrado" |
| VALIDATION_ERROR | "Error de validación" |
| FORBIDDEN | "Acceso denegado" |
| SAVE_ERROR | "Error al guardar" |
| DELETE_ERROR | "Error al eliminar" |

---

## Validation

All API endpoints use Zod for input validation:

```typescript
import { z } from 'zod';

const createPetSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(['dog', 'cat', 'bird', 'reptile', 'other']),
  breed: z.string().optional(),
  birth_date: z.string().datetime().optional(),
  weight_kg: z.number().positive().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validated = createPetSchema.parse(body);
  // ... proceed with validated data
}
```

---

## API Best Practices

### DO

- Use Server Actions for form submissions
- Use REST API for client-side data fetching
- Let RLS handle tenant isolation
- Return appropriate HTTP status codes
- Validate all inputs with Zod
- Use Spanish for user-facing messages

### DON'T

- Bypass RLS with service role unless necessary
- Expose sensitive data in responses
- Make synchronous calls for heavy operations
- Trust client-provided tenant_id
- Skip input validation

---

## Related Documentation

- [Features Overview](../features/overview.md)
- [Database Schema](../database/schema-reference.md)
- [Rate Limiting Details](rate-limiting.md)
- [Checkout Endpoint](checkout-endpoint.md)
