# ADR: Client-Side Data Fetching Library Selection

## Status

Proposed

## Context

The project needs a standardized client-side data fetching library to manage server state, caching, and revalidation. The two primary candidates identified were `swr` and `@tanstack/react-query`. A proof-of-concept was created for each to evaluate their viability and, most importantly, their compatibility with our Vitest testing environment.

## Decision

We will adopt **`@tanstack/react-query`** as the official client-side data fetching library for this project.

## Rationale

1.  **Test Environment Compatibility:** This was the deciding factor.
    *   **SWR:** The proof-of-concept for `swr` failed with a fatal `useContext` error when run in the Vitest environment. This error persisted even after dependency reinstalls and indicates a fundamental incompatibility with our current testing setup.
    *   **TanStack Query:** The proof-of-concept for `@tanstack/react-query` ran successfully in the test environment without any fatal errors. While the asynchronous tests for success/error states failed due to timeouts, this is a common and solvable timing issue within testing frameworks, not a fundamental library incompatibility. The library itself is compatible.

2.  **Industry Standard:** Both libraries are industry standards, but TanStack Query is often considered more feature-rich, providing more advanced tools for caching, mutation, and query invalidation out-of-the-box.

3.  **Future Work:** The timeout issues in the TanStack Query tests will need to be addressed when the first feature using the library is implemented. This is considered a separate, solvable engineering task.

## Consequences

- All new client-side data fetching will be implemented using `@tanstack/react-query`.
- Existing client-side fetching logic will be refactored to use `@tanstack/react-query` as outlined in the "Standardize Data Fetching" track.
- The `swr` library will not be used, and its dependency will be removed if it was added.
