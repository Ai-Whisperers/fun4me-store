# Architectural Decision Record: State Management Library

## Status
Accepted

## Date
2025-12-23

## Context
As the Vete application grows, we are experiencing "prop drilling" and complex state management in our larger components, particularly the Clinic Dashboard. We need a modern, lightweight, and performant state management library to centralize UI state.

## Decision
We will adopt **Zustand** as the primary state management library for global UI state.

## Alternatives Considered
- **Jotai:** Considered for its atomic approach. While powerful for complex dependency graphs, it was deemed slightly more abstract than Zustand for our current needs.
- **React Context:** Already used in some areas (e.g., `cart-context`). While sufficient for simple scenarios, it lacks optimized selectors and becomes difficult to manage for high-frequency updates or large state objects.

## Consequences
- **Pros:**
    - Minimal boilerplate (no Providers required for most use cases).
    - Excellent performance via selectors.
    - Easy learning curve for the team.
    - Existing presence in `package.json`.
- **Cons:**
    - Requires developer discipline to keep stores focused and not turn them into "god objects".
    - Centralized state (compared to atomic) can lead to larger stores if not modularized.

## Implementation Plan
1.  Verify `zustand` installation.
2.  Create a base store structure in `web/lib/store/`.
3.  Refactor the Clinic Dashboard to use a dedicated Zustand store.
