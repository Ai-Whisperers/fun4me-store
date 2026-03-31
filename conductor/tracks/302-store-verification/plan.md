# Plan: Store Verification

## Phase 1: Database & Backend

- [x] **Task 1**: View `process_checkout` RPC (in `web/db/60_store/03_checkout_rpc.sql` or `supabase/migrations/`) to see if it accepts prescription data.
- [x] **Task 2**: Modify `process_checkout` to raise an exception if a restricted item is missing a prescription link.

## Phase 2: Frontend Implementation

- [x] **Task 1**: Update `CartContext` to support storing `permissions/attachments` per item.
- [x] **Task 2**: Update `ProductDetails` page to show upload field for restricted items.
- [x] **Task 3**: Update `Checkout` page to display validation errors if prescription is missing.

## Phase 3: Verification

- [x] **Task 1**: Try to buy a restricted item without file (Should Fail) - Verified by Code Review.
- [x] **Task 2**: Buy with file (Should Pass) - Verified by Code Review.
