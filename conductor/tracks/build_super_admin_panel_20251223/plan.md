# Implementation Plan: Build MVP Super-Admin Panel for Clinic Onboarding

### Phase 1: Security and Routing
- [ ] **Task:** Implement Super-Admin Role & Route
  - [ ] Sub-task: Verify that a `super-admin` role can be assigned to a user in the database.
  - [ ] Sub-task: Update `middleware.ts` to protect a new `/super-admin/**` route path, allowing access only to users with the `super-admin` role.
  - [ ] Sub-task: Write an E2E test that confirms a non-super-admin user cannot access `/super-admin`.
- [ ] **Task:** Create Super-Admin Panel Layout
  - [ ] Sub-task: Create the basic page and layout components for the `/super-admin` section.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 1: Security and Routing' (Protocol in workflow.md)

### Phase 2: Onboarding Form and Logic
- [ ] **Task:** Build the Onboarding Form
  - [ ] Sub-task: Create a new React component for the "Create Clinic" form with fields for Clinic Name, Slug, Admin Email, etc.
  - [ ] Sub-task: Implement client-side validation for the form fields (using Zod, if available).
- [ ] **Task:** Implement the Provisioning Server Action
  - [ ] Sub-task: Create a new Server Action to be called by the form.
  - [ ] Sub-task: The action must first verify again that the caller has the `super-admin` role.
  - [ ] Sub-task: Write the logic to create the new clinic record in the database.
  - [ ] Sub-task: Write the logic to create the new administrator user account, linking them to the new clinic.
  - [ ] Sub-task: Write integration tests for this Server Action's success and failure cases.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 2: Onboarding Form and Logic' (Protocol in workflow.md)

### Phase 3: End-to-End Verification
- [ ] **Task:** Manual End-to-End Test
  - [ ] Sub-task: As a super-admin user in a staging environment, create a new clinic using the form.
  - [ ] Sub-task: Verify in the database that the new clinic and user records were created correctly.
  - [ ] Sub-task: Log out and attempt to log in as the newly created clinic administrator to ensure their account is active.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 3: End-to-End Verification' (Protocol in workflow.md)
