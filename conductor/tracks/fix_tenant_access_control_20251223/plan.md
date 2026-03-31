# Implementation Plan: Fix Tenant Access Control

### Phase 1: Middleware Hardening & Testing
- [ ] **Task:** Develop Cross-Tenant E2E Test
  - [ ] Sub-task: Set up a test scenario with at least two separate tenants and one user belonging to each.
  - [ ] Sub-task: Write a Playwright test where a user from Tenant A logs in and attempts to access a protected dashboard URL for Tenant B.
  - [ ] Sub-task: Assert that the test fails with a "not found" or "unauthorized" error, indicating the middleware is blocking access.
- [ ] **Task:** Harden `middleware.ts`
  - [ ] Sub-task: Refactor the middleware logic to strictly enforce that the user's `tenant_id` from their session matches the `clinic` (tenant) slug from the URL parameters on every request.
  - [ ] Sub-task: Ensure the new logic correctly blocks unauthorized access and makes the new E2E test pass.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 1: Middleware Hardening & Testing' (Protocol in workflow.md)

### Phase 2: Data Access Layer Audit & Refactoring
- [ ] **Task:** Audit Data Access Functions
  - [ ] Sub-task: Scan the entire codebase (`web/` directory) for all functions that use the Supabase client to query the database.
  - [ ] Sub-task: Create a checklist of all functions that need to be refactored to enforce tenant ID checks.
- [ ] **Task:** Develop Cross-Tenant Integration Tests
  - [ ] Sub-task: For a critical data access function (e.g., `getAppointments`), write a Vitest integration test that calls it with a valid user but an incorrect `tenant_id`.
  - [ ] Sub-task: Assert that the test fails because the function returns no data or throws an error.
- [ ] **Task:** Refactor Data Access Functions
  - [ ] Sub-task: Go through the checklist and refactor each data access function to require a non-optional `tenant_id` parameter and use it in the `WHERE` clause of the query.
  - [ ] Sub-task: Ensure all refactored functions pass their new integration tests and that existing tests are updated as needed.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 2: Data Access Layer Audit & Refactoring' (Protocol in workflow.md)

### Phase 3: Final Verification and Review
- [ ] **Task:** Manual Security Audit
  - [ ] Sub-task: Manually perform the steps outlined in the E2E test to confirm the fix works in a real browser environment.
  - [ ] Sub-task: Attempt to call API endpoints for Tenant B while authenticated as a user from Tenant A using developer tools.
- [ ] **Task:** Code Review
  - [ ] Sub-task: Create a Pull Request with all the changes from this track.
  - [ ] Sub-task: Ensure the PR is reviewed and approved by at least one other developer, specifically checking the security logic.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 3: Final Verification and Review' (Protocol in workflow.md)
