-- =============================================================================
-- 019_PET_DOCUMENTS.SQL
-- =============================================================================
-- Pet document management table for storing medical documents, X-rays,
-- lab results, and other files associated with pets.
--
-- Dependencies: 10_core, 20_pets
-- =============================================================================

-- Create document category enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pet_document_category') THEN
        CREATE TYPE pet_document_category AS ENUM (
            'medical',       -- General medical records
            'lab',           -- Lab results
            'xray',          -- X-rays and imaging
            'vaccine',       -- Vaccine certificates
            'prescription',  -- Prescriptions
            'other'          -- Miscellaneous
        );
    END IF;
END $$;

-- =============================================================================
-- PET_DOCUMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS pet_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

    -- Document metadata
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT NOT NULL,  -- Path in Supabase Storage for deletion
    category pet_document_category NOT NULL DEFAULT 'other',
    description TEXT,

    -- Audit
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Tenant + Pet composite for fast lookups
CREATE INDEX IF NOT EXISTS idx_pet_documents_tenant_pet
    ON pet_documents(tenant_id, pet_id)
    WHERE deleted_at IS NULL;

-- Category filter
CREATE INDEX IF NOT EXISTS idx_pet_documents_category
    ON pet_documents(tenant_id, pet_id, category)
    WHERE deleted_at IS NULL;

-- Created date for sorting
CREATE INDEX IF NOT EXISTS idx_pet_documents_created
    ON pet_documents(created_at DESC)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE pet_documents ENABLE ROW LEVEL SECURITY;

-- Staff can manage all documents in their tenant
DROP POLICY IF EXISTS "Staff manage pet documents" ON pet_documents;
CREATE POLICY "Staff manage pet documents" ON pet_documents
    FOR ALL
    USING (is_staff_of(tenant_id));

-- Pet owners can view their pet's documents
DROP POLICY IF EXISTS "Owners view pet documents" ON pet_documents;
CREATE POLICY "Owners view pet documents" ON pet_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pets p
            WHERE p.id = pet_documents.pet_id
            AND p.owner_id = auth.uid()
        )
    );

-- Pet owners can upload documents to their own pets
DROP POLICY IF EXISTS "Owners upload pet documents" ON pet_documents;
CREATE POLICY "Owners upload pet documents" ON pet_documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pets p
            WHERE p.id = pet_documents.pet_id
            AND p.owner_id = auth.uid()
        )
    );

-- Pet owners can soft-delete their own uploads
DROP POLICY IF EXISTS "Owners delete own uploads" ON pet_documents;
CREATE POLICY "Owners delete own uploads" ON pet_documents
    FOR UPDATE
    USING (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM pets p
            WHERE p.id = pet_documents.pet_id
            AND p.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Only allow updating deleted_at field
        deleted_at IS NOT NULL
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON pet_documents;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON pet_documents
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- STORAGE BUCKET UPDATE
-- =============================================================================

-- Add pet-documents bucket (uses same settings as records)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'pet-documents',
    'pet-documents',
    TRUE,
    20971520,  -- 20MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- STORAGE POLICIES FOR PET-DOCUMENTS BUCKET
-- =============================================================================

-- Public read access
DROP POLICY IF EXISTS "Public view pet-documents" ON storage.objects;
CREATE POLICY "Public view pet-documents" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'pet-documents');

-- Authenticated users can upload
DROP POLICY IF EXISTS "Authenticated upload pet-documents" ON storage.objects;
CREATE POLICY "Authenticated upload pet-documents" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'pet-documents');

-- Staff can delete any document
DROP POLICY IF EXISTS "Staff delete pet-documents" ON storage.objects;
CREATE POLICY "Staff delete pet-documents" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'pet-documents'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- Owners can delete their own uploads (files in their user folder)
DROP POLICY IF EXISTS "Owners delete own pet-documents" ON storage.objects;
CREATE POLICY "Owners delete own pet-documents" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'pet-documents'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );
