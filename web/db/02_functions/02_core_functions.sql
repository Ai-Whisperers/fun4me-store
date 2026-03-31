-- =============================================================================
-- 02_CORE_FUNCTIONS.SQL
-- =============================================================================
-- Core utility functions used throughout the application.
-- These replace the stub functions created earlier with real implementations.
-- =============================================================================

-- Functions use CREATE OR REPLACE to update in place without breaking dependencies

-- =============================================================================
-- A. UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
-- Automatically updates the updated_at column on row modification.
-- Used by all tables with updated_at column.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- B. IS_STAFF_OF (Authorization Helper)
-- =============================================================================
-- Checks if the current user is a staff member (vet/admin) of a given tenant.
-- Used extensively in RLS policies for row-level security.
--
-- SECURITY DEFINER: Runs with elevated privileges to query profiles table
-- even when the calling user might not have direct access.

CREATE OR REPLACE FUNCTION public.is_staff_of(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND tenant_id = in_tenant_id
        AND role IN ('vet', 'admin')
        AND deleted_at IS NULL
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- C. IS_OWNER_OF_PET (Authorization Helper)
-- =============================================================================
-- Checks if the current user owns a specific pet.
-- Used in RLS policies for pet-related tables.

CREATE OR REPLACE FUNCTION public.is_owner_of_pet(pet_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pets
        WHERE id = pet_uuid
        AND owner_id = auth.uid()
        AND deleted_at IS NULL
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- D. GET_USER_TENANT (Helper)
-- =============================================================================
-- Returns the tenant_id for the current authenticated user.
-- Useful in RLS policies and application logic.

CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- E. GET_USER_ROLE (Helper)
-- =============================================================================
-- Returns the role for the current authenticated user.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles
    WHERE id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- =============================================================================
-- F. PROTECT_CRITICAL_COLUMNS (Security Trigger)
-- =============================================================================
-- Prevents users from modifying their own role or tenant_id.
-- Applied to profiles table.

CREATE OR REPLACE FUNCTION public.protect_critical_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow service role to modify anything
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- For regular users, protect critical columns
    IF OLD.id = auth.uid() THEN
        -- User is modifying their own profile
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Cannot modify your own role';
        END IF;
        IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
            RAISE EXCEPTION 'Cannot modify your own tenant';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- G. SOFT DELETE HELPER
-- =============================================================================
-- Generic function to soft delete records.
-- Handles tables with or without deleted_by column

CREATE OR REPLACE FUNCTION public.soft_delete(
    table_name TEXT,
    record_id UUID,
    deleted_by_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
    has_deleted_by BOOLEAN;
BEGIN
    -- Check if table has deleted_by column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = soft_delete.table_name
        AND column_name = 'deleted_by'
    ) INTO has_deleted_by;

    IF has_deleted_by THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
            table_name
        ) USING COALESCE(deleted_by_id, auth.uid()), record_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            table_name
        ) USING record_id;
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- H. RESTORE DELETED RECORD
-- =============================================================================
-- Generic function to restore soft-deleted records.
-- Handles tables with or without deleted_by column

CREATE OR REPLACE FUNCTION public.restore_deleted(
    table_name TEXT,
    record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
    has_deleted_by BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = restore_deleted.table_name
        AND column_name = 'deleted_by'
    ) INTO has_deleted_by;

    IF has_deleted_by THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
            table_name
        ) USING record_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
            table_name
        ) USING record_id;
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- I. GENERATE SEQUENCE NUMBER
-- =============================================================================
-- Generates sequential numbers for invoices, lab orders, etc.
-- Uses document_sequences table for thread-safe generation

CREATE OR REPLACE FUNCTION public.generate_sequence_number(
    prefix TEXT,
    tenant TEXT,
    sequence_name TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_doc_type TEXT;
BEGIN
    -- Map prefix to document type
    v_doc_type := COALESCE(sequence_name, LOWER(prefix));

    RETURN public.next_document_number(tenant, v_doc_type, UPPER(prefix));
END;
$$ LANGUAGE plpgsql SET search_path = public;
