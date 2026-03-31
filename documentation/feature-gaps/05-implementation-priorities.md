# Implementation Priorities

This document provides a prioritized roadmap for addressing feature gaps, organized by urgency and complexity.

---

## Priority Matrix

| Priority | Definition | Action |
|----------|------------|--------|
| 🔴 **Critical** | Blocks core functionality, users cannot complete essential tasks | Implement immediately |
| 🟡 **High** | Significant user pain point, frequent workarounds needed | Implement in next sprint |
| 🟢 **Medium** | Enhances experience, competitive feature | Plan for future sprints |
| 🔵 **Low** | Nice to have, edge cases | Backlog for consideration |

---

## Phase 1: Critical Fixes (Quick Wins)

These items have maximum impact with minimal effort. Most infrastructure exists.

### Week 1-2

#### 1. Password Reset Flow 🔴
**Effort**: 4-6 hours | **Impact**: High

**What exists**:
- Supabase Auth handles the backend
- Email templates configured

**What's needed**:
```
web/app/[clinic]/portal/forgot-password/page.tsx  (create)
web/app/[clinic]/portal/reset-password/page.tsx   (create)
```

**Implementation**:
```typescript
// forgot-password - trigger email
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/${clinic}/portal/reset-password`
});

// reset-password - handle token from URL
await supabase.auth.updateUser({ password: newPassword });
```

---

#### 2. Edit Pet Information 🔴
**Effort**: 4-6 hours | **Impact**: High

**What exists**:
- Pet creation form at `/pets/new`
- Pet data fetching works
- API for update

**What's needed**:
```
web/app/[clinic]/portal/pets/[id]/edit/page.tsx  (create)
web/app/actions/update-pet.ts                     (create)
```

**Implementation**:
- Copy form from `pets/new`, pre-fill with existing data
- Add server action for update

---

#### 3. Appointment Cancellation 🔴
**Effort**: 2-4 hours | **Impact**: High

**What exists**:
- `update-appointment.ts` server action
- Appointment status field in database

**What's needed**:
- "Cancel" button on appointment card
- Confirmation modal
- Status update to 'cancelled'

---

#### 4. Real-Time Availability 🔴
**Effort**: 8-12 hours | **Impact**: Critical

**What exists**:
- Appointments stored in database
- Staff schedules schema
- Booking wizard UI

**What's needed**:
- API endpoint: `/api/booking/availability?date=X&service=Y`
- Query booked slots, subtract from available
- Replace hardcoded time slots in `booking-wizard.tsx`

**Current (line 28-31)**:
```typescript
const timeSlots = ['09:00', '09:30', ...]; // HARDCODED
```

**Needed**:
```typescript
const { data: timeSlots } = useSWR(
  `/api/booking/availability?date=${selectedDate}`,
  fetcher
);
```

---

## Phase 2: Core Enhancements (API-Complete Features)

These features have complete APIs but need UI.

### Week 3-5

#### 5. Invoice Management UI 🔴
**Effort**: 16-24 hours | **Impact**: High

**What exists**:
- Full invoice API (`/api/invoices/*`)
- Payment recording
- PDF generation capability

**What's needed**:
```
web/app/[clinic]/dashboard/invoices/page.tsx           (list view)
web/app/[clinic]/dashboard/invoices/new/page.tsx       (create form)
web/app/[clinic]/dashboard/invoices/[id]/page.tsx      (detail view)
web/components/invoicing/invoice-form.tsx
web/components/invoicing/invoice-list.tsx
web/components/invoicing/payment-form.tsx
```

---

#### 6. Messaging UI (Chat) 🟡
**Effort**: 16-20 hours | **Impact**: High

**What exists**:
- Full messaging API (`/api/conversations/*`)
- Templates and quick replies

**What's needed**:
```
web/app/[clinic]/portal/messages/page.tsx              (conversation list)
web/app/[clinic]/portal/messages/[id]/page.tsx         (chat view)
web/components/messaging/conversation-list.tsx
web/components/messaging/chat-window.tsx
web/components/messaging/message-bubble.tsx
web/components/messaging/message-composer.tsx
```

**Bonus**: Add Supabase Realtime for live updates

---

#### 7. Staff Calendar View 🟡
**Effort**: 20-30 hours | **Impact**: High

**What exists**:
- Appointments in database
- Staff schedules schema

**What's needed**:
```
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid

web/app/[clinic]/dashboard/schedule/page.tsx           (enhance existing)
web/components/scheduling/calendar-view.tsx
web/components/scheduling/appointment-modal.tsx
```

---

#### 8. Appointment Status Workflow 🟡
**Effort**: 8-12 hours | **Impact**: High

**What exists**:
- Status field in appointments
- Basic appointment cards

**What's needed**:
- Status progression buttons (Pending → Confirmed → Checked In → In Progress → Completed)
- Visual status indicators
- Status change logging

---

## Phase 3: New Functionality

Features requiring both API and UI work.

### Week 6-10

#### 9. Payment Processing (Stripe) 🔴
**Effort**: 30-40 hours | **Impact**: Critical

**Components**:
```
web/lib/stripe.ts                                      (Stripe client)
web/app/api/payments/create-intent/route.ts
web/app/api/payments/webhook/route.ts
web/components/payments/checkout-form.tsx
web/components/payments/payment-methods.tsx
```

**Environment Variables**:
```
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

#### 10. Hospitalization Workflow 🟡
**Effort**: 40-50 hours | **Impact**: Medium

**Database**: Complete (23_schema_hospitalization.sql)

**What's needed**:
```
web/app/api/hospitalizations/*
web/app/[clinic]/dashboard/hospital/page.tsx           (kennel grid)
web/app/[clinic]/dashboard/hospital/[id]/page.tsx      (patient care)
web/components/hospital/kennel-grid.tsx
web/components/hospital/treatment-sheet.tsx
web/components/hospital/vitals-chart.tsx
```

---

#### 11. Lab Results Management 🟡
**Effort**: 30-40 hours | **Impact**: Medium

**Database**: Complete (24_schema_lab_results.sql)

**What's needed**:
```
web/app/api/lab-orders/*
web/app/api/lab-results/*
web/app/[clinic]/dashboard/lab/page.tsx
web/components/lab/order-form.tsx
web/components/lab/result-entry.tsx
web/components/lab/result-viewer.tsx
```

---

#### 12. Client Directory (CRM) 🟡
**Effort**: 20-30 hours | **Impact**: High

**What's needed**:
```
web/app/[clinic]/dashboard/clients/page.tsx
web/app/[clinic]/dashboard/clients/[id]/page.tsx
web/components/clients/client-list.tsx
web/components/clients/client-profile.tsx
web/components/clients/client-notes.tsx
```

---

## Phase 4: Advanced Features

Lower priority but valuable additions.

### Week 11-16

#### 13. Staff Scheduling UI 🟡
**Effort**: 30-40 hours

**Database**: Complete (26_schema_staff.sql)

**Scope**:
- Staff schedule management
- Time-off requests
- Shift assignments
- Availability calendar

---

#### 14. Consent Management 🟡
**Effort**: 25-35 hours

**Database**: Complete (25_schema_consent.sql)

**Scope**:
- Template creation
- Digital signature capture
- Consent tracking
- PDF generation

---

#### 15. Insurance Claims 🟢
**Effort**: 40-50 hours

**Database**: Complete (28_schema_insurance.sql)

**Scope**:
- Policy management
- Claim submission
- Status tracking
- EOB handling

---

## Quick Reference: Effort Estimates

| Feature | Effort | Dependencies | Priority |
|---------|--------|--------------|----------|
| Password reset UI | 4-6h | None | 🔴 |
| Edit pet page | 4-6h | None | 🔴 |
| Appointment cancel | 2-4h | None | 🔴 |
| Real-time slots | 8-12h | None | 🔴 |
| Invoice UI | 16-24h | API exists | 🔴 |
| Messaging UI | 16-20h | API exists | 🟡 |
| Staff calendar | 20-30h | Library install | 🟡 |
| Status workflow | 8-12h | None | 🟡 |
| Stripe integration | 30-40h | Stripe account | 🔴 |
| Hospitalization UI | 40-50h | Schema exists | 🟡 |
| Lab results UI | 30-40h | Schema exists | 🟡 |
| Client CRM | 20-30h | None | 🟡 |
| Staff scheduling | 30-40h | Schema exists | 🟡 |
| Consent management | 25-35h | Schema exists | 🟡 |
| Insurance claims | 40-50h | Schema exists | 🟢 |

---

## Recommended Sprint Plan

### Sprint 1 (2 weeks): Critical Fixes
- Password reset UI ✓
- Edit pet page ✓
- Appointment cancellation ✓
- Real-time availability ✓

### Sprint 2 (2 weeks): Invoicing
- Invoice list page
- Invoice creation form
- Payment recording
- PDF generation integration

### Sprint 3 (2 weeks): Communication
- Messaging UI
- Notification center
- Real-time updates

### Sprint 4 (2 weeks): Staff Tools
- Calendar view
- Status workflow
- Check-in process

### Sprint 5 (2 weeks): Payments
- Stripe integration
- Checkout flow
- Webhook handling

### Sprint 6+ (ongoing): Extended Features
- Hospitalization
- Lab results
- Insurance
- Mobile optimization

---

## Dependencies Map

```
Password Reset ─────────────────────► User Auth Complete
                                          │
Edit Pet ───────────────────────────────► Pet Management Complete
                                          │
Real-time Slots ──► Staff Scheduling ──► Calendar View
                                          │
Invoice UI ─────────────────────────────► Stripe Integration
                                          │
Messaging UI ───► Notification Center ─► Push Notifications
                                          │
Hospitalization ─► Treatment Sheets ───► Lab Integration
```

---

## Resource Allocation Suggestion

For a solo developer:
- Focus on Phase 1 first (2 weeks)
- Phase 2 features in parallel when possible
- Avoid Phase 3+ until core complete

For a small team (2-3 developers):
- One developer on Phase 1
- One on invoicing
- Third on messaging/calendar

For agency/larger team:
- Parallel development of all Phase 1-2
- Dedicated mobile/PWA track
- Separate analytics/monitoring track
