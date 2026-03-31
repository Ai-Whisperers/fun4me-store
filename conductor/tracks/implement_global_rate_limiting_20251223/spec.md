# Specification: Implement Global API Rate Limiting

## 1. Overview
To protect the application from abuse, brute-force attacks, and denial-of-service, this track will implement a global, middleware-based rate limiting solution. The implementation will use a modern library compatible with Vercel's Edge runtime (e.g., `@upstash/ratelimit`) and will employ a layered strategy for comprehensive protection.

## 2. Functional Requirements
1.  **Library Integration:** Research, select, and integrate a Vercel Edge-compatible rate-limiting library (e.g., `@upstash/ratelimit` with a provider like Upstash Redis) into `middleware.ts`.
2.  **Layered Policy Implementation:** Implement the following rate-limiting policies in the middleware, identifiable by IP address or user ID:
    *   **Authentication Limit:** A strict limit for all authentication-related API endpoints (e.g., `/api/auth/*`).
    *   **General API Limit:** A general-purpose limit for all other API routes (`/api/*`).
    *   **Global Failsafe Limit:** A lenient, global limit for all incoming requests to the application.
3.  **Configurability:** All rate limits (request count and duration for each layer) must be configurable via environment variables.
4.  **Testing:** Create a new suite of E2E tests (Playwright) to verify that each rate-limiting policy correctly blocks requests with a `429 Too Many Requests` status code after the configurable limit is exceeded.

## 3. Non-Functional Requirements
*   The rate-limiting mechanism must have minimal performance overhead on requests that are under the limit.
*   The solution must be stateful and work correctly across Vercel's distributed Edge network.

## 4. Acceptance Criteria
1.  A rate-limiting library is successfully integrated into the `middleware.ts` file.
2.  The layered rate-limiting policies (Authentication, General API, Global) are active and enforced.
3.  All rate limits are fully configurable via environment variables.
4.  New Playwright E2E tests are created and passing, confirming that each policy correctly returns a `429` error when its respective limit is exceeded.
5.  A manual audit on a staging environment confirms the rate limiting is effective as configured.
