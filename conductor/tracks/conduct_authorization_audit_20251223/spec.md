# Specification: Authorization Audit - Foundation & Authentication Module

## 1. Overview
This is the foundational track for a comprehensive, test-driven audit of the application's authorization logic. Its purpose is to establish the audit process and apply it to the most critical feature module: Authentication. This will ensure all auth-related endpoints are secure and create a repeatable pattern for auditing subsequent modules.

## 2. Functional Requirements
1.  **Endpoint Discovery:** Perform an automated scan to generate a master checklist of all API routes and server actions in the application.
2.  **Process Definition:** Document the "Test-Driven Audit" process in a new guide (`testing/authorization-audit-guide.md`), explaining how to add new authorization tests.
3.  **Authentication Module Audit:**
    *   From the master checklist, identify all endpoints related to the Authentication module (e.g., changing passwords, updating user profiles, any admin-only user management functions).
    *   For each identified endpoint, write a new integration test (Vitest) that attempts to access it with an unauthorized role (e.g., a guest trying to update a profile, a standard user trying to access an admin function).
    *   Each test must assert that the endpoint correctly returns a `403 Forbidden` or similar authorization error.
4.  **Fix Deficiencies:** If any test reveals an authorization flaw, fix the endpoint's logic to correctly enforce permissions until the test passes.

## 3. Acceptance Criteria
1.  A master checklist of all application endpoints exists.
2.  An `authorization-audit-guide.md` document is created.
3.  A comprehensive suite of authorization tests for all endpoints in the Authentication module is created and passing.
4.  All identified authorization vulnerabilities within the Authentication module are fixed.
