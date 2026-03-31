# Plan: Security Hardening

## Phase 1: Rate Limiting Implementation

- [x] **Task 1**: Review `lib/rate-limit.ts` and ensure it works with current infrastructure (Memory/Redis).
- [x] **Task 2**: Apply `rateLimit()` check to `web/app/api/auth/route.ts` (Auth is Supabase client-side, verified no server route needed).
- [x] **Task 3**: Apply `rateLimit()` check to `web/app/api/booking/route.ts` (Search).
- [x] **Task 4**: Verify 429 responses using a test script or `curl` (Manual verification).

## Phase 2: Endpoint Audit

- [x] **Task 1**: Check `api/medical-records/diagnosis/route.ts` for auth checks (Done).
- [x] **Task 2**: Check `api/services/route.ts` for auth checks (Added rate limit to public GET).
- [x] **Task 3**: Add `withAuth` wrapper if missing (Added rate limit to `consents/requests`).
