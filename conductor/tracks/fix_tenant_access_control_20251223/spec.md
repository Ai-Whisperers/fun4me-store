# Specification: Fix Tenant Access Control

## 1. Overview
This track addresses a critical security vulnerability identified in the codebase where tenant data isolation is not fully enforced. The objective is to implement strict tenant membership validation at both the middleware and data access layers to prevent any possibility of cross-tenant data access.

## 2. Functional Requirements
1.  **Middleware Hardening:** Refactor `middleware.ts` to rigorously enforce that a logged-in user's `tenant_id` matches the tenant they are attempting to access on every request. Unauthorized requests must be blocked.
2.  **Data Access Audit:** Conduct a full audit of every function in the codebase that queries the database to identify any missing tenant isolation checks.
3.  **Data Access Refactoring:** Refactor all identified data access functions to ensure they explicitly include a `WHERE` clause that filters by `tenant_id`, preventing data leakage.
4.  **Integration Testing:** Create a new suite of integration tests (Vitest) that directly call data access functions with mismatched `tenant_id`s and assert that they correctly return no data or throw an authorization error.
5.  **E2E Testing:** Create a new suite of End-to-End tests (Playwright) that simulate a logged-in user from "Tenant A" attempting to access URLs and fetch data belonging to "Tenant B". These tests must assert that access is denied at every level.

## 3. Non-Functional Requirements
*   The fix must be secure and robust, with no known bypasses.
*   The changes should not negatively impact application performance for authorized users.

## 4. Acceptance Criteria
1.  New Playwright E2E tests demonstrating that cross-tenant data access is blocked are created and passing.
2.  New Vitest integration tests demonstrating that data access functions enforce tenant isolation are created and passing.
3.  A manual security audit confirms that a logged-in user cannot access another tenant's data by any means (e.g., URL manipulation, API calls).
4.  All code changes are reviewed and approved by at least one other developer before merging.
