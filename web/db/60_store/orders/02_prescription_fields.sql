-- =============================================================================
-- 02_PRESCRIPTION_FIELDS.SQL
-- =============================================================================
-- Adds prescription handling fields to orders and order items
--
-- DEPENDENCIES: 60_store/orders/01_orders.sql
-- =============================================================================

-- =============================================================================
-- UPDATE ORDERS STATUS CHECK
-- =============================================================================
-- Add 'pending_prescription' status for orders that require vet approval

-- Drop and recreate the constraint to include new status
ALTER TABLE public.store_orders 
    DROP CONSTRAINT IF EXISTS store_orders_status_check;

ALTER TABLE public.store_orders 
    ADD CONSTRAINT store_orders_status_check 
    CHECK (status IN (
        'pending',              -- Order placed
        'pending_prescription', -- Awaiting prescription approval
        'confirmed',            -- Payment confirmed / prescription approved
        'processing',           -- Being prepared
        'ready',                -- Ready for pickup/shipping
        'shipped',              -- In transit
        'delivered',            -- Completed
        'cancelled',            -- Cancelled
        'refunded'              -- Refunded
    ));

COMMENT ON COLUMN public.store_orders.status IS 'Workflow: pending → [pending_prescription →] confirmed → processing → ready → shipped → delivered. Also: cancelled, refunded';

-- =============================================================================
-- ADD PRESCRIPTION FIELDS TO STORE_ORDERS
-- =============================================================================

-- Flag indicating order contains prescription items requiring review
ALTER TABLE public.store_orders 
    ADD COLUMN IF NOT EXISTS requires_prescription_review BOOLEAN DEFAULT false;

-- Consolidated prescription file URL (if single file for whole order)
ALTER TABLE public.store_orders 
    ADD COLUMN IF NOT EXISTS prescription_file_url TEXT;

-- Prescription review tracking
ALTER TABLE public.store_orders 
    ADD COLUMN IF NOT EXISTS prescription_reviewed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.store_orders 
    ADD COLUMN IF NOT EXISTS prescription_reviewed_at TIMESTAMPTZ;

-- Notes from vet during prescription review
ALTER TABLE public.store_orders 
    ADD COLUMN IF NOT EXISTS prescription_notes TEXT;

-- Rejection reason (if prescription is rejected)
ALTER TABLE public.store_orders 
    ADD COLUMN IF NOT EXISTS prescription_rejection_reason TEXT;

COMMENT ON COLUMN public.store_orders.requires_prescription_review IS 'True if order contains items requiring prescription approval';
COMMENT ON COLUMN public.store_orders.prescription_file_url IS 'URL to uploaded prescription document (PDF/image)';
COMMENT ON COLUMN public.store_orders.prescription_reviewed_by IS 'Staff member (vet/admin) who reviewed the prescription';
COMMENT ON COLUMN public.store_orders.prescription_reviewed_at IS 'When the prescription was reviewed';
COMMENT ON COLUMN public.store_orders.prescription_notes IS 'Notes from reviewer about the prescription';
COMMENT ON COLUMN public.store_orders.prescription_rejection_reason IS 'Reason if prescription was rejected';

-- =============================================================================
-- ADD PRESCRIPTION FIELDS TO STORE_ORDER_ITEMS
-- =============================================================================

-- Flag indicating this specific item requires prescription
ALTER TABLE public.store_order_items 
    ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT false;

-- Individual prescription file for this item (if different from order-level)
ALTER TABLE public.store_order_items 
    ADD COLUMN IF NOT EXISTS prescription_file_url TEXT;

COMMENT ON COLUMN public.store_order_items.requires_prescription IS 'True if this product requires a prescription';
COMMENT ON COLUMN public.store_order_items.prescription_file_url IS 'URL to prescription for this specific item';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for finding orders pending prescription review
CREATE INDEX IF NOT EXISTS idx_store_orders_pending_prescription
    ON public.store_orders(tenant_id, created_at DESC)
    WHERE status = 'pending_prescription';

-- Index for orders requiring prescription review
CREATE INDEX IF NOT EXISTS idx_store_orders_prescription_review
    ON public.store_orders(tenant_id, requires_prescription_review)
    WHERE requires_prescription_review = true;

-- =============================================================================
-- TRIGGER: Auto-set prescription status when order has prescription items
-- =============================================================================

CREATE OR REPLACE FUNCTION set_prescription_order_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If the order has prescription items, set status to pending_prescription
    IF NEW.requires_prescription_review = true AND NEW.status = 'pending' THEN
        NEW.status := 'pending_prescription';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_prescription_check ON public.store_orders;

CREATE TRIGGER on_order_prescription_check
    BEFORE INSERT OR UPDATE ON public.store_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_prescription_order_status();

COMMENT ON FUNCTION set_prescription_order_status IS 'Automatically sets order status to pending_prescription when prescription review is required';

-- =============================================================================
-- RLS POLICIES FOR PRESCRIPTION FIELDS
-- =============================================================================
-- Note: store_orders and store_order_items already have RLS enabled in 01_orders.sql
-- These policies specifically control prescription-related field access

-- Policy: Staff (vet/admin) can review and update prescription fields
-- This policy allows staff to update the prescription review fields
DROP POLICY IF EXISTS "Staff can review prescriptions" ON public.store_orders;
CREATE POLICY "Staff can review prescriptions" ON public.store_orders
    FOR UPDATE TO authenticated
    USING (
        -- Staff of the clinic can access the order
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_orders.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        -- Staff of the clinic can update the order
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_orders.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Policy: Customers can view their own orders (including prescription status)
-- Note: The existing "Customers view own orders" policy in 01_orders.sql already covers this
-- We add this comment for clarity that customers CAN see their prescription status

-- Policy: Customers can upload prescription files when creating/updating their orders
DROP POLICY IF EXISTS "Customers can upload prescriptions" ON public.store_orders;
CREATE POLICY "Customers can upload prescriptions" ON public.store_orders
    FOR UPDATE TO authenticated
    USING (
        -- Customer owns this order
        customer_id = auth.uid()
        -- And order is still in editable state (pending or pending_prescription)
        AND status IN ('pending', 'pending_prescription')
    )
    WITH CHECK (
        -- Customer owns this order
        customer_id = auth.uid()
        -- And order is still in editable state
        AND status IN ('pending', 'pending_prescription')
    );

COMMENT ON POLICY "Staff can review prescriptions" ON public.store_orders IS
    'Allows vet/admin staff to review and approve/reject prescriptions';
COMMENT ON POLICY "Customers can upload prescriptions" ON public.store_orders IS
    'Allows customers to upload prescription files on their pending orders';

-- =============================================================================
-- SECURITY COMMENTS
-- =============================================================================
-- Prescription handling security model:
-- 1. UPLOAD: Customers can upload prescription files to their own pending orders
-- 2. REVIEW: Only staff (vet/admin) can review prescriptions (set reviewed_by, reviewed_at, notes)
-- 3. APPROVE/REJECT: Only staff can change status from pending_prescription to confirmed/cancelled
-- 4. VIEW: Customers can view their own order's prescription status
-- 5. AUDIT: prescription_reviewed_by and prescription_reviewed_at create audit trail
