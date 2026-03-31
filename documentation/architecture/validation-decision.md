# Architectural Decision: Schema Validation Library

## Status
Accepted

## Context
The project needs a robust, type-safe schema validation library to ensure data integrity across both the frontend (forms) and backend (API routes/Server Actions). 

## Decision
We will use **Zod** as the primary schema validation library.

## Reasoning
1. **Type Inference:** Zod provides excellent TypeScript inference, allowing us to derive TS types directly from schemas, reducing duplication and improving type safety.
2. **Community and Ecosystem:** Zod is the de-facto standard in the Next.js ecosystem, with widespread support in libraries like `react-hook-form` and Server Action wrappers.
3. **Existing Usage:** Zod is already present in the project's dependencies (`package.json`).
4. **Developer Experience:** Its functional and declarative API is highly intuitive for developers familiar with TypeScript.

## Alternatives Considered
- **Valibot:** Excellent for bundle size optimization, but has a smaller ecosystem and slightly more verbose syntax.
- **Yup:** A popular choice but lacks the deep TypeScript integration and type inference that Zod offers natively.

## Consequences
- All new API endpoints and complex frontend forms should use Zod for validation.
- Validation logic will be centralized in shared schema files where possible to ensure end-to-end type safety.
