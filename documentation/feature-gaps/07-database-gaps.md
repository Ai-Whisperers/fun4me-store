# Database Schema Gaps

This document identifies database tables, columns, and structures that need to be added to support missing features.

**Note**: Many schemas were recently added (December 2024) in files 21-32. This document focuses on remaining gaps.

---

## Current Schema Status

### Implemented Schemas (Files 01-32)
| File | Domain | Status |
|------|--------|--------|
| 01_core.sql | Tenants, profiles, triggers | ✅ Complete |
| 02_users.sql | Auth triggers, invites | ✅ Complete |
| 03_pets.sql | Pets, QR tags | ✅ Complete |
| 04_medical.sql | Medical records | ✅ Complete |
| 05_reference.sql | Vaccines, diagnosis codes | ✅ Complete |
| 06_appointments.sql | Appointments | ✅ Complete |
| 07_inventory.sql | Store products, inventory | ✅ Complete |
| 08_finance.sql | Loyalty, expenses | ✅ Complete |
| 09_safety.sql | Lost pets, QR codes | ✅ Complete |
| 10_audit.sql | Audit logs | ✅ Complete |
| 21_invoicing.sql | Services, invoices, payments | ✅ Complete |
| 22_reminders.sql | Notification queue | ✅ Complete |
| 23_hospitalization.sql | Kennels, treatments | ✅ Complete |
| 24_lab_results.sql | Lab orders, results | ✅ Complete |
| 25_consent.sql | Consent management | ✅ Complete |
| 26_staff.sql | Staff scheduling | ✅ Complete |
| 27_messaging.sql | Conversations, messages | ✅ Complete |
| 28_insurance.sql | Insurance policies, claims | ✅ Complete |
| 29_soft_deletes.sql | Soft delete infrastructure | ✅ Complete |
| 30_enhanced_audit.sql | Enhanced audit logging | ✅ Complete |
| 31_materialized_views.sql | Dashboard views | ✅ Complete |
| 32_scheduled_jobs.sql | pg_cron jobs | ✅ Complete |

---

## Schema Gaps to Address

### 1. Patient Alerts/Flags 🔴 CRITICAL

Required for staff to see important warnings about patients.

```sql
-- web/db/33_patient_alerts.sql

CREATE TABLE IF NOT EXISTS patient_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'aggressive', 'fearful', 'allergy', 'handling', 
    'financial', 'vip', 'medical', 'custom'
  )),
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'danger')),
  title TEXT NOT NULL,
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_alerts_pet ON patient_alerts(pet_id, is_active);
CREATE INDEX idx_patient_alerts_type ON patient_alerts(tenant_id, alert_type);

ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage alerts"
  ON patient_alerts FOR ALL
  TO authenticated
  USING (is_staff_of(tenant_id))
  WITH CHECK (is_staff_of(tenant_id));
```

---

### 2. Problem List (Medical Conditions) 🟡 HIGH

Track ongoing medical conditions per patient.

```sql
-- Add to existing or create new file

CREATE TABLE IF NOT EXISTS patient_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  problem_name TEXT NOT NULL,
  diagnosis_code_id UUID REFERENCES diagnosis_codes(id),
  icd_code TEXT,
  onset_date DATE,
  resolved_date DATE,
  is_chronic BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_problems_pet ON patient_problems(pet_id, is_active);
```

---

### 3. Exam Rooms 🟢 MEDIUM

For multi-room clinics.

```sql
CREATE TABLE IF NOT EXISTS exam_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT DEFAULT 'exam' CHECK (room_type IN (
    'exam', 'surgery', 'imaging', 'treatment', 'other'
  )),
  capacity INT DEFAULT 1,
  equipment TEXT[], -- Array of equipment in room
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES exam_rooms(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  UNIQUE(appointment_id, room_id, released_at)
);
```

---

### 4. Anesthesia Monitoring 🟡 HIGH

For surgery procedures.

```sql
CREATE TABLE IF NOT EXISTS anesthesia_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id),
  appointment_id UUID REFERENCES appointments(id),
  medical_record_id UUID REFERENCES medical_records(id),
  procedure_name TEXT NOT NULL,
  anesthesia_protocol TEXT,
  pre_anesthesia_assessment JSONB,
  induction_time TIMESTAMPTZ,
  maintenance_start TIMESTAMPTZ,
  recovery_start TIMESTAMPTZ,
  extubation_time TIMESTAMPTZ,
  full_recovery_time TIMESTAMPTZ,
  complications TEXT,
  outcome TEXT DEFAULT 'normal' CHECK (outcome IN ('normal', 'complicated', 'critical')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anesthesia_vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anesthesia_log_id UUID NOT NULL REFERENCES anesthesia_logs(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  heart_rate INT,
  respiratory_rate INT,
  spo2 DECIMAL(5,2),
  etco2 DECIMAL(5,2),
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  blood_pressure_mean INT,
  temperature DECIMAL(4,2),
  anesthesia_depth TEXT CHECK (anesthesia_depth IN (
    'light', 'surgical', 'deep', 'too_deep'
  )),
  iv_fluids_rate DECIMAL(6,2),
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_anesthesia_vitals_log ON anesthesia_vitals(anesthesia_log_id, recorded_at);
```

---

### 5. User Devices (Push Notifications) 🟡 HIGH

For mobile push notifications.

```sql
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  device_name TEXT,
  device_model TEXT,
  os_version TEXT,
  app_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id, is_active);
```

---

### 6. Tenant Subscriptions (SaaS Billing) 🟢 MEDIUM

For platform billing.

```sql
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY, -- 'basic', 'pro', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB,
  limits JSONB, -- { users: 5, sms_per_month: 100, storage_gb: 5 }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled', 'suspended'
  )),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sms_sent INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  active_users INT DEFAULT 0,
  appointments_created INT DEFAULT 0,
  invoices_created INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_start)
);
```

---

### 7. Promotions & Discounts 🟢 MEDIUM

For marketing campaigns.

```sql
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  minimum_purchase DECIMAL(10,2),
  maximum_discount DECIMAL(10,2),
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'services', 'products')),
  applicable_items UUID[], -- Specific service/product IDs
  usage_limit INT,
  usage_per_customer INT DEFAULT 1,
  times_used INT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS promotion_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES profiles(id),
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 8. Appointment Recurring Patterns 🟢 MEDIUM

For recurring appointments.

```sql
CREATE TABLE IF NOT EXISTS appointment_recurrence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id),
  service_id UUID REFERENCES services(id),
  pattern TEXT NOT NULL CHECK (pattern IN (
    'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
  )),
  day_of_week INT, -- 0-6 for weekly
  day_of_month INT, -- 1-31 for monthly
  time_of_day TIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  starts_on DATE NOT NULL,
  ends_on DATE,
  max_occurrences INT,
  occurrences_created INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link appointments to recurrence pattern
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES appointment_recurrence(id);
```

---

## Column Additions to Existing Tables

### profiles table
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'PY',
  secondary_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  preferred_contact_method TEXT DEFAULT 'email' 
    CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp')),
  communication_preferences JSONB DEFAULT '{"marketing": true, "reminders": true}'::jsonb,
  timezone TEXT DEFAULT 'America/Asuncion',
  locale TEXT DEFAULT 'es-PY';
```

### tenants table
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  social_links JSONB,
  business_hours JSONB,
  appointment_settings JSONB DEFAULT '{
    "slot_duration": 30,
    "buffer_time": 0,
    "max_advance_days": 30,
    "cancellation_hours": 24,
    "require_confirmation": true
  }'::jsonb,
  notification_settings JSONB,
  subscription_tier TEXT DEFAULT 'basic',
  features_enabled TEXT[];
```

### appointments table
```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  room_id UUID REFERENCES exam_rooms(id),
  wait_time_minutes INT,
  visit_duration_minutes INT;
```

### pets table
```sql
ALTER TABLE pets ADD COLUMN IF NOT EXISTS
  insurance_policy_id UUID REFERENCES pet_insurance_policies(id),
  primary_vet_id UUID REFERENCES profiles(id),
  preferred_appointment_time TEXT,
  behavioral_notes TEXT,
  last_visit_date DATE,
  next_visit_due DATE;
```

---

## Indexes to Add

```sql
-- Improve common queries

-- Appointments by status for today
CREATE INDEX IF NOT EXISTS idx_appointments_today_status
  ON appointments(tenant_id, DATE(start_time), status);

-- Active conversations
CREATE INDEX IF NOT EXISTS idx_conversations_active
  ON conversations(tenant_id, status, last_message_at DESC)
  WHERE deleted_at IS NULL;

-- Pending invoices
CREATE INDEX IF NOT EXISTS idx_invoices_pending
  ON invoices(tenant_id, status, due_date)
  WHERE status IN ('draft', 'sent', 'partial');

-- Upcoming vaccines
CREATE INDEX IF NOT EXISTS idx_vaccines_upcoming
  ON vaccines(tenant_id, next_dose_date)
  WHERE next_dose_date IS NOT NULL;
```

---

## Migration Notes

When applying these changes:

1. **Always use IF NOT EXISTS** - Migrations should be idempotent
2. **Test on staging first** - Verify RLS policies work correctly
3. **Add indexes CONCURRENTLY** in production
4. **Backfill data** after adding columns if needed
5. **Update TypeScript types** in `lib/types/database.ts`
