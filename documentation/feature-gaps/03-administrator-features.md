# Administrator (Clinic Owner/Manager) Feature Gaps

This document details missing features from the perspective of clinic administrators who manage the business operations, settings, staff, and financials.

> **December 2024 Update**: A comprehensive code audit revealed that many features listed here as "missing" have been partially or fully implemented. Key implementations include:
> - Full invoicing API (create, read, update, delete, payments, refunds)
> - Services catalog API
> - Inventory management with WAC calculation
> - Expense tracking
> - Loyalty points system
> - Dashboard components (stats, charts, alerts)
> - Campaign management page (stub)
> - Epidemiology page (stub)
>
> Review each section against actual code before implementation.

---

## 1. Clinic Configuration & Settings

### Current State
- Basic tenant configuration in database
- Theme settings via JSON files
- Limited UI for configuration

### Missing Features

#### 1.1 Clinic Profile Management 🔴 CRITICAL
**User Story**: As an admin, I want to update my clinic's profile information.

**Requirements**:
- Edit clinic name, address, phone
- Update business hours
- Upload logo and banner images
- Social media links
- Description/about text
- Update contact email

**File**: `web/app/[clinic]/dashboard/settings/profile/page.tsx` (create)

---

#### 1.2 Theme Customization UI 🟡 HIGH
**User Story**: As an admin, I want to customize my clinic's website colors without editing JSON.

**Requirements**:
- Color picker for primary/secondary colors
- Font selection
- Logo upload
- Preview before saving
- Reset to defaults option

**Current**: Theme defined in `.content_data/[clinic]/theme.json`
**Needed**: Admin UI to edit theme

---

#### 1.3 Service Catalog Management 🔴 CRITICAL
**User Story**: As an admin, I want to manage the services my clinic offers.

**Requirements**:
- Add/edit/delete services
- Set prices per service
- Set duration per service
- Group by category
- Enable/disable services
- Service descriptions

**Database**: `services` table exists (created in 21_schema_invoicing.sql)
**API**: `/api/services` exists
**File**: `web/app/[clinic]/dashboard/settings/services/page.tsx` (create)

---

#### 1.4 Business Hours Configuration 🟡 HIGH
**User Story**: As an admin, I want to set my clinic's operating hours.

**Requirements**:
- Hours for each day of week
- Special hours for holidays
- Temporary closures
- Affects appointment availability

---

#### 1.5 Appointment Settings 🟡 HIGH
**User Story**: As an admin, I want to configure how appointments work.

**Requirements**:
- Slot duration (15/30/60 min)
- Buffer time between appointments
- Maximum advance booking days
- Cancellation policy (hours required)
- Overbooking limits
- Confirmation requirements

---

#### 1.6 Notification Settings 🟡 HIGH
**User Story**: As an admin, I want to configure what notifications my clinic sends.

**Requirements**:
- Enable/disable notification types
- Customize message templates
- Set reminder timing (24h, 2h before)
- Choose channels (email, SMS, WhatsApp)
- Test notification sending

**Database**: `notification_templates` table exists

---

## 2. Staff Management

### Current State
- Profiles table has role field
- No staff management UI

### Missing Features

#### 2.1 Staff Directory 🔴 CRITICAL
**User Story**: As an admin, I want to see and manage all staff members.

**Requirements**:
- List all staff with roles
- Add new staff member
- Edit staff details
- Deactivate staff accounts
- View activity history

**File**: `web/app/[clinic]/dashboard/staff/page.tsx` (create)

---

#### 2.2 Staff Invitation System 🔴 CRITICAL
**User Story**: As an admin, I want to invite new staff to join my clinic.

**Requirements**:
- Send email invitation
- Set initial role (vet, admin, receptionist)
- Invitation expiration
- Resend invitation
- Track pending invitations

**Database**: `clinic_invites` table exists

---

#### 2.3 Role & Permission Management 🟡 HIGH
**User Story**: As an admin, I want to control what each staff member can do.

**Requirements**:
- Define custom roles
- Permission presets (vet, technician, receptionist, admin)
- Granular permissions:
  - View patients
  - Edit medical records
  - Manage appointments
  - Process payments
  - View reports
  - Manage staff
  - Access settings

---

#### 2.4 Staff Schedule Management 🟡 HIGH
**User Story**: As an admin, I want to set working hours for each staff member.

**Requirements**:
- Weekly schedule template
- Vacation/time-off tracking
- Shift assignments
- Schedule conflicts detection
- Coverage requirements

**Database**: `staff_schedules`, `staff_shifts`, `time_off_requests` tables exist

---

#### 2.5 Staff Performance Dashboard 🟢 MEDIUM
**User Story**: As an admin, I want to see how my staff is performing.

**Requirements**:
- Appointments completed per vet
- Revenue generated per vet
- Average visit duration
- Client satisfaction scores
- Comparison over time

**Database**: `mv_staff_performance` materialized view exists

---

## 3. Client Management (CRM)

### Current State
- Profiles table stores client info
- No dedicated CRM interface

### Missing Features

#### 3.1 Client Directory 🔴 CRITICAL
**User Story**: As an admin, I want to see and search all clients.

**Requirements**:
- List all clients
- Search by name, email, phone
- Filter by status (active, inactive)
- View client details
- Quick actions (call, email, SMS)

**File**: `web/app/[clinic]/dashboard/clients/page.tsx` (create)

---

#### 3.2 Client Profile View 🟡 HIGH
**User Story**: As an admin, I want to see complete client information.

**Requirements**:
- Contact information
- All pets owned
- Appointment history
- Invoice/payment history
- Communication history
- Notes/flags
- Loyalty points balance

---

#### 3.3 Client Notes & Tags 🟡 HIGH
**User Story**: As an admin, I want to add notes and tags to client records.

**Requirements**:
- Internal notes (staff only)
- Tags (VIP, Payment issues, etc.)
- Note history with timestamps
- Search by tags

---

#### 3.4 Outstanding Balances 🔴 CRITICAL
**User Story**: As an admin, I want to see which clients owe money.

**Requirements**:
- List of unpaid invoices
- Sort by amount, age
- Send payment reminders
- Payment plan tracking
- Write-off functionality

---

#### 3.5 Client Communication History 🟡 HIGH
**User Story**: As an admin, I want to see all communications with a client.

**Requirements**:
- Email history
- SMS history
- In-app messages
- Appointment reminders sent
- Timeline view

---

## 4. Financial Management

### Current State
- Invoice schema complete
- Expense tracking exists
- No comprehensive finance UI

### Missing Features

#### 4.1 Invoice Management Dashboard 🔴 CRITICAL
**User Story**: As an admin, I want to manage all invoices from one place.

**Requirements**:
- List all invoices
- Filter by status (draft, sent, paid, overdue)
- Search by client, pet, invoice number
- Quick actions (send, mark paid, void)
- Batch operations

**API**: `/api/invoices` complete
**File**: `web/app/[clinic]/dashboard/invoices/page.tsx` (create)

---

#### 4.2 Invoice Creation UI 🔴 CRITICAL
**User Story**: As an admin, I want to create invoices for services.

**Requirements**:
- Select client and pet
- Add line items (services, products)
- Apply discounts
- Add notes
- Set due date
- Preview before sending

---

#### 4.3 Payment Recording 🔴 CRITICAL
**User Story**: As an admin, I want to record payments received.

**Requirements**:
- Multiple payment methods
- Partial payments
- Payment reference tracking
- Receipt generation
- Payment allocation to invoices

**API**: `/api/invoices/[id]/payments` exists

---

#### 4.4 Refund Processing 🟡 HIGH
**User Story**: As an admin, I want to process refunds when needed.

**Requirements**:
- Refund full or partial
- Require reason
- Approval workflow
- Update invoice status
- Accounting trail

**API**: `/api/invoices/[id]/refund` exists

---

#### 4.5 Revenue Reports 🟡 HIGH
**User Story**: As an admin, I want to see revenue reports.

**Requirements**:
- Daily/weekly/monthly revenue
- Revenue by service category
- Revenue by staff member
- Comparison to previous periods
- Export to CSV/PDF

**Dashboard Component**: `revenue-chart.tsx` exists

---

#### 4.6 Expense Management 🟡 HIGH
**User Story**: As an admin, I want to track clinic expenses.

**Requirements**:
- Log expenses by category
- Receipt upload
- Recurring expenses
- Budget tracking
- Profit/loss view

**Current**: Basic expense form exists

---

#### 4.7 Payment Gateway Integration 🔴 CRITICAL
**User Story**: As an admin, I want to accept online payments.

**Requirements**:
- Stripe integration
- Credit/debit cards
- Payment links
- Automatic invoice updates
- Refund processing

---

#### 4.8 Tax Configuration 🟡 HIGH
**User Story**: As an admin, I want to configure tax rates.

**Requirements**:
- Default tax rate
- Tax exemptions
- Tax-inclusive pricing option
- Tax reports for filing

---

## 5. Inventory Management

### Current State
- Store products/inventory schema exists
- Basic inventory API
- No management UI

### Missing Features

#### 5.1 Product Catalog Management 🟡 HIGH
**User Story**: As an admin, I want to manage products sold at my clinic.

**Requirements**:
- Add/edit/delete products
- Set prices and costs
- Track stock levels
- Low stock alerts
- Product categories
- Product images

**File**: `web/app/[clinic]/dashboard/inventory/page.tsx` (create)

---

#### 5.2 Stock Management 🟡 HIGH
**User Story**: As an admin, I want to track inventory levels.

**Requirements**:
- Current stock per product
- Stock adjustments (receiving, waste, corrections)
- Stock history
- Multiple locations (if applicable)

---

#### 5.3 Purchase Order Management 🟢 MEDIUM
**User Story**: As an admin, I want to create purchase orders for supplies.

**Requirements**:
- Create POs to suppliers
- Track PO status
- Receive against PO
- Backorder handling

---

#### 5.4 Inventory Alerts 🟡 HIGH
**User Story**: As an admin, I want to be alerted about inventory issues.

**Requirements**:
- Low stock notifications
- Expiring product alerts
- Reorder point suggestions
- Dashboard widget

**Component**: `inventory-alerts.tsx` exists

---

#### 5.5 Inventory Reports 🟢 MEDIUM
**User Story**: As an admin, I want inventory reports.

**Requirements**:
- Stock valuation
- Movement reports
- Slow-moving items
- Expiration tracking
- Cost analysis

---

## 6. Reporting & Analytics

### Current State
- Basic dashboard stats
- Materialized views for performance
- Limited analytics UI

### Missing Features

#### 6.1 Dashboard Customization 🟢 MEDIUM
**User Story**: As an admin, I want to customize my dashboard.

**Requirements**:
- Choose which widgets to display
- Arrange widget positions
- Set default date ranges
- Save layout preferences

---

#### 6.2 Appointment Reports 🟡 HIGH
**User Story**: As an admin, I want detailed appointment analytics.

**Requirements**:
- Appointments by type
- No-show rates
- Cancellation rates
- Peak hours analysis
- Staff utilization

**Materialized View**: `mv_appointment_analytics` exists

---

#### 6.3 Client Analytics 🟡 HIGH
**User Story**: As an admin, I want to understand my client base.

**Requirements**:
- New vs returning clients
- Client retention rates
- Average spend per client
- Client lifetime value
- Geographic distribution

**Materialized View**: `mv_client_retention` exists

---

#### 6.4 Service Popularity 🟢 MEDIUM
**User Story**: As an admin, I want to know which services are most popular.

**Requirements**:
- Top services by revenue
- Top services by count
- Trend over time
- Comparison by period

**Materialized View**: `mv_service_popularity` exists

---

#### 6.5 Export & Scheduled Reports 🟢 MEDIUM
**User Story**: As an admin, I want to export reports and schedule automatic delivery.

**Requirements**:
- Export to PDF, CSV, Excel
- Email scheduled reports
- Daily/weekly/monthly options
- Custom report builder

---

## 7. Marketing & Communications

### Current State
- Messaging system backend complete
- No campaign management UI

### Missing Features

#### 7.1 Broadcast Campaigns 🟡 HIGH
**User Story**: As an admin, I want to send messages to all/selected clients.

**Requirements**:
- Create campaign
- Select recipients (all, by pet type, by last visit)
- Schedule send time
- Track open/click rates
- Unsubscribe handling

**Database**: `broadcast_campaigns`, `broadcast_recipients` tables exist

---

#### 7.2 Message Templates 🟡 HIGH
**User Story**: As an admin, I want to manage message templates.

**Requirements**:
- Create/edit templates
- Variable placeholders ({{pet_name}}, {{client_name}})
- Preview with sample data
- Templates by category (reminders, promotions)

**API**: `/api/messages/templates` exists

---

#### 7.3 Automated Messaging Rules 🟢 MEDIUM
**User Story**: As an admin, I want to set up automated messages.

**Requirements**:
- Birthday messages
- Post-visit follow-ups
- Inactive client outreach
- Vaccine reminders (configured)
- Custom triggers

**Database**: `auto_reply_rules` table exists

---

#### 7.4 Promotions & Discounts 🟢 MEDIUM
**User Story**: As an admin, I want to create promotional offers.

**Requirements**:
- Discount codes
- Percentage or fixed discounts
- Expiration dates
- Usage limits
- Track redemptions

---

## 8. Loyalty Program Management

### Current State
- Loyalty points tracking exists
- Basic redemption in cart

### Missing Features

#### 8.1 Loyalty Program Configuration 🟡 HIGH
**User Story**: As an admin, I want to configure my loyalty program.

**Requirements**:
- Points per currency spent
- Points for specific actions (referral, review)
- Expiration rules
- Tier levels

---

#### 8.2 Rewards Catalog 🟡 HIGH
**User Story**: As an admin, I want to define what rewards clients can redeem.

**Requirements**:
- Create reward items
- Points required per reward
- Stock/availability
- Redemption process

---

#### 8.3 Loyalty Reports 🟢 MEDIUM
**User Story**: As an admin, I want to see loyalty program performance.

**Requirements**:
- Points issued vs redeemed
- Top point earners
- Redemption patterns
- Program ROI

---

## 9. Compliance & Audit

### Current State
- Audit log schema exists
- Basic audit logging implemented

### Missing Features

#### 9.1 Audit Log Viewer 🟡 HIGH
**User Story**: As an admin, I want to see who did what in the system.

**Requirements**:
- Searchable audit log
- Filter by user, action, date
- Export for compliance
- Detail view per entry

**Database**: `audit_log_enhanced`, `audit_logs` tables exist

---

#### 9.2 Data Export (GDPR) 🟡 HIGH
**User Story**: As an admin, I want to export client data upon request.

**Requirements**:
- Export all data for a client
- Include pets, records, communications
- Secure delivery
- Log the request

---

#### 9.3 Data Deletion (GDPR) 🟡 HIGH
**User Story**: As an admin, I want to delete client data upon request.

**Requirements**:
- Anonymize or delete client data
- Cascade to related records
- Maintain audit trail
- Confirmation workflow

---

#### 9.4 Consent Management 🟡 HIGH
**User Story**: As an admin, I want to track client consents.

**Requirements**:
- Required consent types
- Consent collection
- Consent withdrawal
- Consent history

**Database**: `consent_templates`, `consent_documents` tables exist

---

## 10. Integrations

### Current State
- No third-party integrations

### Missing Features

#### 10.1 Accounting Integration 🟢 MEDIUM
**User Story**: As an admin, I want to sync with accounting software.

**Requirements**:
- QuickBooks integration
- Xero integration
- Automatic invoice sync
- Payment reconciliation

---

#### 10.2 Lab Integration 🟢 MEDIUM
**User Story**: As an admin, I want to receive lab results automatically.

**Requirements**:
- IDEXX integration
- Antech integration
- Auto-import results
- Result notifications

**Database**: `external_lab_integrations` table exists

---

#### 10.3 Calendar Sync 🟢 MEDIUM
**User Story**: As an admin, I want staff calendars synced with external calendars.

**Requirements**:
- Google Calendar sync
- Outlook sync
- Two-way sync option

---

## 11. Security & Access

### Current State
- Basic role-based access
- RLS policies on tables

### Missing Features

#### 11.1 Two-Factor Authentication 🟡 HIGH
**User Story**: As an admin, I want to require 2FA for staff.

**Requirements**:
- Enable 2FA for accounts
- Support TOTP apps
- Backup codes
- Enforce for sensitive roles

---

#### 11.2 Session Management 🟡 HIGH
**User Story**: As an admin, I want to manage active sessions.

**Requirements**:
- View active sessions
- Force logout remotely
- Session timeout settings
- Last login tracking

---

#### 11.3 IP Restrictions 🟢 MEDIUM
**User Story**: As an admin, I want to restrict access by IP.

**Requirements**:
- Whitelist IP addresses
- Country blocking
- Alert on unknown IP access

---

## Implementation Checklist

### Phase 1: Critical (Must Have)
- [ ] Clinic profile management
- [ ] Service catalog management
- [ ] Staff directory
- [ ] Staff invitation system
- [ ] Client directory
- [ ] Outstanding balances view
- [ ] Invoice management dashboard
- [ ] Invoice creation UI
- [ ] Payment recording
- [ ] Payment gateway integration

### Phase 2: High Priority
- [ ] Theme customization UI
- [ ] Business hours configuration
- [ ] Appointment settings
- [ ] Notification settings
- [ ] Role & permission management
- [ ] Staff schedule management
- [ ] Client profile view
- [ ] Client notes & tags
- [ ] Client communication history
- [ ] Refund processing
- [ ] Revenue reports
- [ ] Expense management
- [ ] Product catalog management
- [ ] Stock management
- [ ] Appointment reports
- [ ] Client analytics
- [ ] Broadcast campaigns
- [ ] Message templates
- [ ] Loyalty program configuration
- [ ] Rewards catalog
- [ ] Audit log viewer
- [ ] GDPR compliance tools
- [ ] Two-factor authentication
- [ ] Session management

### Phase 3: Medium Priority
- [ ] Staff performance dashboard
- [ ] Tax configuration
- [ ] Purchase orders
- [ ] Inventory alerts
- [ ] Inventory reports
- [ ] Dashboard customization
- [ ] Service popularity
- [ ] Export & scheduled reports
- [ ] Automated messaging rules
- [ ] Promotions & discounts
- [ ] Loyalty reports
- [ ] Accounting integration
- [ ] Lab integration
- [ ] Calendar sync
- [ ] IP restrictions
