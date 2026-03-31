# Specification: MVP Core Veterinary Platform

## Overview
This track defines the Minimum Viable Product (MVP) for the "Vete" platform, a multi-tenant SaaS veterinary clinic management system. The goal is to establish the foundational architecture for path-based multi-tenancy, a JSON-driven CMS for clinic websites, and core user/staff workflows.

## Functional Requirements

### 1. Path-Based Multi-tenancy
- The system must route requests based on the URL path (e.g., `vete.com/clinic-slug/...`).
- Each clinic's configuration and data must be isolated and accessible via its unique slug.

### 2. JSON-Driven Clinic CMS (Dynamic Landing Page)
- Each clinic landing page must be dynamically rendered based on a JSON configuration.
- Admins can control:
    - Branding (Logo, primary colors, clinic name).
    - Section Visibility: Toggle sections like "Services", "Staff", and "Testimonials".
    - Content Control: Edit text and image URLs for all enabled sections directly in the JSON.

### 3. Patient/Pet Registration & Owner Auth
- **Owner Authentication:** Standard email/password signup/login flow for pet owners.
- **Pet Management:** Authenticated owners can register their pets (Name, Species, Breed) and view their list of pets.

### 4. Appointment Request Workflow
- **Owner Side:** A simple form for authenticated owners to request an appointment for a specific pet.
- **Clinic Dashboard:** A basic interface for staff/veterinarians to:
    - View a list of "Pending" appointment requests.
    - Manually "Confirm" a request or suggest a change (status update).
    - View today's scheduled appointments.

## Non-Functional Requirements
- **Responsive Design:** Landing pages and dashboards must be intuitive on both desktop and mobile.
- **Data Isolation:** Ensure multi-tenant data integrity at the database/query level.

## Acceptance Criteria
- [ ] Navigating to a clinic-specific path loads that clinic's unique content.
- [ ] Updating a clinic's JSON config immediately reflects changes on its landing page.
- [ ] A pet owner can sign up, log in, and register a pet.
- [ ] An appointment request submitted by an owner appears in the staff dashboard.
- [ ] Staff can change the status of a pending appointment to "Confirmed".

## Out of Scope
- Instant calendar booking (automated slot management).
- Billing and invoicing modules.
- Multi-location oversight.
- Email/SMS notifications (placeholders only).
