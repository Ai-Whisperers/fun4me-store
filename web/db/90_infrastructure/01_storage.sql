-- =============================================================================
-- 01_STORAGE.SQL
-- =============================================================================
-- Supabase Storage buckets and policies for file uploads.
--
-- Bucket organization:
--   - pets/         → Pet photos
--   - vaccines/     → Vaccine certificates/photos
--   - records/      → Medical record attachments
--   - prescriptions/→ Prescription PDFs
--   - invoices/     → Invoice PDFs
--   - lab/          → Lab result attachments
--   - consents/     → Signed consent documents
--   - store/        → Product images
--   - receipts/     → Expense receipts (private)
--   - qr-codes/     → Generated QR code images
--   - signatures/   → Digital signatures
--   - messages/     → Message attachments
--
-- Dependencies: 00_setup/02_core_functions
-- =============================================================================

-- =============================================================================
-- CREATE STORAGE BUCKETS
-- =============================================================================

-- Pet photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'pets',
    'pets',
    TRUE,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Vaccine certificates/photos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vaccines',
    'vaccines',
    TRUE,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Medical record attachments (public read, staff write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'records',
    'records',
    TRUE,
    20971520,  -- 20MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Prescription PDFs (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'prescriptions',
    'prescriptions',
    TRUE,
    5242880,  -- 5MB
    ARRAY['application/pdf', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Invoice PDFs (public read for owners)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices',
    'invoices',
    TRUE,
    5242880,  -- 5MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lab result attachments (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lab',
    'lab',
    TRUE,
    20971520,  -- 20MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Consent documents (public read for signers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'consents',
    'consents',
    TRUE,
    5242880,  -- 5MB
    ARRAY['application/pdf', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Store product images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'store',
    'store',
    TRUE,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Expense receipts (private - staff only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    FALSE,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- QR code images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'qr-codes',
    'qr-codes',
    TRUE,
    1048576,  -- 1MB
    ARRAY['image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Digital signatures (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'signatures',
    'signatures',
    TRUE,
    1048576,  -- 1MB
    ARRAY['image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Message attachments (authenticated access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'messages',
    'messages',
    FALSE,
    10485760,  -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- STORAGE POLICIES - PETS BUCKET
-- =============================================================================

-- Anyone can view pet photos
DROP POLICY IF EXISTS "Public view pets" ON storage.objects;
CREATE POLICY "Public view pets" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'pets');

-- Authenticated users can upload pet photos
DROP POLICY IF EXISTS "Authenticated upload pets" ON storage.objects;
CREATE POLICY "Authenticated upload pets" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'pets');

-- Owners can update/delete their pet's photos
DROP POLICY IF EXISTS "Owners manage pets" ON storage.objects;
CREATE POLICY "Owners manage pets" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'pets'
        AND (
            auth.uid() IN (
                SELECT owner_id FROM public.pets
                WHERE id::TEXT = (storage.foldername(name))[1]
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('vet', 'admin')
            )
        )
    );

-- =============================================================================
-- STORAGE POLICIES - VACCINES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view vaccines" ON storage.objects;
CREATE POLICY "Public view vaccines" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'vaccines');

DROP POLICY IF EXISTS "Authenticated upload vaccines" ON storage.objects;
CREATE POLICY "Authenticated upload vaccines" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'vaccines');

DROP POLICY IF EXISTS "Staff delete vaccines" ON storage.objects;
CREATE POLICY "Staff delete vaccines" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'vaccines'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - RECORDS BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view records" ON storage.objects;
CREATE POLICY "Public view records" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'records');

DROP POLICY IF EXISTS "Staff manage records" ON storage.objects;
CREATE POLICY "Staff manage records" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'records'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - PRESCRIPTIONS BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view prescriptions" ON storage.objects;
CREATE POLICY "Public view prescriptions" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'prescriptions');

DROP POLICY IF EXISTS "Staff manage prescriptions" ON storage.objects;
CREATE POLICY "Staff manage prescriptions" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'prescriptions'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - INVOICES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view invoices" ON storage.objects;
CREATE POLICY "Public view invoices" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Staff manage invoices" ON storage.objects;
CREATE POLICY "Staff manage invoices" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'invoices'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - LAB BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view lab" ON storage.objects;
CREATE POLICY "Public view lab" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'lab');

DROP POLICY IF EXISTS "Staff manage lab" ON storage.objects;
CREATE POLICY "Staff manage lab" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'lab'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - CONSENTS BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view consents" ON storage.objects;
CREATE POLICY "Public view consents" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'consents');

DROP POLICY IF EXISTS "Authenticated upload consents" ON storage.objects;
CREATE POLICY "Authenticated upload consents" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'consents');

DROP POLICY IF EXISTS "Staff delete consents" ON storage.objects;
CREATE POLICY "Staff delete consents" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'consents'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- STORAGE POLICIES - STORE BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view store" ON storage.objects;
CREATE POLICY "Public view store" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'store');

DROP POLICY IF EXISTS "Staff manage store" ON storage.objects;
CREATE POLICY "Staff manage store" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'store'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - RECEIPTS BUCKET (Private)
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage receipts" ON storage.objects;
CREATE POLICY "Staff manage receipts" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'receipts'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - QR-CODES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view qr-codes" ON storage.objects;
CREATE POLICY "Public view qr-codes" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'qr-codes');

DROP POLICY IF EXISTS "Authenticated upload qr-codes" ON storage.objects;
CREATE POLICY "Authenticated upload qr-codes" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'qr-codes');

DROP POLICY IF EXISTS "Staff delete qr-codes" ON storage.objects;
CREATE POLICY "Staff delete qr-codes" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'qr-codes'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('vet', 'admin')
        )
    );

-- =============================================================================
-- STORAGE POLICIES - SIGNATURES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Public view signatures" ON storage.objects;
CREATE POLICY "Public view signatures" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'signatures');

DROP POLICY IF EXISTS "Authenticated upload signatures" ON storage.objects;
CREATE POLICY "Authenticated upload signatures" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'signatures');

-- =============================================================================
-- STORAGE POLICIES - MESSAGES BUCKET
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated access messages" ON storage.objects;
CREATE POLICY "Authenticated access messages" ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'messages');

-- =============================================================================
-- STORAGE HELPER FUNCTIONS
-- =============================================================================

-- Get public URL for a storage object
CREATE OR REPLACE FUNCTION public.get_storage_url(
    p_bucket_id TEXT,
    p_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN CONCAT(
        current_setting('app.settings.storage_url', true),
        '/storage/v1/object/public/',
        p_bucket_id, '/',
        p_path
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Clean up orphaned storage objects (run periodically)
-- This is a template - actual cleanup should be handled by a scheduled job
CREATE OR REPLACE FUNCTION public.get_orphaned_storage_paths(p_bucket_id TEXT)
RETURNS TABLE (path TEXT) AS $$
BEGIN
    -- This would need to be customized per bucket
    -- Example for pets bucket:
    IF p_bucket_id = 'pets' THEN
        RETURN QUERY
        SELECT o.name
        FROM storage.objects o
        WHERE o.bucket_id = 'pets'
          AND NOT EXISTS (
              SELECT 1 FROM public.pets p
              WHERE p.photo_url LIKE '%' || o.name
          );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


