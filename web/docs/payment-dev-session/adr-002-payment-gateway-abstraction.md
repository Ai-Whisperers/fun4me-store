# ADR-002: Payment Gateway Abstraction Strategy

**Status:** Proposed

**Context:**
The current payment implementation is heavily coupled to Stripe, primarily within the platform billing and cron job modules. While functional for global payments, the project lacks a unified way to integrate local Paraguayan payment gateways (Bancard, Tigo Money) which are critical for the e-commerce store's market fit.

Furthermore, the store checkout flow (`/api/store/checkout`) currently creates invoices and decrements stock but fails to initiate a financial transaction, leaving orders in a "Pending" state without a clear payment path for the user beyond manual WhatsApp coordination.

**Decision:**
We will adopt an **"Abstract as we Build"** strategy for payment gateway integration. This involves:

1.  Implementing a `PaymentProvider` interface following the established `EmailProvider` pattern.
2.  Refactoring existing Stripe logic into a `StripePaymentProvider`.
3.  Implementing a `PaymentFactory` to resolve the correct provider based on tenant configuration.
4.  Completing the Stripe integration for the Store Checkout flow using this new abstraction.

**Justification:**

- **Adaptability:** Prevents vendor lock-in and allows seamless addition of Bancard or Tigo Money without touching core business logic in the `StoreService` or checkout API.
- **Consistency:** Mirrors the successful pattern used in the `EmailService`, making the codebase more idiomatic and easier for the team to navigate.
- **Time-to-Value:** By abstracting while completing Stripe, we fulfill the immediate requirement for functional store payments while simultaneously paying down architectural debt.
- **Market Alignment:** Essential for the LAm market where multi-gateway support (Local + International) is a standard requirement.

**Consequences:**

- A new `lib/payments` directory will be created to house the `PaymentProvider` interface and its implementations.
- The `StoreService` and `/api/store/checkout` route will be updated to return a `payment_intent` object derived from the resolved provider.
- Existing billing cron jobs will eventually be refactored to use the provider-agnostic `PaymentService`.
- Initial development will take approximately 2-3 hours longer due to the abstraction layer, but will save significant refactoring time during the integration of Bancard.
