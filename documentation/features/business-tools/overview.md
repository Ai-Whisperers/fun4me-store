# Business Tools

Clinic operations management features including appointments, invoicing, inventory, and finance.

## Available Tools

| Tool | Route | Purpose |
|------|-------|---------|
| [Appointments](#appointments) | `/[clinic]/portal/schedule` | Scheduling system |
| [Invoicing](#invoicing) | `/[clinic]/portal/finance` | Invoice management |
| [Inventory](#inventory) | `/[clinic]/portal/inventory` | Stock management |
| [Expenses](#expenses) | `/[clinic]/portal/finance` | Expense tracking |
| [Loyalty Program](#loyalty-program) | `/[clinic]/loyalty_points` | Points system |
| [Campaigns](#campaigns) | `/[clinic]/portal/campaigns` | Marketing |

---

## Appointments

Full appointment scheduling system.

### Features

- Calendar view (day, week, month)
- Service-based scheduling
- Staff assignment
- Duration calculation
- Status workflow
- Reminder integration

### Status Workflow

```
pending → confirmed → in_progress → completed
    ↓
  cancelled
    ↓
  no_show
```

### Database Tables

- `appointments` - Appointment records
- `services` - Available services
- `profiles` - Staff (vet) assignments

### Routes

- `/[clinic]/book` - Public booking page
- `/[clinic]/portal/schedule` - Staff calendar view
- `/[clinic]/portal/appointments/new` - Create appointment
- `GET /api/booking` - List appointments
- `POST /api/booking` - Create appointment

### Components

- `components/booking/booking-wizard.tsx` - Multi-step booking
- `components/forms/appointment-form.tsx` - Appointment form

### Booking Flow

1. Select service
2. Choose date/time
3. Select pet (or add new)
4. Confirm details
5. Receive confirmation

---

## Invoicing

Complete invoice management system.

### Features

- Invoice generation from appointments
- Line items (services, products, custom)
- Automatic tax calculation
- Multiple payment methods
- Partial payments support
- Refunds and credits
- PDF export
- Invoice sequences per tenant

### Invoice Lifecycle

```
draft → sent → viewed → partial → paid
           ↓
      overdue → cancelled
                    ↓
               refunded
```

### Database Tables

- `services` - Billable services
- `invoices` - Invoice headers
- `invoice_items` - Line items
- `payments` - Payment records
- `payment_methods` - Payment options
- `refunds` - Refund tracking
- `client_credits` - Store credit
- `invoice_sequences` - Invoice numbering
- `recurring_invoice_templates` - Recurring billing

### Routes

- `/[clinic]/portal/finance` - Financial dashboard
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/[id]/payments` - Record payment

### Invoice Number Format

Generated per tenant: `ADR-2024-00001`, `PL-2024-00001`

### Tax Handling

- Default tax rate: 10% (IVA)
- Per-item tax configuration
- Tax-exempt items supported

---

## Inventory

Stock management with Weighted Average Cost (WAC).

### Features

- Product catalog management
- Category organization
- Stock level tracking
- Automatic WAC calculation
- Low stock alerts
- Transaction history
- Bulk import/export
- Price history tracking

### Transaction Types

| Type | Effect |
|------|--------|
| `purchase` | +stock, updates WAC |
| `sale` | -stock |
| `adjustment` | +/- stock |
| `damage` | -stock |
| `theft` | -stock |
| `return` | +/- stock |

### Database Tables

- `store_categories` - Product categories
- `store_products` - Product catalog
- `store_inventory` - Stock levels
- `store_inventory_transactions` - Stock movements
- `store_price_history` - Price changes

### Routes

- `/[clinic]/portal/inventory` - Inventory dashboard
- `/[clinic]/portal/products` - Product management
- `/[clinic]/portal/products/new` - Add product
- `GET /api/inventory/stats` - Stock statistics
- `GET /api/inventory/alerts` - Low stock alerts
- `POST /api/inventory/import` - Bulk import

### WAC Calculation

```sql
new_wac = (current_stock * current_wac + new_qty * new_cost) / new_total_stock
```

### Low Stock Alerts

Configured per product:
```typescript
{
  reorder_point: 10,  // Alert when stock <= 10
  reorder_quantity: 50 // Suggested order quantity
}
```

---

## Expenses

Operational expense tracking.

### Features

- Category classification
- Receipt image upload
- Monthly/yearly reports
- Budget comparison
- Export to accounting

### Expense Categories

- `rent` - Facility rent
- `utilities` - Electric, water, internet
- `supplies` - Medical supplies
- `payroll` - Staff salaries
- `marketing` - Advertising
- `software` - Subscriptions
- `other` - Miscellaneous

### Database Tables

- `expenses` - Expense records

### Routes

- `/[clinic]/portal/finance` - Finance dashboard
- `GET /api/finance/expenses` - List expenses
- `POST /api/finance/expenses` - Create expense
- `GET /api/finance/pl` - Profit/Loss report

### Components

- `components/finance/expense-form.tsx` - Expense entry

---

## Loyalty Program

Points-based customer loyalty system.

### Features

- Points earning on purchases
- Points redemption for products/services
- Transaction history
- Balance tracking
- Promotional bonus points
- Expiration rules (optional)

### Points Mechanics

```
Earning: 1 point per X currency spent
Redemption: Y points = Z currency discount
```

### Database Tables

- `loyalty_points` - User balances
- `loyalty_transactions` - Points ledger

### Routes

- `/[clinic]/loyalty_points` - Public points page
- `GET /api/loyalty_points` - Get balance
- `POST /api/loyalty_points` - Add transaction

### Components

- `components/loyalty/loyalty-card.tsx` - Points display
- `components/commerce/loyalty-redemption.tsx` - Redemption UI

### Transaction Types

| Points | Type |
|--------|------|
| +100 | Purchase reward |
| +50 | Vaccine completion bonus |
| +25 | Referral bonus |
| -200 | Redeemed for discount |

---

## Campaigns

Marketing campaign management.

### Features

- Target audience selection
- Message templates
- Scheduling
- Multi-channel (SMS, WhatsApp, Email, In-app)
- Delivery tracking
- Performance metrics

### Campaign Types

- Vaccine reminders
- Appointment reminders
- Birthday greetings
- Promotional offers
- Re-engagement (inactive clients)

### Database Tables

- `broadcast_campaigns` - Campaign definitions
- `broadcast_recipients` - Target recipients
- `message_templates` - Message templates

### Routes

- `/[clinic]/portal/campaigns` - Campaign management
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/[id]/send` - Send campaign

### Audience Targeting

```json
{
  "audience_type": "pet_species",
  "audience_filter": {
    "species": "dog",
    "last_visit_days_ago": { "min": 30, "max": 90 }
  }
}
```

---

## Financial Dashboard

Unified view of clinic finances.

### Metrics Displayed

- Revenue (today, week, month, year)
- Outstanding invoices
- Expense breakdown
- Inventory value
- Loyalty points liability
- Profit/Loss trends

### Charts

- Revenue over time
- Expenses by category
- Payment method breakdown
- Service popularity

---

## Integration Flow

```
Appointment
    ↓ (completed)
Invoice (auto-generated)
    ↓ (items added)
Inventory (stock deducted)
    ↓ (paid)
Loyalty Points (earned)
    ↓
Financial Reports
```

---

## Related Documentation

- [Invoicing API](../../api/endpoints/invoices.md)
- [Inventory API](../../api/endpoints/inventory.md)
- [Database Schema](../../database/schema-reference.md)
- [Communication Features](../communication/)
