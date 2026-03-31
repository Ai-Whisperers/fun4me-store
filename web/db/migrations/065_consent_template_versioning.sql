-- Migration: 065_consent_template_versioning.sql
-- Description: Add proper versioning support for consent templates
-- FEAT-019: Consent Template Versioning
--
-- This migration:
-- 1. Creates consent_template_versions table for version history
-- 2. Adds missing columns to consent_templates
-- 3. Sets up triggers for automatic version tracking

-- =============================================================================
-- 1. ADD MISSING COLUMNS TO consent_templates
-- =============================================================================

-- Add columns needed for versioning workflow
ALTER TABLE public.consent_templates
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS change_summary TEXT,
  ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES public.consent_templates(id) ON DELETE SET NULL;

-- Add UI-required columns that were missing
ALTER TABLE public.consent_templates
  ADD COLUMN IF NOT EXISTS requires_id_verification BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_be_revoked BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_expiry_days INTEGER;

COMMENT ON COLUMN public.consent_templates.is_active IS 'Whether the template is available for use';
COMMENT ON COLUMN public.consent_templates.is_current IS 'Whether this is the current version of the template';
COMMENT ON COLUMN public.consent_templates.published_at IS 'When this version was published';
COMMENT ON COLUMN public.consent_templates.change_summary IS 'Summary of changes in this version';
COMMENT ON COLUMN public.consent_templates.parent_version_id IS 'Reference to the previous version of this template';
COMMENT ON COLUMN public.consent_templates.requires_id_verification IS 'Whether signing requires ID verification';
COMMENT ON COLUMN public.consent_templates.can_be_revoked IS 'Whether consent can be revoked after signing';
COMMENT ON COLUMN public.consent_templates.default_expiry_days IS 'Default days until signed consent expires';

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_consent_templates_is_current ON public.consent_templates(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_consent_templates_parent ON public.consent_templates(parent_version_id);

-- =============================================================================
-- 2. CREATE consent_template_versions TABLE
-- =============================================================================
-- This stores the full history of each template version for audit purposes

CREATE TABLE IF NOT EXISTS public.consent_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to the template
    template_id UUID NOT NULL REFERENCES public.consent_templates(id) ON DELETE CASCADE,

    -- Version info
    version_number INTEGER NOT NULL,
    version_label TEXT NOT NULL,  -- e.g., "1.0", "1.1", "2.0"

    -- Snapshot of content at this version
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,

    -- Version metadata
    change_summary TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Who made this version
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique version numbers per template
    CONSTRAINT consent_template_versions_unique_number UNIQUE (template_id, version_number)
);

COMMENT ON TABLE public.consent_template_versions IS 'Historical versions of consent templates for audit and rollback';
COMMENT ON COLUMN public.consent_template_versions.version_number IS 'Auto-incrementing version number per template';
COMMENT ON COLUMN public.consent_template_versions.version_label IS 'Human-readable version label (semantic versioning)';
COMMENT ON COLUMN public.consent_template_versions.change_summary IS 'Description of what changed in this version';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_template_versions_template ON public.consent_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_consent_template_versions_published ON public.consent_template_versions(template_id, is_published) WHERE is_published = true;

-- RLS Policies
ALTER TABLE public.consent_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view template versions" ON public.consent_template_versions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consent_templates ct
            WHERE ct.id = consent_template_versions.template_id
            AND (ct.tenant_id IS NULL OR public.is_staff_of(ct.tenant_id))
        )
    );

CREATE POLICY "Staff can manage template versions" ON public.consent_template_versions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consent_templates ct
            WHERE ct.id = consent_template_versions.template_id
            AND ct.tenant_id IS NOT NULL
            AND public.is_staff_of(ct.tenant_id)
        )
    );

CREATE POLICY "Service role full access consent_template_versions" ON public.consent_template_versions
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- 3. FUNCTION TO CREATE NEW VERSION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_consent_template_version(
    p_template_id UUID,
    p_title TEXT,
    p_content_html TEXT,
    p_change_summary TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_version_id UUID;
    v_next_version INTEGER;
    v_tenant_id TEXT;
    v_current_version TEXT;
BEGIN
    -- Get current template info
    SELECT tenant_id, version INTO v_tenant_id, v_current_version
    FROM public.consent_templates
    WHERE id = p_template_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Calculate next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
    FROM public.consent_template_versions
    WHERE template_id = p_template_id;

    -- Create version record (snapshot of current state before update)
    INSERT INTO public.consent_template_versions (
        template_id,
        version_number,
        version_label,
        title,
        content_html,
        change_summary,
        is_published,
        published_at,
        created_by,
        created_at
    )
    SELECT
        id,
        v_next_version,
        COALESCE(version, '1.0'),
        title,
        content_html,
        p_change_summary,
        true,
        NOW(),
        p_user_id,
        NOW()
    FROM public.consent_templates
    WHERE id = p_template_id
    RETURNING id INTO v_version_id;

    -- Update template with new content
    UPDATE public.consent_templates
    SET
        title = p_title,
        content_html = p_content_html,
        version = (SPLIT_PART(COALESCE(version, '1.0'), '.', 1)::INTEGER + 1) || '.0',
        change_summary = p_change_summary,
        published_at = NOW(),
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_template_id;

    RETURN v_version_id;
END;
$$;

COMMENT ON FUNCTION public.create_consent_template_version IS 'Creates a new version of a consent template, archiving the current version first';

-- =============================================================================
-- 4. FUNCTION TO ROLLBACK TO VERSION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rollback_consent_template_version(
    p_template_id UUID,
    p_target_version_number INTEGER,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_version_id UUID;
    v_target_title TEXT;
    v_target_content TEXT;
    v_next_version INTEGER;
BEGIN
    -- Get target version content
    SELECT title, content_html INTO v_target_title, v_target_content
    FROM public.consent_template_versions
    WHERE template_id = p_template_id AND version_number = p_target_version_number;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version not found';
    END IF;

    -- Create new version with rollback content
    SELECT public.create_consent_template_version(
        p_template_id,
        v_target_title,
        v_target_content,
        'Restaurado desde versión ' || p_target_version_number,
        p_user_id
    ) INTO v_version_id;

    RETURN v_version_id;
END;
$$;

COMMENT ON FUNCTION public.rollback_consent_template_version IS 'Rolls back a template to a previous version by creating a new version with the old content';

-- =============================================================================
-- 5. MIGRATE EXISTING TEMPLATES
-- =============================================================================
-- Create initial version records for existing templates

INSERT INTO public.consent_template_versions (
    template_id,
    version_number,
    version_label,
    title,
    content_html,
    change_summary,
    is_published,
    published_at,
    created_by,
    created_at
)
SELECT
    id,
    1,
    COALESCE(version, '1.0'),
    title,
    content_html,
    'Versión inicial',
    true,
    COALESCE(published_at, created_at),
    created_by,
    created_at
FROM public.consent_templates
WHERE deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.consent_template_versions
    WHERE template_id = consent_templates.id
);

-- Set published_at for existing templates that don't have it
UPDATE public.consent_templates
SET published_at = created_at
WHERE published_at IS NULL AND deleted_at IS NULL;

-- =============================================================================
-- 6. GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_template_versions TO authenticated;
GRANT ALL ON public.consent_template_versions TO service_role;
GRANT EXECUTE ON FUNCTION public.create_consent_template_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_consent_template_version TO authenticated;
