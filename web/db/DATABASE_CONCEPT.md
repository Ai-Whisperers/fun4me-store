# Vete Database - Conceptual Overview

This document explains the complete data model for the Vete veterinary platform. It describes **what we want to represent**, **why each piece exists**, and **how everything connects** to form a complete picture of a multi-tenant veterinary clinic management system.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Multi-Tenancy: The Foundation](#multi-tenancy-the-foundation)
3. [Users and Authentication](#users-and-authentication)
4. [Pet Management](#pet-management)
5. [Clinical Operations](#clinical-operations)
6. [Scheduling and Appointments](#scheduling-and-appointments)
7. [Financial Management](#financial-management)
8. [E-Commerce and Inventory](#e-commerce-and-inventory)
9. [Communications](#communications)
10. [Insurance Management](#insurance-management)
11. [Staff Management](#staff-management)
12. [Procurement Management](#procurement-management)
13. [System and Audit](#system-and-audit)
14. [Security Model](#security-model)
15. [Data Relationships Summary](#data-relationships-summary)

---

## The Big Picture

Vete is a **Software-as-a-Service (SaaS) platform** that allows multiple veterinary clinics to operate from a single codebase and database. Each clinic (called a "tenant") has complete isolation of their data while sharing the same infrastructure.

The platform manages the complete lifecycle of veterinary care:

- **Pet owners** register their pets, book appointments, view medical history, and communicate with the clinic
- **Veterinarians** diagnose patients, prescribe treatments, manage hospitalizations, and track clinical data
- **Clinic administrators** manage staff, finances, inventory, and overall operations

Every piece of data in the system belongs to a specific clinic, and the database enforces strict separation to ensure clinics never see each other's information.

---

## Multi-Tenancy: The Foundation

### What is a Tenant?

A **tenant** represents a single veterinary clinic or practice. It's the top-level organizational unit that owns all data in the system.

Each tenant has:

- A unique identifier (slug) like "terrapet" or "petlife"
- Business information (name, address, contact details)
- Branding settings (stored separately in JSON files, not in the database)
- Configuration for which features are enabled

### Why Multi-Tenancy?

Instead of deploying separate applications for each clinic, we use a single database where every table includes a reference to which tenant owns that record. This approach:

- Reduces infrastructure costs
- Simplifies maintenance and updates
- Allows clinics to share common reference data
- Enables network-level features (like finding affiliated clinics)

### The Tenant Isolation Rule

**Every single table in the database** (except for global reference data) includes a `tenant_id` column. This is the cornerstone of our security model - queries automatically filter data to show only records belonging to the user's clinic.

---

## Users and Authentication

### User Profiles

Every person who interacts with the system has a **profile**. The profile connects their authentication identity (managed by Supabase Auth) to their role and permissions within a specific clinic.

A profile contains:

- Personal information (name, email, phone, avatar)
- The clinic they belong to
- Their role (owner, vet, or admin)
- Contact preferences and communication settings

### User Roles

The system has three distinct roles:

**Pet Owners (role: "owner")**

- Can register and manage their own pets
- Book and manage appointments
- View medical records and prescriptions for their pets
- Communicate with the clinic staff
- Access the pet owner portal

**Veterinarians (role: "vet")**

- Can access all patient records within their clinic
- Create medical records, prescriptions, and lab orders
- Manage hospitalizations and treatments
- Use clinical tools (dosage calculators, diagnosis lookup)
- Cannot access financial or administrative settings

**Administrators (role: "admin")**

- Have all veterinarian permissions
- Manage staff and their schedules
- Access financial reports and invoicing
- Configure clinic settings
- Manage inventory and store

### The Invite System

Users don't create accounts directly. Instead, a clinic administrator sends an **invitation** to their email. The invite:

- Specifies which clinic the person will join
- Assigns their initial role
- Has an expiration date for security
- Can only be used once

When someone signs up, the system checks for a pending invite and automatically assigns them to the correct clinic with the correct role. This prevents unauthorized access and ensures proper onboarding.

---

## Pet Management

### Pet Records

The **pet** is the central entity around which most clinical data revolves. Each pet belongs to one owner but exists within a specific clinic's tenant.

Pet information includes:

- Basic identification (name, species, breed, color, sex)
- Physical characteristics (weight, microchip number)
- Birth information (exact date or estimated age)
- Photos (stored as URLs to cloud storage)
- Special notes (allergies, behavioral issues, dietary restrictions)
- Status tracking (active, deceased, transferred)

### Why Pets Belong to Both Owners and Tenants

A pet must reference both its owner and the tenant because:

- The owner might have pets at multiple clinics
- If an owner moves clinics, historical data stays with the original clinic
- Security policies need both relationships to work correctly

### Vaccines and Immunization

The vaccination system tracks:

- Which vaccines a pet has received
- When they were administered and by whom
- When the next dose is due
- The vaccine batch number (for recall tracking)
- Current status (scheduled, administered, overdue, waived)

Vaccines have specific medical reasons to skip them (like illness or owner refusal), and the system tracks these exceptions.

### Vaccine Reactions

If a pet has an adverse reaction to a vaccine, this critical information is recorded:

- Which vaccine caused the reaction
- The type and severity of reaction
- When symptoms appeared after vaccination
- What treatment was given
- Whether this vaccine should be avoided in the future

This information follows the pet forever and appears as warnings during future vaccination appointments.

---

## Clinical Operations

### Reference Data: The Clinical Knowledge Base

The system maintains standardized clinical reference data that helps veterinarians work efficiently:

**Diagnosis Codes**
A catalog of veterinary diagnoses based on the VeNom (Veterinary Nomenclature) coding system. Each diagnosis has:

- A unique code (like "GI-101")
- A descriptive name
- The body system it affects
- Which species it applies to
- Common symptoms and treatments

**Drug Dosages**
Pre-calculated dosage information for common veterinary medications:

- Drug name and class
- Species-specific dosing (mg per kg)
- Administration route (oral, injection, topical)
- Frequency and duration guidelines
- Warnings and contraindications

**Growth Standards**
Expected weight ranges for different species and breeds at various ages:

- Weight percentiles (P5, P25, P50, P75, P95)
- Used to generate growth charts
- Helps identify underweight or overweight pets

### Medical Records

Every clinical encounter creates a **medical record**. This is the core documentation of veterinary care.

A medical record captures:

- The reason for the visit (chief complaint)
- Physical examination findings (vital signs, observations)
- The veterinarian's assessment and diagnosis
- The treatment plan
- Any procedures performed
- Follow-up instructions

Medical records are **immutable** - once created, they cannot be deleted (only corrected with addendum records). This maintains the legal integrity of the medical history.

### Prescriptions

When a veterinarian prescribes medication, the system creates a formal prescription that:

- Lists all medications with dosage instructions
- Has a validity period (after which refills require a new consultation)
- Can be digitally signed
- Generates a PDF for the owner
- Links to the medical record that justified the prescription

### Quality of Life Assessments

For chronically ill or aging pets, the system supports structured quality of life evaluations using the HHHHHMM scale:

- Hurt (pain level)
- Hunger (appetite)
- Hydration
- Hygiene
- Happiness
- Mobility
- More good days than bad

These assessments help owners and veterinarians make difficult end-of-life decisions with objective criteria.

### Reproductive Tracking

For breeders and intact pets, the system tracks reproductive cycles:

- Heat cycles with dates
- Breeding events
- Pregnancy detection and expected due dates
- Whelping/queening records
- Spay/neuter procedures

---

## Hospitalization

When pets need to stay at the clinic for extended care, the hospitalization module manages their entire stay.

### Kennels

The clinic's physical housing is modeled as **kennels**:

- Each kennel has a name, size, and type (recovery, isolation, ICU)
- Daily rate for billing
- Current occupancy status
- Location within the facility

### Hospitalizations

When a pet is admitted, a hospitalization record tracks:

- Admission date and reason
- Assigned kennel
- Attending veterinarian
- Acuity level (how critical the patient is)
- Target discharge date
- Daily treatment plans

### Monitoring During Hospitalization

Throughout the stay, staff record:

**Vital Signs**

- Temperature, heart rate, respiratory rate
- Blood pressure, oxygen saturation
- Pain score assessments
- Recorded at regular intervals

**Medications**

- Each dose administered
- Who gave it and when
- Any reactions or issues

**Feeding**

- Food type and amount
- Whether the pet ate
- Any vomiting or appetite issues

### Discharge

When the pet goes home, the system captures:

- Discharge date and time
- Condition at discharge
- Take-home instructions
- Medications to continue
- Follow-up appointment scheduling

---

## Laboratory Services

### Lab Test Catalog

The clinic maintains a catalog of available laboratory tests:

- Test name and code
- Sample type required (blood, urine, tissue)
- Normal reference ranges by species
- Turn-around time
- Cost for billing

Tests can be grouped into **panels** (like a "Senior Wellness Panel" that includes multiple individual tests).

### Lab Orders

When a veterinarian needs diagnostics, they create a lab order:

- Which pet the samples are from
- Which tests to perform
- Clinical notes for the lab
- Urgency level
- The ordering veterinarian

### Lab Results

When results come back, each test value is recorded with:

- The measured value and units
- Whether it's within normal range
- Flags for abnormal values (high, low, critical)
- The date results were available

Results can include attachments (microscopy images, full reports) and interpretive comments from the reviewing veterinarian.

---

## Scheduling and Appointments

### Services

Each clinic defines the **services** they offer:

- Service name and description
- Category (consultation, surgery, grooming, etc.)
- Duration (how long to block on the calendar)
- Base price
- Which staff can perform it
- Whether it's bookable online

### Appointments

The appointment is the core scheduling unit:

- When (start and end time)
- Who (which pet, which owner, which veterinarian)
- What (which service)
- Status tracking through its lifecycle

### Appointment Lifecycle

An appointment moves through states:

1. **Scheduled** - Booked but not yet confirmed
2. **Confirmed** - Owner has confirmed attendance
3. **Checked In** - Owner has arrived at the clinic
4. **In Progress** - Currently being seen
5. **Completed** - Visit finished
6. **Cancelled** - Appointment was cancelled
7. **No Show** - Owner didn't arrive

### Preventing Double-Booking

The system enforces rules to prevent scheduling conflicts:

- A veterinarian cannot have overlapping appointments
- A room/resource cannot be double-booked
- Buffer time can be required between appointments

---

## Financial Management

### Invoicing

The invoicing system tracks all financial transactions between the clinic and clients.

**Invoice Structure**
An invoice contains:

- Client information
- Invoice number (auto-generated sequentially)
- Status (draft, sent, partially paid, paid, overdue, cancelled)
- Due date
- Line items for services, products, and custom charges

**Line Items**
Each line on an invoice represents:

- What was provided (service, product, or custom charge)
- Quantity and unit price
- Any applicable discount
- Tax calculation
- Reference to the source (appointment, prescription, etc.)

### Payments

Payments are recorded separately from invoices because:

- An invoice can have multiple partial payments
- A payment might cover multiple invoices
- Different payment methods need tracking

Payment records include:

- Amount received
- Payment method (cash, card, transfer, etc.)
- Reference number
- Who received the payment

### Refunds

When money needs to be returned:

- The original payment is referenced
- Reason is documented
- Approval workflow can be required
- Amount is tracked against the payment

### Expenses

Clinic expenses (supplies, rent, utilities) are tracked separately:

- Expense category
- Amount and date
- Vendor information
- Receipt/proof attachment
- Approval status

### Loyalty Program

To encourage repeat business:

- Points are earned on purchases
- Points can be redeemed for discounts
- Transaction history shows all point activity
- Balance is maintained per client

---

## E-Commerce and Inventory

### Product Catalog

The clinic's store maintains products for sale:

- Product name, description, and images
- SKU (stock keeping unit) for tracking
- Categories for organization
- Pricing (base price, sale price)
- Active/inactive status

### Categories

Products are organized into hierarchical categories:

- Parent categories (Food, Medications, Accessories)
- Child categories (Dry Food, Wet Food under Food)
- Each category has a URL-friendly slug

### Inventory Management

Stock is tracked in real-time:

- Current quantity on hand
- Reorder point (when to purchase more)
- Reorder quantity (how much to order)
- Weighted average cost (for margin calculations)
- Low stock alerts

### Orders

When customers purchase online:

- Order captures all items and quantities
- Shipping address for delivery orders
- Order status progression (pending, confirmed, shipped, delivered)
- Payment linkage

### Promotions

The store supports marketing campaigns:

- Percentage or fixed amount discounts
- Valid date ranges
- Minimum purchase requirements
- Usage limits

### Coupons

Promotional codes that customers can enter:

- Unique code
- Discount type and value
- Maximum uses (total and per customer)
- Expiration date

### Reviews

Customers can review products:

- Star rating (1-5)
- Written review text
- Moderation status
- Helpful/not helpful voting

---

## Communications

### Conversations

All communication between clinic and clients happens through **conversations**:

- One conversation per client-pet-channel combination
- Channels include in-app messaging, SMS, WhatsApp, email
- Status tracking (open, pending response, resolved, closed)
- Assignment to specific staff members
- Priority levels for urgent matters

### Messages

Each conversation contains messages:

- Sender identification (client, staff, system, or automated bot)
- Message type (text, image, file, rich cards)
- Delivery status tracking
- Read receipts
- Reply threading

**Rich Message Types**
Messages can include structured content:

- Appointment cards (showing booking details)
- Invoice cards (showing amount due)
- Prescription cards (showing medication summary)

### Message Templates

Pre-written messages for common scenarios:

- Appointment confirmations and reminders
- Vaccine reminders
- Invoice notifications
- Welcome messages
- Custom clinic templates

Templates support variable substitution (pet name, appointment date, etc.) and can be approved for specific channels.

### Reminders

Scheduled notifications that go out automatically:

- Vaccine due reminders
- Appointment reminders (24 hours before)
- Payment due notices
- Birthday greetings
- Custom follow-ups

The reminder system tracks:

- Scheduled send time
- Delivery attempts
- Success or failure status
- Retry logic for failed sends

### Communication Preferences

Each user can set their preferences:

- Which channels they want to receive (SMS, email, WhatsApp, push)
- Quiet hours (no notifications during sleep)
- Types of communications to receive (medical, marketing, reminders)
- Unsubscribe options

---

## Insurance Management

### Insurance Providers

A directory of pet insurance companies:

- Company name and contact information
- Claims submission details
- Active/inactive status

### Policies

When a pet is insured, their policy is recorded:

- Policy and group numbers
- Coverage type and limits
- Deductible and copay percentages
- Effective dates
- Contact information for claims

### Claims

When submitting insurance claims:

- Claim type (treatment, surgery, medication, etc.)
- Amount being claimed
- Service date and documentation
- Approval status tracking
- Payment receipt when reimbursed

Claims reference the related invoice and medical records to support the submission.

### Pre-Authorization

For expensive procedures, pre-approval may be needed:

- Procedure description and estimated cost
- Submission to insurance
- Approval status and amount
- Authorization code for claim submission
- Expiration date

---

## Staff Management

### Staff Profiles

Extended information for clinic employees:

- Professional license number and expiration
- Specializations (surgery, dentistry, etc.)
- Education and credentials
- Employment type (full-time, part-time, contractor)
- Compensation rates
- Digital signature for documents

### Schedules

Each staff member has defined working hours:

- Day of week
- Start and end times
- Break periods
- Effective date ranges

Schedules can have multiple versions (summer hours vs. winter hours).

### Time Off

Managing absences:

- Request submission with dates
- Type of time off (vacation, sick, personal)
- Approval workflow
- Impact on appointment availability

---

## Procurement Management

### Suppliers

The clinic maintains relationships with suppliers for restocking inventory:

- Supplier name and contact information
- Payment terms and credit limits
- Lead time for deliveries
- Active/inactive status
- Rating/performance metrics

**Supplier Types**:
- Distributors (pharmaceuticals, medical supplies)
- Manufacturers (direct purchase)
- Local vendors (food, consumables)

### Purchase Orders

When inventory needs replenishment:

- Purchase order number (auto-generated)
- Selected supplier
- Order date and expected delivery
- Line items with products and quantities
- Status tracking (draft, sent, acknowledged, shipped, received, cancelled)
- Total amount and payment terms

### Purchase Order Items

Each line item on a purchase order:

- Product reference (links to store_products)
- Quantity ordered
- Unit cost (negotiated price)
- Quantity received (may differ from ordered)
- Quality status (accepted, rejected, partial)

### Goods Receipt

When products arrive:

- Receiving date and time
- Purchase order reference
- Received by (staff member)
- Inspection notes
- Discrepancy handling (damaged, short, over)

The goods receipt process:
1. Match received items against purchase order
2. Update inventory quantities
3. Recalculate weighted average cost
4. Flag discrepancies for resolution
5. Generate supplier payment obligations

### Supplier Payments

Tracking what's owed to suppliers:

- Invoice number from supplier
- Amount due and due date
- Payment status
- Payment method and date
- Reconciliation with purchase orders

---

## System and Audit

### Audit Logs

Every significant action is logged for accountability:

- Who performed the action
- What action was taken
- Which record was affected
- Before and after values
- Timestamp and context (IP address, session)

Audit logs are **append-only** - they cannot be modified or deleted, ensuring a complete history.

### Notifications

In-app notifications keep users informed:

- Different types (appointment reminder, message received, payment due)
- Priority levels
- Read/unread status
- Action links for quick response

### QR Tags

Physical QR code tags for pet identification:

- Unique code printed on the tag
- Assignment to specific pets
- Scan tracking (when and where scanned)
- Theft prevention (tracks reassignment history)

When someone scans a lost pet's tag, they can contact the owner through the system.

### Lost Pet Reports

When a pet goes missing:

- Last known location with coordinates
- Description and photos
- Contact information for finders
- Status progression (lost → found → reunited)
- Public sharing for community help

### Disease Surveillance

For public health monitoring:

- Anonymous disease case reporting
- Geographic clustering by zone
- Species and diagnosis tracking
- Outbreak detection alerts
- Notifiable disease flagging for authorities

This data helps identify emerging health threats without exposing individual pet information.

---

## Security Model

### Row-Level Security (RLS)

Every table uses PostgreSQL's Row-Level Security to enforce access control at the database level:

**Tenant Isolation**

- Users can only see data from their own clinic
- Every query is automatically filtered by tenant_id
- Even SQL injection attacks cannot access other tenants' data

**Role-Based Access**

- Staff (vets and admins) can see all clinic data
- Owners can only see their own pets and related records
- Admins have additional permissions for management functions

### Security Functions

Helper functions enforce authorization:

**is_staff_of(tenant_id)**
Returns true if the current user is a vet or admin at the specified clinic.

**is_owner_of_pet(pet_id)**
Returns true if the current user owns the specified pet.

These functions are used in RLS policies to create readable, maintainable security rules.

### Soft Deletes

Most records are never truly deleted:

- A `deleted_at` timestamp marks records as inactive
- A `deleted_by` reference tracks who deleted it
- Queries automatically exclude deleted records
- Records can be restored if deleted by mistake
- Full audit trail is maintained

### Data Protection

- Medical records are immutable
- Audit logs cannot be modified
- Critical columns (role, tenant) are protected from user modification
- Sequential numbers (invoice numbers) prevent gaps

---

## Data Relationships Summary

### Core Entity Relationships

```
Tenant (Clinic)
├── Profiles (Users)
│   ├── Pet Owners → own → Pets
│   ├── Veterinarians → treat → Pets
│   └── Administrators → manage → Everything
├── Pets
│   ├── Vaccines
│   ├── Medical Records
│   ├── Prescriptions
│   ├── Lab Orders → Lab Results
│   ├── Hospitalizations → Vitals, Medications, Feedings
│   ├── Insurance Policies → Claims
│   └── QR Tags
├── Services
│   └── Appointments (link Pets, Staff, Services)
├── Products
│   ├── Inventory
│   └── Orders → Order Items
├── Invoices
│   ├── Line Items
│   └── Payments → Refunds
├── Conversations
│   └── Messages
└── Staff Management
    ├── Staff Profiles
    ├── Schedules → Schedule Entries
    └── Time Off Requests
```

### Key Cross-References

- **Appointments** link pets, owners, staff, and services together
- **Invoices** can reference appointments, prescriptions, or products
- **Medical records** can link to lab orders, prescriptions, and hospitalizations
- **Insurance claims** reference invoices and medical records
- **Messages** can embed appointment, invoice, or prescription cards

---

## Why This Design?

### Scalability

- Multi-tenant architecture allows unlimited clinics
- Indexed queries ensure performance at scale
- BRIN indexes optimize time-series data

### Auditability

- Complete history of all changes
- Immutable medical records
- Soft deletes preserve data integrity

### Flexibility

- JSONB columns for schema-flexible data
- Configurable features per tenant
- Extensible reference data catalogs

### Security

- Database-level access control
- No application bugs can leak data
- Defense in depth architecture

---

_This document represents the conceptual foundation of the Vete database. For implementation details, refer to the SQL migration files in this directory._
