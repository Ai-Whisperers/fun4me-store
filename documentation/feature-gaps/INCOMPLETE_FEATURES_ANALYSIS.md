# Vetic - Incomplete Features Analysis & Development Tickets

> **Generated**: December 2024
> **Total API Routes**: 88
> **Total Pages**: 100+
> **Analysis Focus**: Features with partial implementation that need completion

---

## Executive Summary

After comprehensive codebase analysis, I've identified **15 major feature areas** that are partially implemented. These range from completely stubbed features (no UI) to features with UI but missing backend integration or vice versa.

### Priority Levels

- **P0 (Critical)**: Core functionality, security issues, data integrity
- **P1 (High)**: Revenue-impacting, user-facing features
- **P2 (Medium)**: Nice-to-have, efficiency improvements
- **P3 (Low)**: Polish, edge cases

---

## TICKET-001: Automated Reminder System (P1)

### Current State

- **Database**: `reminders`, `reminder_templates` tables exist
- **API**: Only used in `api/dashboard/vaccines/route.ts` for vaccine reminders
- **UI**: `portal/settings/notifications/page.tsx` shows preferences but doesn't save
- **Automation**: NO automated sending - reminders are created but never dispatched

### Files Involved

```
web/app/api/dashboard/vaccines/route.ts      # Only creates reminders
web/app/[clinic]/portal/settings/notifications/page.tsx  # UI only
web/db/26_schema_messaging.sql               # Schema exists
```

### What's Missing

1. **Cron job/scheduled function** to process `reminders` table
2. **Reminder dispatch service** (email, SMS, WhatsApp, push)
3. **Reminder preferences API** - save user notification settings
4. **Admin UI** to manage reminder templates
5. **Reminder history/status tracking**

### Acceptance Criteria

- [ ] Vaccine reminders auto-send 7 days before due date
- [ ] Appointment reminders send 24h and 1h before
- [ ] Users can toggle reminder types in settings
- [ ] Admins can customize reminder templates
- [ ] Failed reminders retry with exponential backoff

### Estimated Effort: 3-5 days

---

## TICKET-002: SMS Delivery Integration (P1)

### Current State

- **TODO in code**: `api/consents/requests/route.ts:191` - "TODO: Implement SMS delivery"
- **Database**: `notification_queue.channel_type` supports 'sms'
- **UI**: SMS option visible but non-functional

### Files Involved

```
web/app/api/consents/requests/route.ts:191   # TODO comment
web/lib/notifications/                        # Missing SMS provider
```

### What's Missing

1. **SMS provider integration** (Twilio, Vonage, or local Tigo/Personal API)
2. **SMS sending service** with template support
3. **Phone number validation** for Paraguay format
4. **SMS delivery status tracking**
5. **Cost tracking** for SMS usage

### Acceptance Criteria

- [ ] SMS sends for consent requests when selected
- [ ] Phone numbers validated (+595 format)
- [ ] Delivery status tracked (sent, delivered, failed)
- [ ] Admin can see SMS costs per month

### Estimated Effort: 2-3 days

---

## TICKET-003: Invoice PDF Generation (P1)

### Current State

- **TODO in code**: `components/portal/invoice-actions.tsx:15` - "TODO: Implement PDF generation"
- **Existing PDF**: Prescription PDF works (`components/prescription/prescription-pdf.tsx`)
- **UI**: "Download PDF" button exists but doesn't work

### Files Involved

```
web/components/portal/invoice-actions.tsx:15  # TODO placeholder
web/components/prescription/prescription-pdf.tsx  # Working example
web/app/api/invoices/[id]/route.ts           # Has invoice data
```

### What's Missing

1. **InvoicePDF component** using `@react-pdf/renderer`
2. **API route** to generate and stream PDF
3. **Clinic branding** on invoice (logo, address)
4. **Legal requirements** for Paraguay invoices

### Acceptance Criteria

- [ ] PDF generates with clinic logo and info
- [ ] Line items, taxes, totals properly formatted
- [ ] Client and pet information included
- [ ] Download works from invoice list and detail pages
- [ ] PDF can be emailed directly

### Estimated Effort: 1-2 days

---

## TICKET-004: WhatsApp Stats & Analytics (P2)

### Current State

- **UI shows**: "Enviados Hoy: -" and "Fallidos: -" (hardcoded dashes)
- **Database**: `whatsapp_messages` table exists with status tracking
- **Missing**: Aggregation queries for stats

### Files Involved

```
web/app/[clinic]/dashboard/whatsapp/page.tsx:93-100  # Shows "-" placeholders
web/app/api/whatsapp/route.ts                        # Missing stats endpoint
```

### What's Missing

1. **Stats aggregation** from `whatsapp_messages` table
2. **Daily/weekly/monthly** message counts
3. **Failed message retry mechanism**
4. **Delivery rate metrics**

### Acceptance Criteria

- [ ] Dashboard shows real sent count for today
- [ ] Failed messages count with retry option
- [ ] Weekly chart of message volume
- [ ] Delivery success rate percentage

### Estimated Effort: 1 day

---

## TICKET-005: Email Sending for Consents (P2)

### Current State

- **TODO in code**: `dashboard/consents/[id]/page.tsx:205` - "TODO: Implement email sending"
- **Button exists**: "Enviar por Email" visible but non-functional
- **Email service**: Resend configured but not connected here

### Files Involved

```
web/app/[clinic]/dashboard/consents/[id]/page.tsx:205  # TODO
web/lib/email/                                          # Email service exists
```

### What's Missing

1. **Email action** for consent documents
2. **PDF attachment** of signed consent
3. **Email template** for consent delivery
4. **Sent status tracking**

### Acceptance Criteria

- [ ] Email sends with consent PDF attached
- [ ] Client receives professional email
- [ ] Sent status shown in UI
- [ ] Can resend if needed

### Estimated Effort: 0.5-1 day

---

## TICKET-006: Product Prescription Verification (P2)

### Current State

- **TODO in code**: `api/store/orders/route.ts:161` - "TODO: Verify user has valid prescription for this product"
- **Schema**: Products can be marked `requires_prescription`
- **UI**: No enforcement

### Files Involved

```
web/app/api/store/orders/route.ts:161,179  # TODOs
web/db/store_products                       # has requires_prescription field
```

### What's Missing

1. **Prescription check** during checkout
2. **Link to valid prescription** in system
3. **Block/warn** for unprescribed medications
4. **Admin override** option

### Acceptance Criteria

- [ ] Products marked `requires_prescription` checked at checkout
- [ ] User must have valid prescription for that product type
- [ ] Clear error message if prescription missing/expired
- [ ] Staff can override with reason logged

### Estimated Effort: 1 day

---

## TICKET-007: Store Order Variant Names (P2)

### Current State

- **TODO in code**: `api/store/orders/route.ts:179` - "variant_name: null, // TODO: Get variant name if variant_id provided"
- **Impact**: Order history shows null for variant names

### Files Involved

```
web/app/api/store/orders/route.ts:179  # TODO
```

### What's Missing

1. **Join to product_variants** table to get name
2. **Display variant** in order confirmation
3. **Display variant** in order history

### Acceptance Criteria

- [ ] Variant name saved with order item
- [ ] Order confirmation shows "Product - Variant"
- [ ] Order history displays variant info

### Estimated Effort: 0.5 day

---

## TICKET-008: Lost Pet Management System (P2)

### Current State

- **Database**: `lost_pets` table exists
- **Action**: `reportFoundPet()` in `actions/safety.ts` works
- **QR Scan**: Can report found pet via QR
- **Missing**: Admin dashboard to manage lost/found pets

### Files Involved

```
web/app/actions/safety.ts                    # Has reportFoundPet
web/db/lost_pets table                       # Exists
web/app/[clinic]/dashboard/???              # NO lost pets page
```

### What's Missing

1. **Dashboard page** to view lost pet reports
2. **Mark as reunited** functionality
3. **Contact finder** action
4. **Lost pet alert** to owner
5. **Public lost pet board** (optional)

### Acceptance Criteria

- [ ] Dashboard shows all lost/found pet reports
- [ ] Staff can contact finder
- [ ] Mark as "reunited" with date
- [ ] Owner notified when pet found
- [ ] Report history kept for audit

### Estimated Effort: 2 days

---

## TICKET-009: Disease Outbreak Reporting (P2)

### Current State

- **Database**: `disease_reports` table exists
- **API**: `api/epidemiology/heatmap/route.ts` can fetch data
- **UI**: `portal/epidemiology/page.tsx` shows heatmap
- **Missing**: Way to CREATE disease reports

### Files Involved

```
web/app/api/epidemiology/heatmap/route.ts   # GET only
web/app/[clinic]/portal/epidemiology/       # View only
```

### What's Missing

1. **Create disease report** from diagnosis
2. **Auto-suggest** when certain diagnosis codes entered
3. **Trend analysis** over time
4. **Export** for health authorities
5. **Alert system** for outbreak detection

### Acceptance Criteria

- [ ] Vets can report disease from patient record
- [ ] System suggests reporting for notifiable diseases
- [ ] Admin can see trend analysis
- [ ] Export data in standard format
- [ ] Alert when cluster detected

### Estimated Effort: 2-3 days

---

## TICKET-010: Message Attachments (P2)

### Current State

- **UI**: `portal/messages/[id]/page.tsx:494` - "Próximamente: adjuntar archivos"
- **Database**: `message_attachments` table exists
- **Button disabled**: Attachment icon visible but disabled

### Files Involved

```
web/app/[clinic]/portal/messages/[id]/page.tsx:494  # Disabled
web/db/message_attachments                           # Table exists
```

### What's Missing

1. **File upload** to Supabase Storage
2. **Attachment display** in message thread
3. **File type validation** (images, PDFs)
4. **Size limits** enforcement

### Acceptance Criteria

- [ ] Users can attach images to messages
- [ ] PDFs can be attached
- [ ] Attachments display inline
- [ ] File size limited to 10MB
- [ ] Secure storage with signed URLs

### Estimated Effort: 1-2 days

---

## TICKET-011: Staff Time-Off Types Management (P2)

### Current State

- **Database**: `staff_time_off_types` table exists
- **API**: `api/staff/time-off/types/route.ts` exists
- **UI**: Hard-coded types in forms, no admin management

### Files Involved

```
web/app/api/staff/time-off/types/route.ts   # API exists
web/app/[clinic]/dashboard/time-off/        # Uses hardcoded types
```

### What's Missing

1. **Admin UI** to manage time-off types
2. **Paid/unpaid** configuration
3. **Annual allowance** per type
4. **Balance tracking** per staff member

### Acceptance Criteria

- [ ] Admin can add/edit time-off types
- [ ] Configure paid vs unpaid
- [ ] Set annual allowance days
- [ ] Track used vs remaining days

### Estimated Effort: 1-2 days

---

## TICKET-012: Loyalty Points Redemption (P2)

### Current State

- **Database**: `loyalty_points`, `loyalty_transactions` tables exist
- **API**: `api/loyalty_points/route.ts` - GET and POST work
- **Page**: `[clinic]/loyalty_points/page.tsx` shows balance
- **Missing**: Redemption flow, admin configuration

### Files Involved

```
web/app/api/loyalty_points/route.ts          # Basic CRUD
web/app/[clinic]/loyalty_points/page.tsx     # View only
```

### What's Missing

1. **Redemption catalog** - what points can buy
2. **Apply points** at checkout
3. **Admin configure** earn rates
4. **Points expiry** handling
5. **Tier system** (bronze, silver, gold)

### Acceptance Criteria

- [ ] Users can see available rewards
- [ ] Points applied at checkout
- [ ] Admin sets earn rate per Gs spent
- [ ] Points expire after 12 months warning
- [ ] Transaction history shows all activity

### Estimated Effort: 2-3 days

---

## TICKET-013: Consent Template Versioning (P2)

### Current State

- **Database**: `consent_template_versions` table exists
- **UI**: Templates can be created/edited
- **Missing**: Version history, rollback, comparison

### Files Involved

```
web/app/[clinic]/dashboard/consents/templates/page.tsx
web/db/consent_template_versions                      # Table exists
```

### What's Missing

1. **Version history** sidebar in editor
2. **Compare versions** view
3. **Rollback** to previous version
4. **Audit trail** of changes

### Acceptance Criteria

- [ ] Each edit creates new version
- [ ] View history of all versions
- [ ] Compare two versions side-by-side
- [ ] Rollback to any previous version
- [ ] See who made each change

### Estimated Effort: 1-2 days

---

## TICKET-014: Hospitalization Billing Integration (P1)

### Current State

- **Hospitalization**: Full module with vitals, treatments, feedings
- **Kennels**: Daily rates defined in `kennels.daily_rate`
- **Missing**: No invoice generation from hospitalization

### Files Involved

```
web/app/[clinic]/dashboard/hospital/[id]/page.tsx    # Patient view
web/app/api/hospitalizations/                         # CRUD exists
web/app/api/invoices/                                 # Invoice API exists
```

### What's Missing

1. **Generate invoice** from hospitalization
2. **Calculate total** (days × daily_rate + treatments)
3. **Itemized billing** (kennel, meds, procedures)
4. **Partial billing** during long stays

### Acceptance Criteria

- [ ] "Generate Invoice" button on hospitalization
- [ ] Auto-calculate kennel days × rate
- [ ] Include all medications given
- [ ] Include all treatments/procedures
- [ ] Support partial invoicing

### Estimated Effort: 2 days

---

## TICKET-015: Lab Results Notification (P2)

### Current State

- **Lab module**: Full order → results workflow
- **Database**: `lab_results` with `is_abnormal` flag
- **Missing**: Notification when results ready

### Files Involved

```
web/app/api/lab-orders/[id]/results/route.ts   # Results entry
web/app/[clinic]/dashboard/lab/[id]/page.tsx   # Results view
```

### What's Missing

1. **Notify owner** when results complete
2. **Alert vet** for critical values
3. **Email results** option
4. **Push notification** for mobile

### Acceptance Criteria

- [ ] Owner gets notification when results ready
- [ ] Vet alerted immediately for critical values
- [ ] "Email Results" button works
- [ ] Notification links to results page

### Estimated Effort: 1 day

---

## Summary Priority Matrix

| Priority | Ticket | Feature                   | Effort    |
| -------- | ------ | ------------------------- | --------- |
| P1       | 001    | Automated Reminders       | 3-5 days  |
| P1       | 002    | SMS Integration           | 2-3 days  |
| P1       | 003    | Invoice PDF               | 1-2 days  |
| P1       | 014    | Hospitalization Billing   | 2 days    |
| P2       | 004    | WhatsApp Stats            | 1 day     |
| P2       | 005    | Consent Email             | 0.5-1 day |
| P2       | 006    | Prescription Verification | 1 day     |
| P2       | 007    | Order Variant Names       | 0.5 day   |
| P2       | 008    | Lost Pet Management       | 2 days    |
| P2       | 009    | Disease Reporting         | 2-3 days  |
| P2       | 010    | Message Attachments       | 1-2 days  |
| P2       | 011    | Time-Off Types            | 1-2 days  |
| P2       | 012    | Loyalty Redemption        | 2-3 days  |
| P2       | 013    | Consent Versioning        | 1-2 days  |
| P2       | 015    | Lab Results Notification  | 1 day     |

**Total Estimated Effort**: 22-33 days

---

## Additional Observations

### Features with Good Implementation

These are feature-complete or near-complete:

- Appointment booking system
- Pet profile management
- Vaccine tracking with PDF
- Medical records
- Prescription generation
- Drug dosage calculator
- Diagnosis codes search
- Growth charts
- E-commerce store (basic)
- Invoice CRUD (except PDF)
- Hospitalization monitoring
- Lab orders workflow
- Consent documents
- Staff scheduling

### Configuration Flags Not Used

In `config.json`, these module flags exist but have limited effect:

- `modules.toxic_checker` - Works
- `modules.age_calculator` - Works
- Missing flags for: hospitalization, lab, insurance, loyalty

### Database Tables with No/Limited UI

- `vaccine_reactions` - API exists, UI minimal
- `reproductive_cycles` - API exists, UI exists
- `insurance_*` - Full UI exists
- `staff_time_off_types` - API exists, no admin UI
- `message_templates` - API exists, basic UI

---

## Recommended Sprint Plan

### Sprint 1 (Week 1-2): Revenue Critical

- TICKET-003: Invoice PDF
- TICKET-014: Hospitalization Billing
- TICKET-001: Automated Reminders (start)

### Sprint 2 (Week 3-4): Communication

- TICKET-001: Automated Reminders (complete)
- TICKET-002: SMS Integration
- TICKET-005: Consent Email
- TICKET-015: Lab Results Notification

### Sprint 3 (Week 5-6): E-Commerce & Safety

- TICKET-006: Prescription Verification
- TICKET-007: Order Variant Names
- TICKET-012: Loyalty Redemption
- TICKET-008: Lost Pet Management

### Sprint 4 (Week 7-8): Polish & Admin

- TICKET-004: WhatsApp Stats
- TICKET-010: Message Attachments
- TICKET-011: Time-Off Types
- TICKET-013: Consent Versioning
- TICKET-009: Disease Reporting

---

_Document generated by codebase analysis. Update as features are completed._
