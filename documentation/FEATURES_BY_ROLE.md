# Comprehensive Feature List per User Role & Screen

**Date:** January 2026
**Based on:** Codebase analysis and Feature Gap documentation.

---

## 1. Pet Owner (Client)

**Primary Interface:** Client Portal (`/[clinic]/portal`) & Public Website
**Key Goal:** Manage pets' health, book appointments, and purchase supplies.

### 1.1 Authentication & Profile

**Screen:** Login / Register / Profile

- **Current Features:**
  - Email/Password login (`/[clinic]/portal/login`)
  - Google OAuth
  - Basic profile management (`/[clinic]/portal/profile`)
  - Logout (`/[clinic]/portal/logout`)
- **Planned / Missing:**
  - Password Reset Flow (Forgot Password link, Email token, Reset form) 🔴 CRITICAL
  - Email Verification (Verify link logic, visual indicator) 🟡 HIGH
  - Social Login Expansion (Facebook, Apple) 🟢 MEDIUM
  - Extended Profile Fields (Address, Secondary phone, Emergency contact) 🟡 HIGH
  - Onboarding Flow (Welcome modal, guided tour) 🟢 MEDIUM

### 1.2 Portal Dashboard

**Screen:** `/[clinic]/portal`

- **Current Features:**
  - List of pets with vaccine cards
  - Upcoming appointments view
- **Planned / Missing:**
  - Notification Center (Bell icon, Unread count, Notification list) 🔴 CRITICAL
  - Quick Actions Widget (Book, Record, Contact buttons) 🟢 MEDIUM
  - Pet Health Summary Cards (Health score, Weight trend) 🟡 HIGH
  - Activity Feed (Timeline of recent events) 🟢 MEDIUM
  - Emergency Contact Display (Clinic phone, 24/7 emergency number) 🔴 CRITICAL

### 1.3 Pet Management

**Screen:** `/[clinic]/portal/pets` & `/[clinic]/portal/pets/[id]`

- **Current Features:**
  - Create new pet (`/pets/new`)
  - Pet Profile view (Medical history, Vaccines, Growth charts)
  - QR Code generation
- **Planned / Missing:**
  - Edit Pet Information (Full edit capabilities for all fields) 🔴 CRITICAL
  - Archive/Delete Pet (Deceased status, archive option) 🟡 HIGH
  - Pet Photo Gallery (Multiple uploads, Before/after) 🟢 MEDIUM
  - Pet Documents Folder (Adoption papers, Insurance docs) 🟢 MEDIUM
  - Pet Insurance Info (Provider, Policy #) 🟡 HIGH
  - Pet Sharing (Invite family members) 🟢 MEDIUM
  - Pet Age detailed display (Years/months + Human age) 🔴 CRITICAL

### 1.4 Vaccine Management

**Screen:** `/[clinic]/portal/pets/[id]/vaccines`

- **Current Features:**
  - View vaccine history (Date, Batch, Status)
  - Add self-reported vaccines
- **Planned / Missing:**
  - Vaccine Reminders (Notification X days before due) 🔴 CRITICAL
  - Vaccine Certificate Download (Official PDF with signature) 🔴 CRITICAL
  - Vaccine History Export (CSV/Excel/PDF) 🟡 HIGH
  - Upcoming Vaccines Calendar 🟡 HIGH

### 1.5 Appointments

**Screen:** `/[clinic]/portal/appointments` & `/[clinic]/book`

- **Current Features:**
  - Booking Wizard (Service selection, Pet selection)
  - Booking Confirmation
  - View upcoming appointments
- **Planned / Missing:**
  - Real-Time Availability (Remove hardcoded slots, check DB) 🔴 CRITICAL
  - Cancellation (Cancel button, Reason, Refund logic) 🔴 CRITICAL
  - Rescheduling (Change date/time flow) 🔴 CRITICAL
  - Appointment History (Past appointments list/filter) 🟡 HIGH
  - Recurring Appointments (Weekly/Monthly) 🟢 MEDIUM
  - Multiple Pets per Appointment 🟡 HIGH
  - Calendar Sync (Add to Google/Outlook) 🟡 HIGH
  - Check-In Feature ("I'm here" button) 🟢 MEDIUM
  - Video Consultation Integration 🟢 MEDIUM

### 1.6 Medical Records

**Screen:** `/[clinic]/portal/pets/[id]/records`

- **Current Features:**
  - Timeline view of records
  - Notes, Diagnosis, Vitals display
  - Prescription history
- **Planned / Missing:**
  - Full History View (Expandable, Searchable, Filterable) 🟡 HIGH
  - Lab Results Viewer (Blood work charts, Normal ranges) 🟡 HIGH
  - Download Complete Medical Record (Comprehensive PDF) 🟡 HIGH
  - Share Records (Link generation for other vets) 🟢 MEDIUM
  - Treatment Progress Tracker 🟢 MEDIUM

### 1.7 Online Store

**Screen:** `/[clinic]/store` & `/[clinic]/cart`

- **Current Features:**
  - Product listing
  - Cart management
  - Loyalty discount application
  - Checkout flow
- **Planned / Missing:**
  - Product Search (Search bar with suggestions) 🔴 CRITICAL
  - Category Filters (Sidebar, Multi-select) 🟡 HIGH
  - Order History (List past orders, Status tracking) 🔴 CRITICAL
  - Wishlist functionality 🟢 MEDIUM
  - Payment Processing (Stripe integration, Credit cards) 🔴 CRITICAL
  - Delivery Options (Address management, Shipping calc) 🟡 HIGH

### 1.8 Communication

**Screen:** `/[clinic]/portal/messages`

- **Current Features:**
  - No active in-app messaging UI currently.
- **Planned / Missing:**
  - In-App Messaging (Chat interface with clinic) 🟡 HIGH
  - Message History 🟡 HIGH
  - Push Notifications 🟢 MEDIUM

---

## 2. Veterinary Staff (Vet/Tech)

**Primary Interface:** Staff Dashboard (`/[clinic]/dashboard`)
**Key Goal:** Manage clinical workflow, patients, and schedule.

### 2.1 Dashboard & Schedule

**Screen:** `/[clinic]/dashboard` & `/[clinic]/dashboard/calendar`

- **Current Features:**
  - Dashboard widgets (Stats, Alerts)
  - Calendar view (Basic)
- **Planned / Missing:**
  - Visual Calendar View (Day/Week/Month, Drag-and-drop) 🔴 CRITICAL
  - Staff Availability Management (Shifts, Breaks) 🟡 HIGH
  - Appointment Status Workflow (Check-in -> In Progress -> Complete) 🔴 CRITICAL
  - Patient Queue / Waiting Room View 🟡 HIGH
  - Multi-Room Management (Assign exams rooms) 🟢 MEDIUM

### 2.2 Patient Management

**Screen:** `/[clinic]/portal/dashboard/patients`

- **Current Features:**
  - Patient Search (Fuzzy matching)
  - Patient Profile (Clinical view)
  - Medical Record Creation (Vitals, Notes)
- **Planned / Missing:**
  - Check-In Workflow (Verify contact info, weight) 🔴 CRITICAL
  - Quick Notes (Floating widget, Auto-save) 🟡 HIGH
  - Photo Documentation (Capture, Annotate, Upload) 🟡 HIGH
  - Body Condition Scoring (Visual selector) 🟡 HIGH
  - Patient Alerts (Aggression, Allergy flags) 🔴 CRITICAL

### 2.3 Clinical Documentation

**Screen:** `/[clinic]/portal/pets/[id]/records/new`

- **Current Features:**
  - Basic record creation
  - Attachments
- **Planned / Missing:**
  - SOAP Note Format (Structured S-O-A-P fields) 🔴 CRITICAL
  - Record Templates (Wellness, Sick, Dental presets) 🟡 HIGH
  - Previous Record Comparison (Side-by-side) 🟢 MEDIUM
  - Record Locking (Auto-lock after 24h) 🟡 HIGH
  - Discharge Instructions Generator 🟡 HIGH

### 2.4 Diagnostics & Lab

**Screen:** `/[clinic]/dashboard/lab`

- **Current Features:**
  - DB Schema exists
  - List lab orders
- **Planned / Missing:**
  - Lab Order Creation (Select test, Link patient) 🟡 HIGH
  - Result Entry (Manual form, CSV import) 🟡 HIGH
  - Result Trending (Charts over time) 🟢 MEDIUM
  - Imaging Viewer (X-ray/Ultrasound view/compare) 🟢 MEDIUM

### 2.5 Surgery

**Screen:** N/A (Currently managed as generic medical record)

- **Current Features:** None specific.
- **Planned / Missing:**
  - Surgery Scheduling (Block OR time, Assign staff) 🟡 HIGH
  - Pre-Op Checklist (Fasting, Consent, Bloodwork) 🟡 HIGH
  - Anesthesia Monitoring Log (Time-based vitals) 🟡 HIGH
  - Surgery Notes Template 🟡 HIGH

### 2.6 Prescriptions (Rx)

**Screen:** `/[clinic]/portal/prescriptions`

- **Current Features:**
  - Create Prescription
  - PDF Generation
  - Drug Dosage Calculator
- **Planned / Missing:**
  - Drug Database Search (Autocomplete, Formulations) 🟡 HIGH
  - Auto-Dosage Calculation (Weight-based integration) 🟡 HIGH
  - Drug Interaction Warnings (Allergy/Meds checks) 🔴 CRITICAL
  - Controlled Substance Logging (DEA compliance) 🟡 HIGH
  - Refill Approval Workflow 🟡 HIGH

### 2.7 In-Visit Billing

**Screen:** In-context of visit

- **Current Features:** Invoice schema exists.
- **Planned / Missing:**
  - Quick Charge Addition (Add service/product to active visit) 🔴 CRITICAL
  - Treatment Estimate Generation (Low/High range, Signature) 🟡 HIGH
  - Service Bundles (Package pricing) 🟢 MEDIUM

---

## 3. Administrator (Owner/Manager)

**Primary Interface:** Admin Dashboard (`/[clinic]/dashboard`)
**Key Goal:** Manage business, staff, finances, and settings.

### 3.1 Clinic Settings

**Screen:** `/[clinic]/dashboard/settings`

- **Current Features:**
  - Basic tenant config in DB
  - Theme JSON files
- **Planned / Missing:**
  - Clinic Profile Management (Edit details, logo) 🔴 CRITICAL
  - Theme Customization UI (Color picker, Fonts) 🟡 HIGH
  - Service Catalog Management (Add/Edit Services, Prices) 🔴 CRITICAL
  - Business Hours Config 🟡 HIGH
  - Notification Rule Config 🟡 HIGH

### 3.2 Staff Management

**Screen:** `/[clinic]/dashboard/staff`

- **Current Features:**
  - Profile roles
  - Schedule view (Basic)
- **Planned / Missing:**
  - Staff Directory (List, Edit, Deactivate) 🔴 CRITICAL
  - Staff Invitation System (Email invite) 🔴 CRITICAL
  - Role & Permission Management (Granular access control) 🟡 HIGH
  - Staff Performance Dashboard (Revenue, Appts per vet) 🟢 MEDIUM

### 3.3 Financial Management

**Screen:** `/[clinic]/dashboard/invoices` & `finance`

- **Current Features:**
  - Invoice List
  - Expense Tracking
  - P&L Report
- **Planned / Missing:**
  - Invoice Management Dashboard (Filter, Batch actions) 🔴 CRITICAL
  - Invoice Creation UI (Manual create) 🔴 CRITICAL
  - Payment Recording (Partial, Multiple methods) 🔴 CRITICAL
  - Refund Processing UI 🟡 HIGH
  - Payment Gateway Integration (Stripe) 🔴 CRITICAL
  - Revenue Reports (Detailed analytics) 🟡 HIGH

### 3.4 Inventory Management

**Screen:** `/[clinic]/portal/inventory`

- **Current Features:**
  - Unified Inventory View
  - Reorder Suggestions
  - Expiring Products view
- **Planned / Missing:**
  - Product Catalog Management (Add/Edit products visually) 🟡 HIGH
  - Stock Adjustment UI (Waste, Corrections) 🟡 HIGH
  - Purchase Order Management 🟢 MEDIUM
  - Detailed Inventory Reports 🟢 MEDIUM

### 3.5 Marketing & CRM

**Screen:** `/[clinic]/dashboard/clients` & `campaigns`

- **Current Features:**
  - Client List
  - Campaign Management (Stub)
- **Planned / Missing:**
  - Client Directory (Search, Filter, Actions) 🔴 CRITICAL
  - Message Broadcast Campaigns (Select recipients, Schedule) 🟡 HIGH
  - Message Templates Editor 🟡 HIGH
  - Loyalty Program Config (Points rules, Rewards) 🟡 HIGH

### 3.6 Compliance

**Screen:** `/[clinic]/portal/admin/audit`

- **Current Features:**
  - Basic Audit Log
  - Consent Templates
- **Planned / Missing:**
  - Enhanced Audit Log Viewer (Search/Filter) 🟡 HIGH
  - GDPR Data Export/Deletion Tools 🟡 HIGH
