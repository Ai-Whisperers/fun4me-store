-- Migration: Consent Preferences
-- COMP-003: Granular consent tracking for user preferences
--
-- This migration creates tables for tracking user consent preferences
-- separate from the existing procedure-based consent templates.

-- Consent type enum
CREATE TYPE consent_preference_type AS ENUM (
  'medical_treatment',
  'data_processing',
  'marketing_email',
  'marketing_sms',
  'third_party_sharing',
  'analytics_cookies',
  'photo_sharing',
  'marketing_whatsapp',
  'push_notifications'
);

-- Consent source enum
CREATE TYPE consent_source AS ENUM (
  'signup',
  'settings',
  'procedure',
  'banner',
  'api',
  'import'
);

-- Consent preferences table
CREATE TABLE consent_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_type consent_preference_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  source consent_source NOT NULL DEFAULT 'settings',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One preference per type per user per tenant
  CONSTRAINT unique_consent_preference UNIQUE (user_id, tenant_id, consent_type),

  -- If granted, must have granted_at
  CONSTRAINT check_granted_at CHECK (
    (NOT granted) OR (granted AND granted_at IS NOT NULL)
  ),

  -- If withdrawn, must have withdrawn_at and not be granted
  CONSTRAINT check_withdrawn_at CHECK (
    (withdrawn_at IS NULL) OR (NOT granted AND withdrawn_at IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE consent_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users view own preferences" ON consent_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage their own preferences
CREATE POLICY "Users manage own preferences" ON consent_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Staff can view preferences for their tenant
CREATE POLICY "Staff view tenant preferences" ON consent_preferences
  FOR SELECT
  USING (is_staff_of(tenant_id));

-- Consent preference audit log
CREATE TABLE consent_preference_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id UUID NOT NULL REFERENCES consent_preferences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_type consent_preference_type NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  source consent_source NOT NULL,
  ip_address INET,
  user_agent TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consent_preference_audit ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit log
CREATE POLICY "Users view own audit" ON consent_preference_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Staff can view audit for their tenant
CREATE POLICY "Staff view tenant audit" ON consent_preference_audit
  FOR SELECT
  USING (is_staff_of(tenant_id));

-- Indexes for performance
CREATE INDEX idx_consent_preferences_user ON consent_preferences(user_id);
CREATE INDEX idx_consent_preferences_tenant ON consent_preferences(tenant_id);
CREATE INDEX idx_consent_preferences_type ON consent_preferences(consent_type);
CREATE INDEX idx_consent_preferences_granted ON consent_preferences(granted) WHERE granted = true;

CREATE INDEX idx_consent_audit_preference ON consent_preference_audit(preference_id);
CREATE INDEX idx_consent_audit_user ON consent_preference_audit(user_id);
CREATE INDEX idx_consent_audit_tenant ON consent_preference_audit(tenant_id);
CREATE INDEX idx_consent_audit_changed ON consent_preference_audit(changed_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_consent_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_preferences_updated_at
  BEFORE UPDATE ON consent_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_consent_preferences_updated_at();

-- Trigger to auto-log consent changes
CREATE OR REPLACE FUNCTION log_consent_preference_change()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO consent_preference_audit (
      preference_id,
      user_id,
      tenant_id,
      consent_type,
      old_value,
      new_value,
      source
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.tenant_id,
      NEW.consent_type,
      NULL,
      NEW.granted,
      NEW.source
    );
    RETURN NEW;
  END IF;

  -- On UPDATE (only if granted value changed)
  IF TG_OP = 'UPDATE' AND OLD.granted IS DISTINCT FROM NEW.granted THEN
    INSERT INTO consent_preference_audit (
      preference_id,
      user_id,
      tenant_id,
      consent_type,
      old_value,
      new_value,
      source
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.tenant_id,
      NEW.consent_type,
      OLD.granted,
      NEW.granted,
      NEW.source
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER consent_preference_audit_trigger
  AFTER INSERT OR UPDATE ON consent_preferences
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_preference_change();

-- Helper function to get user consent status
CREATE OR REPLACE FUNCTION get_user_consent_status(
  p_user_id UUID,
  p_tenant_id TEXT
)
RETURNS TABLE (
  consent_type consent_preference_type,
  granted BOOLEAN,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  source consent_source,
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.consent_type,
    cp.granted,
    cp.granted_at,
    cp.withdrawn_at,
    cp.source,
    cp.version
  FROM consent_preferences cp
  WHERE cp.user_id = p_user_id
    AND cp.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has granted a specific consent
CREATE OR REPLACE FUNCTION has_consent(
  p_user_id UUID,
  p_tenant_id TEXT,
  p_consent_type consent_preference_type
)
RETURNS BOOLEAN AS $$
DECLARE
  v_granted BOOLEAN;
BEGIN
  SELECT granted INTO v_granted
  FROM consent_preferences
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND consent_type = p_consent_type;

  -- Return false if no preference found or not granted
  RETURN COALESCE(v_granted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get consent analytics for a tenant
CREATE OR REPLACE FUNCTION get_consent_analytics(
  p_tenant_id TEXT
)
RETURNS TABLE (
  consent_type consent_preference_type,
  total_users BIGINT,
  granted_count BIGINT,
  withdrawn_count BIGINT,
  grant_rate NUMERIC,
  changes_last_30_days BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_count AS (
    SELECT COUNT(DISTINCT id) as total
    FROM profiles
    WHERE tenant_id = p_tenant_id
  ),
  consent_stats AS (
    SELECT
      cp.consent_type,
      COUNT(*) FILTER (WHERE cp.granted = true) as granted,
      COUNT(*) FILTER (WHERE cp.granted = false AND cp.withdrawn_at IS NOT NULL) as withdrawn
    FROM consent_preferences cp
    WHERE cp.tenant_id = p_tenant_id
    GROUP BY cp.consent_type
  ),
  recent_changes AS (
    SELECT
      cpa.consent_type,
      COUNT(*) as changes
    FROM consent_preference_audit cpa
    WHERE cpa.tenant_id = p_tenant_id
      AND cpa.changed_at >= NOW() - INTERVAL '30 days'
    GROUP BY cpa.consent_type
  )
  SELECT
    ct.consent_type,
    uc.total as total_users,
    COALESCE(cs.granted, 0) as granted_count,
    COALESCE(cs.withdrawn, 0) as withdrawn_count,
    CASE
      WHEN uc.total > 0
      THEN ROUND((COALESCE(cs.granted, 0)::NUMERIC / uc.total) * 100, 2)
      ELSE 0
    END as grant_rate,
    COALESCE(rc.changes, 0) as changes_last_30_days
  FROM (
    SELECT unnest(enum_range(NULL::consent_preference_type)) as consent_type
  ) ct
  CROSS JOIN user_count uc
  LEFT JOIN consent_stats cs ON cs.consent_type = ct.consent_type
  LEFT JOIN recent_changes rc ON rc.consent_type = ct.consent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on tables
COMMENT ON TABLE consent_preferences IS 'User consent preferences for marketing, data processing, etc. COMP-003';
COMMENT ON TABLE consent_preference_audit IS 'Audit trail for consent preference changes. COMP-003';
COMMENT ON FUNCTION get_user_consent_status IS 'Get all consent preferences for a user';
COMMENT ON FUNCTION has_consent IS 'Check if user has granted a specific consent type';
COMMENT ON FUNCTION get_consent_analytics IS 'Get consent analytics for a tenant';
