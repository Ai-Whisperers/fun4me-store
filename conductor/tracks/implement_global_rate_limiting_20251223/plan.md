# Implementation Plan: Implement Global API Rate Limiting

### Phase 1: Setup and Authentication Rate Limiting
- [ ] **Task:** Select and Set Up Rate Limiting Provider
  - [ ] Sub-task: Set up an account with a provider compatible with the chosen library (e.g., Upstash Redis).
  - [ ] Sub-task: Install the chosen library (e.g., `@upstash/ratelimit`).
  - [ ] Sub-task: Configure necessary environment variables for the provider connection and define initial rate limits.
- [ ] **Task:** Implement and Test Auth Rate Limiting
  - [ ] Sub-task: Write a Playwright test that repeatedly hits an auth endpoint (e.g., `/api/auth/login`) and asserts it fails with a `429` status after a low, test-specific limit.
  - [ ] Sub-task: Implement the strict rate-limiting logic in `middleware.ts` for all auth-related routes.
  - [ ] Sub-task: Ensure the Playwright test passes.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 1: Setup and Authentication Rate Limiting' (Protocol in workflow.md)

### Phase 2: API and Global Rate Limiting
- [ ] **Task:** Implement and Test General API Rate Limiting
  - [ ] Sub-task: Write a Playwright test for a regular API endpoint (e.g., `/api/clinics`) that asserts a `429` status after its limit is hit.
  - [ ] Sub-task: Implement the general rate-limiting logic in `middleware.ts` for all other `/api/*` routes.
  - [ ] Sub-task: Ensure the Playwright test passes.
- [ ] **Task:** Implement and Test Global Rate Limiting
  - [ ] Sub-task: Write a Playwright test that rapidly reloads a standard page and asserts a `429` status after its limit is hit.
  - [ ] Sub-task: Implement the global failsafe rate-limiting logic in `middleware.ts` for all requests.
  - [ ] Sub-task: Ensure the Playwright test passes.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 2: API and Global Rate Limiting' (Protocol in workflow.md)

### Phase 3: Finalization and Verification
- [ ] **Task:** Refine Configuration and Documentation
  - [ ] Sub-task: Set appropriate, production-level rate limits in the project's environment variable configuration files (e.g., `.env.production`).
  - [ ] Sub-task: Ensure all new environment variables are documented in the environment variable reference file (e.g., `.env.example`).
- [ ] **Task:** Manual Verification
  - [ ] Sub-task: Deploy the changes to a staging environment.
  - [ ] Sub-task: Manually confirm the rate limits are active using browser developer tools or a tool like `curl`.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 3: Finalization and Verification' (Protocol in workflow.md)
