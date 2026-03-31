# Payment Gateway Integration Roadmap

**Status:** Implementation Starting
**Date:** 2026-02-10
**Epic:** FEAT-024 (Integrated Payments) / INT-001 (Gateway Expansion)

---

## 📋 Executive Summary

This document outlines the architecture and implementation plan for the Vete Payment Gateway system. We are transitioning from a Stripe-coupled architecture to a provider-agnostic system that supports international (Stripe) and local Paraguayan (Bancard, Tigo Money) payment methods.

The immediate goal is to finalize functional payments for the **E-commerce Store**, followed by platform billing refactoring.

---

## 🏗️ Architecture: "Abstract as we Build"

### 1. Unified Provider Interface (`PaymentProvider`)

Following the pattern established by the `EmailService`, we will implement a strategy pattern for payments.

**Core Interface:**

- `createIntent(amount, currency, metadata)`: Initialize a transaction.
- `confirmPayment(intentId)`: Verify and finalize.
- `handleWebhook(payload, signature)`: Process async updates.
- `refund(paymentId, amount)`: Process refunds.

### 2. Service Layer Consolidation

We will merge the strengths of the current `Core MVP` and `Domain` payment services into a unified `PaymentService` that orchestrates providers via a `PaymentFactory`.

### 3. Integrated Store Checkout

The `/api/store/checkout` route will be enhanced to:

1. Call `process_checkout` RPC (Atomic DB entry).
2. Resolve the clinic's preferred `PaymentProvider`.
3. Generate a `PaymentIntent` via the provider.
4. Return both the `invoice` and `payment_data` (e.g., client_secret) to the frontend.

---

## 🚀 Implementation Phases

### Phase 1: Infrastructure & Stripe Migration (100% Complete)

- [x] Create `lib/payments/` directory.
- [x] Define `PaymentProvider` interface and types.
- [x] Implement `StripePaymentProvider` (refactored from `lib/billing/stripe.ts`).
- [x] Create `PaymentFactory` with tenant-aware resolution.
- [x] Implement `MockPaymentProvider` for testing.

### Phase 2: Store Integration (100% Complete)

- [x] Update `POST /api/store/checkout` to initiate payment intents.
- [x] Create `components/payments/StripePaymentWrapper.tsx`.
- [x] Update `CheckoutClient.tsx` to handle provider-specific payment UIs.
- [x] Implement success/failure redirect handlers.

### Phase 3: Webhook & Background Jobs (100% Complete)

- [x] Create unified `/api/webhooks/payments/[provider]` endpoint.
- [x] Update webhook logic to handle both **Platform Invoices** and **Store Invoices**.
- [x] Refactor `auto-charge` cron jobs to use the new `PaymentService`.

### Phase 4: Local Gateway Expansion (100% Complete)

- [x] Implement `BancardPaymentProvider`.
- [x] Implement `TigoMoneyPaymentProvider`.
- [x] Add gateway selection to Clinic Admin Settings.

---

## 🛠️ Technical Deep Dive Findings

| Component          | Status        | Delta                                        |
| :----------------- | :------------ | :------------------------------------------- |
| **Stripe Utility** | 🟢 Solid      | Needs to be wrapped in Provider class.       |
| **Store RPC**      | 🟢 Perfect    | Already handles atomicity and stock locking. |
| **Checkout UI**    | 🟡 Partial    | Missing PaymentElement/Gateway mount points. |
| **Webhooks**       | 🟠 Coupled    | Currently only handles platform billing.     |
| **Service Layer**  | 🔴 Fragmented | Two competing implementations need merging.  |

---

## 🧪 Testing Strategy

- **Unit:** Test `PaymentFactory` resolution and individual provider logic with mocks.
- **Integration:** Test `PaymentService` with the `process_checkout` RPC.
- **E2E:** Playwright tests for the full "Add to Cart → Stripe Checkout → Success Page" flow.

---

## 📅 Target Milestones

- **Feb 12:** Stripe functional in Store (Production Ready).
- **Feb 15:** Abstraction layer complete.
- **Feb 20:** Bancard integration started.

---

## 🛡️ Future-Proof Resilience & Generic Abstraction

To ensure long-term maintainability and rapid integration of local gateways (Bancard, Tigo Money), we will implement a **Base Abstraction Layer** that separates provider-specific SDK logic from our core business rules.

### 1. The `AbstractPaymentProvider` Base Class

Instead of providers implementing the `PaymentProvider` interface directly, they will extend an `AbstractPaymentProvider` class.

**Responsibilities of the Base Class:**

- **Standardized Logging:** Automatic entry/exit logging for all payment attempts with duration tracking.
- **Error Normalization:** Mapping provider-specific errors (Stripe, Bancard) into a unified `VetePaymentError` schema.
- **Telemetry:** Hook points for Datadog/Prometheus to track payment success rates and latency.
- **Idempotency Logic:** Shared logic for handling retry headers and duplicate webhook events.

### 2. CI/CD & Testing Resilience

- **Contract Testing:** A shared test suite template that any new provider (e.g., `BancardProvider`) must pass to be considered "Vete-compliant".
- **Provider Agnostic Smoke Tests:** CI/CD jobs that run against the `MockPaymentProvider` to ensure the orchestration layer (RPCs + Service) never breaks during unrelated changes.
- **Circuit Breaker Pattern:** Future implementation of a circuit breaker in the base class to automatically disable a gateway if its failure rate exceeds a threshold (e.g., if Bancard goes down, fallback to Stripe or Cash).

### 3. Implementation Plan for Abstraction

- [ ] Refactor `PaymentProvider` to `AbstractPaymentProvider`.
- [ ] Move `logger` and `performance.now()` logic into the base class decorators/methods.
- [ ] Implement `normalizeError(rawError)` as a required abstract method.
- [ ] Create a `BaseProviderTest` suite that can be extended for any new gateway.
