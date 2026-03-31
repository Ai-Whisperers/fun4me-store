# Specification: Implement API Mocking

## 1. Overview
To create faster, more reliable, and deterministic tests, this track will introduce Mock Service Worker (MSW) into the project's testing ecosystem. The goal is to establish a robust API mocking foundation for both Vitest (unit/integration) and Playwright (E2E) tests by implementing mock handlers for one complete user flow.

## 2. Functional Requirements
1.  **Setup & Integration:** Install and configure MSW to intercept network requests within both the Vitest and Playwright test environments.
2.  **Mock Handler Implementation:** Identify a critical, multi-step user flow (e.g., the appointment booking flow). Create a comprehensive set of MSW request handlers that mock all API endpoints involved in this flow. The handlers should cover success, error, and edge-case responses.
3.  **Vitest Refactoring:** Identify and refactor existing Vitest tests related to the chosen user flow, removing any dependencies on a live API and replacing them with MSW mocks.
4.  **Playwright Refactoring:** Identify and refactor existing Playwright E2E tests for the chosen user flow, configuring them to use the MSW handlers to ensure consistent test runs without depending on a live backend state.

## 3. Non-Functional Requirements
*   The mocking solution should not significantly slow down test execution.
*   The mock handlers should be well-organized and easy to maintain or extend for future tests.

## 4. Acceptance Criteria
1.  MSW is successfully installed and configured to run for both the Vitest and Playwright test suites.
2.  A full suite of mock handlers for an entire user flow (e.g., appointment booking) has been created.
3.  Relevant Vitest tests for the chosen flow have been successfully refactored to use the MSW handlers.
4.  Relevant Playwright E2E tests for the chosen flow have been successfully refactored to use the MSW handlers.
5.  All refactored tests pass reliably.

## 5. Out of Scope
*   Mocking every API endpoint in the application is not in scope. This track focuses on establishing the pattern with one complete flow.
*   Replacing other forms of test setup (e.g., database seeding for certain integration tests) unless made redundant by MSW for the chosen flow.
