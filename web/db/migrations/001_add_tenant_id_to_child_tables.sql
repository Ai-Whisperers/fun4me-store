-- =============================================================================
-- 001_ADD_TENANT_ID_TO_CHILD_TABLES.SQL
-- =============================================================================
-- Adds tenant_id to child tables that are missing it for better RLS performance.
-- This eliminates expensive JOINs in RLS policy checks.
--
-- Tables affected:
--   - vaccines
--   - vaccine_reactions
--   - hospitalization_vitals
--   - hospitalization_medications
--   - hospitalization_treatments
--   - hospitalization_feedings
--   - hospitalization_notes
--   - invoice_items
--   - store_campaign_items
--   - qr_tag_scans
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. VACCINES TABLE
-- =============================================================================

-- Add tenant_id column
ALTER TABLE public.vaccines ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Backfill from pets
UPDATE public.vaccines v
SET tenant_id = p.tenant_id
FROM public.pets p
WHERE v.pet_id = p.id
AND v.tenant_id IS NULL;

-- Add NOT NULL and FK constraint
ALTER TABLE public.vaccines
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE public.vaccines
        ADD CONSTRAINT vaccines_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_vaccines_tenant ON public.vaccines(tenant_id);

-- Trigger to auto-populate tenant_id on insert
CREATE OR REPLACE FUNCTION public.vaccines_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.pets WHERE id = NEW.pet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vaccines_auto_tenant ON public.vaccines;
CREATE TRIGGER vaccines_auto_tenant
    BEFORE INSERT ON public.vaccines
    FOR EACH ROW EXECUTE FUNCTION public.vaccines_set_tenant_id();

-- =============================================================================
-- B. VACCINE_REACTIONS TABLE
-- =============================================================================

ALTER TABLE public.vaccine_reactions ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.vaccine_reactions vr
SET tenant_id = p.tenant_id
FROM public.pets p
WHERE vr.pet_id = p.id
AND vr.tenant_id IS NULL;

ALTER TABLE public.vaccine_reactions
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE public.vaccine_reactions
        ADD CONSTRAINT vaccine_reactions_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_tenant ON public.vaccine_reactions(tenant_id);

CREATE OR REPLACE FUNCTION public.vaccine_reactions_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.pets WHERE id = NEW.pet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vaccine_reactions_auto_tenant ON public.vaccine_reactions;
CREATE TRIGGER vaccine_reactions_auto_tenant
    BEFORE INSERT ON public.vaccine_reactions
    FOR EACH ROW EXECUTE FUNCTION public.vaccine_reactions_set_tenant_id();

-- =============================================================================
-- C. HOSPITALIZATION CHILD TABLES
-- =============================================================================

-- Helper function for hospitalization children
CREATE OR REPLACE FUNCTION public.get_hospitalization_tenant(p_hosp_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.hospitalizations WHERE id = p_hosp_id;
$$ LANGUAGE sql STABLE;

-- C.1 hospitalization_vitals
ALTER TABLE public.hospitalization_vitals ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.hospitalization_vitals hv
SET tenant_id = h.tenant_id
FROM public.hospitalizations h
WHERE hv.hospitalization_id = h.id
AND hv.tenant_id IS NULL;

DO $$ BEGIN
    ALTER TABLE public.hospitalization_vitals
        ADD CONSTRAINT hospitalization_vitals_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_tenant ON public.hospitalization_vitals(tenant_id);

CREATE OR REPLACE FUNCTION public.hospitalization_vitals_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.get_hospitalization_tenant(NEW.hospitalization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hospitalization_vitals_auto_tenant ON public.hospitalization_vitals;
CREATE TRIGGER hospitalization_vitals_auto_tenant
    BEFORE INSERT ON public.hospitalization_vitals
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_vitals_set_tenant_id();

-- C.2 hospitalization_medications
ALTER TABLE public.hospitalization_medications ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.hospitalization_medications hm
SET tenant_id = h.tenant_id
FROM public.hospitalizations h
WHERE hm.hospitalization_id = h.id
AND hm.tenant_id IS NULL;

DO $$ BEGIN
    ALTER TABLE public.hospitalization_medications
        ADD CONSTRAINT hospitalization_medications_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_tenant ON public.hospitalization_medications(tenant_id);

CREATE OR REPLACE FUNCTION public.hospitalization_medications_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.get_hospitalization_tenant(NEW.hospitalization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hospitalization_medications_auto_tenant ON public.hospitalization_medications;
CREATE TRIGGER hospitalization_medications_auto_tenant
    BEFORE INSERT ON public.hospitalization_medications
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_medications_set_tenant_id();

-- C.3 hospitalization_treatments
ALTER TABLE public.hospitalization_treatments ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.hospitalization_treatments ht
SET tenant_id = h.tenant_id
FROM public.hospitalizations h
WHERE ht.hospitalization_id = h.id
AND ht.tenant_id IS NULL;

DO $$ BEGIN
    ALTER TABLE public.hospitalization_treatments
        ADD CONSTRAINT hospitalization_treatments_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_hospitalization_treatments_tenant ON public.hospitalization_treatments(tenant_id);

CREATE OR REPLACE FUNCTION public.hospitalization_treatments_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.get_hospitalization_tenant(NEW.hospitalization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hospitalization_treatments_auto_tenant ON public.hospitalization_treatments;
CREATE TRIGGER hospitalization_treatments_auto_tenant
    BEFORE INSERT ON public.hospitalization_treatments
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_treatments_set_tenant_id();

-- C.4 hospitalization_feedings
ALTER TABLE public.hospitalization_feedings ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.hospitalization_feedings hf
SET tenant_id = h.tenant_id
FROM public.hospitalizations h
WHERE hf.hospitalization_id = h.id
AND hf.tenant_id IS NULL;

DO $$ BEGIN
    ALTER TABLE public.hospitalization_feedings
        ADD CONSTRAINT hospitalization_feedings_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_hospitalization_feedings_tenant ON public.hospitalization_feedings(tenant_id);

CREATE OR REPLACE FUNCTION public.hospitalization_feedings_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.get_hospitalization_tenant(NEW.hospitalization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hospitalization_feedings_auto_tenant ON public.hospitalization_feedings;
CREATE TRIGGER hospitalization_feedings_auto_tenant
    BEFORE INSERT ON public.hospitalization_feedings
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_feedings_set_tenant_id();

-- C.5 hospitalization_notes
ALTER TABLE public.hospitalization_notes ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.hospitalization_notes hn
SET tenant_id = h.tenant_id
FROM public.hospitalizations h
WHERE hn.hospitalization_id = h.id
AND hn.tenant_id IS NULL;

DO $$ BEGIN
    ALTER TABLE public.hospitalization_notes
        ADD CONSTRAINT hospitalization_notes_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_hospitalization_notes_tenant ON public.hospitalization_notes(tenant_id);

CREATE OR REPLACE FUNCTION public.hospitalization_notes_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.get_hospitalization_tenant(NEW.hospitalization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hospitalization_notes_auto_tenant ON public.hospitalization_notes;
CREATE TRIGGER hospitalization_notes_auto_tenant
    BEFORE INSERT ON public.hospitalization_notes
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_notes_set_tenant_id();

-- =============================================================================
-- D. INVOICE_ITEMS TABLE
-- =============================================================================

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.invoice_items ii
SET tenant_id = i.tenant_id
FROM public.invoices i
WHERE ii.invoice_id = i.id
AND ii.tenant_id IS NULL;

DO $$ BEGIN
    ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON public.invoice_items(tenant_id);

CREATE OR REPLACE FUNCTION public.invoice_items_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.invoices WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_items_auto_tenant ON public.invoice_items;
CREATE TRIGGER invoice_items_auto_tenant
    BEFORE INSERT ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.invoice_items_set_tenant_id();

-- =============================================================================
-- E. STORE_CAMPAIGN_ITEMS TABLE
-- =============================================================================

ALTER TABLE public.store_campaign_items ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.store_campaign_items sci
SET tenant_id = sc.tenant_id
FROM public.store_campaigns sc
WHERE sci.campaign_id = sc.id
AND sci.tenant_id IS NULL;

DO $$ BEGIN
    ALTER TABLE public.store_campaign_items
        ADD CONSTRAINT store_campaign_items_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_campaign_items_tenant ON public.store_campaign_items(tenant_id);

CREATE OR REPLACE FUNCTION public.store_campaign_items_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.store_campaigns WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS store_campaign_items_auto_tenant ON public.store_campaign_items;
CREATE TRIGGER store_campaign_items_auto_tenant
    BEFORE INSERT ON public.store_campaign_items
    FOR EACH ROW EXECUTE FUNCTION public.store_campaign_items_set_tenant_id();

-- =============================================================================
-- F. QR_TAG_SCANS TABLE
-- =============================================================================

ALTER TABLE public.qr_tag_scans ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE public.qr_tag_scans qts
SET tenant_id = qt.tenant_id
FROM public.qr_tags qt
WHERE qts.tag_id = qt.id
AND qts.tenant_id IS NULL;

-- Note: tenant_id can be NULL for qr_tag_scans if the tag has no tenant
DO $$ BEGIN
    ALTER TABLE public.qr_tag_scans
        ADD CONSTRAINT qr_tag_scans_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_qr_tag_scans_tenant ON public.qr_tag_scans(tenant_id);

CREATE OR REPLACE FUNCTION public.qr_tag_scans_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.qr_tags WHERE id = NEW.tag_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qr_tag_scans_auto_tenant ON public.qr_tag_scans;
CREATE TRIGGER qr_tag_scans_auto_tenant
    BEFORE INSERT ON public.qr_tag_scans
    FOR EACH ROW EXECUTE FUNCTION public.qr_tag_scans_set_tenant_id();

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================
-- Run these queries to verify the migration:
--
-- SELECT 'vaccines' as tbl, COUNT(*) as rows, COUNT(tenant_id) as with_tenant FROM vaccines
-- UNION ALL SELECT 'vaccine_reactions', COUNT(*), COUNT(tenant_id) FROM vaccine_reactions
-- UNION ALL SELECT 'hospitalization_vitals', COUNT(*), COUNT(tenant_id) FROM hospitalization_vitals
-- UNION ALL SELECT 'hospitalization_medications', COUNT(*), COUNT(tenant_id) FROM hospitalization_medications
-- UNION ALL SELECT 'hospitalization_treatments', COUNT(*), COUNT(tenant_id) FROM hospitalization_treatments
-- UNION ALL SELECT 'hospitalization_feedings', COUNT(*), COUNT(tenant_id) FROM hospitalization_feedings
-- UNION ALL SELECT 'hospitalization_notes', COUNT(*), COUNT(tenant_id) FROM hospitalization_notes
-- UNION ALL SELECT 'invoice_items', COUNT(*), COUNT(tenant_id) FROM invoice_items
-- UNION ALL SELECT 'store_campaign_items', COUNT(*), COUNT(tenant_id) FROM store_campaign_items
-- UNION ALL SELECT 'qr_tag_scans', COUNT(*), COUNT(tenant_id) FROM qr_tag_scans;
