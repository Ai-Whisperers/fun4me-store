# Plan: MVP Core Veterinary Platform

This plan outlines the implementation of the core multi-tenant SaaS veterinary platform.

## Phase 1: Multi-tenant Foundation (Path-based Routing)
- [ ] Task: Define Tenant Context and Database Schema for Clinics
    - [ ] Sub-task: Write migrations for `clinics` table (slug, name, config_json)
    - [ ] Sub-task: Implement tenant lookup logic by path slug
- [ ] Task: Implement Middleware for Tenant Identification
    - [ ] Sub-task: Write tests for path-based tenant detection
    - [ ] Sub-task: Implement Next.js middleware to extract tenant from path
- [ ] Task: Conductor - User Manual Verification 'Multi-tenant Foundation' (Protocol in workflow.md)

## Phase 2: JSON CMS & Dynamic Landing Page
- [ ] Task: Implement Dynamic CMS Content Loading
    - [ ] Sub-task: Write tests for loading configuration from JSON
    - [ ] Sub-task: Create service to fetch clinic configuration by slug
- [ ] Task: Build Dynamic Clinic Landing Page
    - [ ] Sub-task: Create responsive landing page layout that respects branding colors
    - [ ] Sub-task: Implement conditional rendering for "Services", "Staff", and "Testimonials" sections
- [ ] Task: Conductor - User Manual Verification 'JSON CMS & Dynamic Landing Page' (Protocol in workflow.md)

## Phase 3: Owner Authentication & Pet Registration
- [ ] Task: Implement Pet Owner Authentication
    - [ ] Sub-task: Write tests for owner signup/login (Supabase/Auth.js)
    - [ ] Sub-task: Implement login and registration pages
- [ ] Task: Pet Management Functionality
    - [ ] Sub-task: Write database schema for `pets` table (tenant_id, owner_id, name, etc.)
    - [ ] Sub-task: Write tests for pet registration
    - [ ] Sub-task: Implement "Add Pet" form and "My Pets" dashboard
- [ ] Task: Conductor - User Manual Verification 'Owner Authentication & Pet Registration' (Protocol in workflow.md)

## Phase 4: Appointment Request Workflow
- [ ] Task: Implement Appointment Request Form
    - [ ] Sub-task: Write schema for `appointments` table
    - [ ] Sub-task: Write tests for submitting a request
    - [ ] Sub-task: Implement the request form on the clinic landing page
- [ ] Task: Conductor - User Manual Verification 'Appointment Request Workflow' (Protocol in workflow.md)

## Phase 5: Clinic Staff Dashboard
- [ ] Task: Build Staff Overview Interface
    - [ ] Sub-task: Write tests for fetching pending appointments for a clinic
    - [ ] Sub-task: Implement the dashboard view listing today's and pending appointments
- [ ] Task: Implement Appointment Status Management
    - [ ] Sub-task: Write tests for confirming/updating appointment status
    - [ ] Sub-task: Add "Confirm" actions to the dashboard items
- [ ] Task: Conductor - User Manual Verification 'Clinic Staff Dashboard' (Protocol in workflow.md)
