# ADR-001: Client-Side Data Fetching Library

**Status:** Accepted

**Context:**
The project needs a standardized library for client-side data fetching to ensure consistency, improve performance, and enhance developer experience. The two main candidates evaluated were SWR and TanStack Query.

**Decision:**
We will adopt **TanStack Query** as the official client-side data fetching library for the project.

**Justification:**
While SWR is simpler and more lightweight, TanStack Query was chosen for the following reasons:
*   **Feature-Rich:** Its advanced features, such as optimistic updates and fine-grained cache control, will be beneficial as the application grows in complexity.
*   **Excellent Devtools:** The built-in Devtools provide great visibility into the query cache, which is invaluable for debugging and understanding data flow.
*   **Strong Community and Ecosystem:** TanStack Query has a large and active community, with a rich ecosystem of extensions and resources.
*   **Clearer Separation of Concerns:** Its concepts (like query keys and query functions) promote a clear and organized approach to data fetching.

**Consequences:**
*   All new client-side data fetching will be implemented using TanStack Query.
*   Existing client-side data fetching logic will be refactored to use TanStack Query, as outlined in the "Standardize Data Fetching" track.
*   Developers will need to be trained on the concepts and best practices of TanStack Query.
*   The bundle size will be slightly larger than if SWR were chosen, but this is an acceptable trade-off for the features and developer experience benefits.
