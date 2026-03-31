# Specification: Build MVP Super-Admin Panel for Clinic Onboarding

## 1. Overview
To streamline the onboarding of new clinics, this track focuses on building a Minimum Viable Product (MVP) of a "super-admin" panel. The core functionality will be a secure form that allows a user with a `super-admin` role to create a new clinic tenant in the system, automating the provisioning process.

## 2. Functional Requirements
1.  **Super-Admin Role:** Ensure a `super-admin` role exists and can be assigned to a user, distinct from a regular clinic `admin`.
2.  **Secure Routing:** Create a new, secure section of the application (e.g., at `/super-admin`) accessible only to users with the `super-admin` role. Access by any other user must be blocked at the middleware level.
3.  **Onboarding Form:** Within the super-admin panel, create a simple form that accepts the necessary information for a new clinic (e.g., Clinic Name, Subdomain/Slug, initial Administrator's Email).
4.  **Provisioning Logic:** Create a new Server Action or secure API endpoint that processes the onboarding form. This logic must:
    *   Create the new clinic record in the database.
    *   Create an initial administrator user account associated with the new clinic.
    *   (Potentially) Trigger a background job to seed the new clinic with default data (if a job system is available).
5.  **UI Feedback:** The form must provide clear feedback to the super-admin on the success or failure of the clinic creation process.

## 3. Acceptance Criteria
1.  A user with the `super-admin` role can access the `/super-admin` panel.
2.  Users without the `super-admin` role are redirected or shown a "not authorized" error when attempting to access `/super-admin`.
3.  The super-admin can fill out and submit the onboarding form.
4.  Upon successful submission, a new clinic record and its initial administrator user are correctly created in the database.
5.  The form displays appropriate success or error messages to the user.
