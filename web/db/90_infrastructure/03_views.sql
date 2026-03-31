-- =============================================================================
-- 03_VIEWS.SQL
-- =============================================================================
-- Dashboard views for analytics and monitoring.
--
-- Views:
--   - low_stock_products     → Products below minimum stock
--   - expiring_products      → Products expiring within 30 days
--   - public_health_heatmap  → Disease report aggregation
--   - overdue_vaccines       → Pets with overdue vaccinations
--   - upcoming_appointments  → Today's and upcoming appointments
--   - active_hospitalizations→ Current inpatients
--   - unpaid_invoices        → Invoices pending payment
--   - pending_lab_orders     → Lab orders awaiting results
--   - staff_workload         → Staff appointment counts
--
-- Dependencies: All domain tables
-- =============================================================================

-- =============================================================================
-- LOW STOCK PRODUCTS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.low_stock_products AS
SELECT
    p.id,
    p.tenant_id,
    p.name,
    p.sku,
    p.image_url,
    i.stock_quantity,
    i.min_stock_level,
    i.reorder_quantity,
    i.expiry_date,
    i.batch_number,
    c.name AS category_name,
    (i.min_stock_level - i.stock_quantity) AS quantity_needed
FROM public.store_products p
INNER JOIN public.store_inventory i ON p.id = i.product_id
LEFT JOIN public.store_categories c ON p.category_id = c.id
WHERE i.stock_quantity <= i.min_stock_level
  AND p.is_active = TRUE
  AND p.deleted_at IS NULL;

COMMENT ON VIEW public.low_stock_products IS 'Products with stock at or below minimum level';

-- =============================================================================
-- EXPIRING PRODUCTS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.expiring_products AS
SELECT
    p.id,
    p.tenant_id,
    p.name,
    p.sku,
    p.image_url,
    i.stock_quantity,
    i.expiry_date,
    i.batch_number,
    c.name AS category_name,
    (i.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM public.store_products p
INNER JOIN public.store_inventory i ON p.id = i.product_id
LEFT JOIN public.store_categories c ON p.category_id = c.id
WHERE i.expiry_date IS NOT NULL
  AND i.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  AND i.expiry_date >= CURRENT_DATE
  AND i.stock_quantity > 0
  AND p.is_active = TRUE
  AND p.deleted_at IS NULL
ORDER BY i.expiry_date ASC;

COMMENT ON VIEW public.expiring_products IS 'Products expiring within 30 days';

-- =============================================================================
-- PUBLIC HEALTH HEATMAP VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.public_health_heatmap AS
SELECT
    dr.diagnosis_code,
    dr.diagnosis_name,
    dr.species,
    dr.location_zone,
    DATE_TRUNC('week', dr.case_date) AS week,
    COUNT(*) AS report_count,
    SUM(dr.case_count) AS total_cases,
    ROUND(AVG(CASE
        WHEN dr.severity = 'mild' THEN 1
        WHEN dr.severity = 'moderate' THEN 2
        WHEN dr.severity = 'severe' THEN 3
        WHEN dr.severity = 'critical' THEN 4
    END)::NUMERIC, 2) AS avg_severity
FROM public.disease_reports dr
WHERE dr.case_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY
    dr.diagnosis_code,
    dr.diagnosis_name,
    dr.species,
    dr.location_zone,
    DATE_TRUNC('week', dr.case_date)
ORDER BY week DESC, total_cases DESC;

COMMENT ON VIEW public.public_health_heatmap IS 'Disease report aggregation for epidemiology';

-- =============================================================================
-- OVERDUE VACCINES VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.overdue_vaccines AS
SELECT
    v.id AS vaccine_id,
    v.pet_id,
    v.tenant_id,
    v.name AS vaccine_name,
    v.next_due_date,
    (CURRENT_DATE - v.next_due_date) AS days_overdue,
    p.name AS pet_name,
    p.species,
    p.breed,
    p.owner_id,
    pr.full_name AS owner_name,
    pr.phone AS owner_phone,
    pr.email AS owner_email
FROM public.vaccines v
INNER JOIN public.pets p ON v.pet_id = p.id
LEFT JOIN public.profiles pr ON p.owner_id = pr.id
WHERE v.next_due_date < CURRENT_DATE
  AND v.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND v.status = 'completed'
ORDER BY v.next_due_date ASC;

COMMENT ON VIEW public.overdue_vaccines IS 'Pets with overdue vaccinations';

-- =============================================================================
-- UPCOMING APPOINTMENTS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.upcoming_appointments AS
SELECT
    a.id,
    a.tenant_id,
    a.pet_id,
    a.service_id,
    a.vet_id,
    a.start_time,
    a.end_time,
    a.status,
    a.reason,
    a.notes,
    p.name AS pet_name,
    p.species,
    p.photo_url AS pet_photo,
    pr.full_name AS owner_name,
    pr.phone AS owner_phone,
    s.name AS service_name,
    s.duration_minutes,
    s.color AS service_color,
    v.full_name AS vet_name,
    CASE
        WHEN a.start_time::DATE = CURRENT_DATE THEN 'today'
        WHEN a.start_time::DATE = CURRENT_DATE + 1 THEN 'tomorrow'
        ELSE 'upcoming'
    END AS time_category
FROM public.appointments a
INNER JOIN public.pets p ON a.pet_id = p.id
LEFT JOIN public.profiles pr ON p.owner_id = pr.id
LEFT JOIN public.services s ON a.service_id = s.id
LEFT JOIN public.profiles v ON a.vet_id = v.id
WHERE a.start_time >= CURRENT_DATE
  AND a.start_time < CURRENT_DATE + INTERVAL '7 days'
  AND a.status NOT IN ('cancelled', 'no_show')
  AND a.deleted_at IS NULL
ORDER BY a.start_time ASC;

COMMENT ON VIEW public.upcoming_appointments IS 'Appointments for the next 7 days';

-- =============================================================================
-- ACTIVE HOSPITALIZATIONS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.active_hospitalizations AS
SELECT
    h.id,
    h.tenant_id,
    h.pet_id,
    h.kennel_id,
    h.admission_number,
    h.admitted_at,
    h.reason,
    h.diagnosis,
    h.status,
    h.acuity_level,
    h.estimated_cost,
    p.name AS pet_name,
    p.species,
    p.breed,
    p.photo_url AS pet_photo,
    pr.full_name AS owner_name,
    pr.phone AS owner_phone,
    k.name AS kennel_name,
    k.code AS kennel_code,
    k.kennel_type,
    v.full_name AS primary_vet_name,
    k.daily_rate,
    EXTRACT(DAY FROM NOW() - h.admitted_at)::INTEGER AS days_hospitalized,
    (COALESCE(k.daily_rate, 0) * EXTRACT(DAY FROM NOW() - h.admitted_at))::NUMERIC(12,2) AS accrued_charges,
    (
        SELECT jsonb_build_object(
            'temperature', hv.temperature,
            'heart_rate', hv.heart_rate,
            'pain_score', hv.pain_score,
            'recorded_at', hv.recorded_at
        )
        FROM public.hospitalization_vitals hv
        WHERE hv.hospitalization_id = h.id
        ORDER BY hv.recorded_at DESC
        LIMIT 1
    ) AS latest_vitals
FROM public.hospitalizations h
INNER JOIN public.pets p ON h.pet_id = p.id
LEFT JOIN public.profiles pr ON p.owner_id = pr.id
LEFT JOIN public.kennels k ON h.kennel_id = k.id
LEFT JOIN public.profiles v ON h.primary_vet_id = v.id
WHERE h.status IN ('admitted', 'in_treatment', 'observation', 'critical')
ORDER BY
    CASE h.acuity_level
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        ELSE 4
    END,
    h.admitted_at DESC;

COMMENT ON VIEW public.active_hospitalizations IS 'Currently hospitalized patients';

-- =============================================================================
-- UNPAID INVOICES VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.unpaid_invoices AS
SELECT
    i.id,
    i.tenant_id,
    i.invoice_number,
    i.client_id,
    i.pet_id,
    i.invoice_date,
    i.due_date,
    i.total,
    i.amount_paid,
    i.balance_due,
    i.status,
    CASE
        WHEN i.due_date < CURRENT_DATE THEN (CURRENT_DATE - i.due_date)
        ELSE 0
    END AS days_overdue,
    CASE
        WHEN i.due_date < CURRENT_DATE - 90 THEN 'critical'
        WHEN i.due_date < CURRENT_DATE - 30 THEN 'warning'
        WHEN i.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'current'
    END AS aging_status,
    pr.full_name AS client_name,
    pr.phone AS client_phone,
    pr.email AS client_email,
    p.name AS pet_name
FROM public.invoices i
LEFT JOIN public.profiles pr ON i.client_id = pr.id
LEFT JOIN public.pets p ON i.pet_id = p.id
WHERE i.balance_due > 0
  AND i.status NOT IN ('cancelled', 'refunded', 'draft')
  AND i.deleted_at IS NULL
ORDER BY
    CASE
        WHEN i.due_date < CURRENT_DATE THEN 0
        ELSE 1
    END,
    i.due_date ASC;

COMMENT ON VIEW public.unpaid_invoices IS 'Invoices with outstanding balance';

-- =============================================================================
-- PENDING LAB ORDERS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.pending_lab_orders AS
SELECT
    lo.id,
    lo.tenant_id,
    lo.order_number,
    lo.pet_id,
    lo.created_at AS ordered_at,
    lo.status,
    lo.priority,
    lo.clinical_notes AS notes,
    p.name AS pet_name,
    p.species,
    pr.full_name AS owner_name,
    ov.full_name AS ordered_by_name,
    (
        SELECT COUNT(*)
        FROM public.lab_order_items loi
        WHERE loi.lab_order_id = lo.id
    ) AS test_count,
    (
        SELECT COUNT(*)
        FROM public.lab_order_items loi
        WHERE loi.lab_order_id = lo.id AND loi.status = 'completed'
    ) AS completed_tests
FROM public.lab_orders lo
INNER JOIN public.pets p ON lo.pet_id = p.id
LEFT JOIN public.profiles pr ON p.owner_id = pr.id
LEFT JOIN public.profiles ov ON lo.ordered_by = ov.id
WHERE lo.status IN ('pending', 'in_progress', 'partial')
  AND lo.deleted_at IS NULL
ORDER BY
    CASE lo.priority
        WHEN 'stat' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'routine' THEN 3
        ELSE 4
    END,
    lo.created_at ASC;

COMMENT ON VIEW public.pending_lab_orders IS 'Lab orders awaiting results';

-- =============================================================================
-- STAFF WORKLOAD VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_workload AS
SELECT
    pr.id AS staff_id,
    pr.tenant_id,
    pr.full_name,
    pr.role,
    (
        SELECT COUNT(*)
        FROM public.appointments a
        WHERE a.vet_id = pr.id
          AND a.start_time::DATE = CURRENT_DATE
          AND a.status NOT IN ('cancelled', 'no_show')
    ) AS today_appointments,
    (
        SELECT COUNT(*)
        FROM public.appointments a
        WHERE a.vet_id = pr.id
          AND a.start_time >= CURRENT_DATE
          AND a.start_time < CURRENT_DATE + 7
          AND a.status NOT IN ('cancelled', 'no_show')
    ) AS week_appointments,
    (
        SELECT COUNT(*)
        FROM public.hospitalizations h
        WHERE h.primary_vet_id = pr.id
          AND h.status IN ('admitted', 'in_treatment', 'observation', 'critical')
    ) AS active_hospitalizations,
    (
        SELECT COUNT(*)
        FROM public.lab_orders lo
        WHERE lo.ordered_by = pr.id
          AND lo.status IN ('pending', 'in_progress')
    ) AS pending_lab_orders
FROM public.profiles pr
WHERE pr.role IN ('vet', 'admin')
  AND pr.deleted_at IS NULL
ORDER BY pr.full_name;

COMMENT ON VIEW public.staff_workload IS 'Staff appointment and workload summary';

-- =============================================================================
-- CLINIC DASHBOARD STATS FUNCTION
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_clinic_stats(TEXT);
CREATE OR REPLACE FUNCTION public.get_clinic_stats(p_tenant_id TEXT)
RETURNS TABLE (
    total_pets BIGINT,
    total_clients BIGINT,
    pending_vaccines BIGINT,
    overdue_vaccines BIGINT,
    today_appointments BIGINT,
    week_appointments BIGINT,
    active_hospitalizations BIGINT,
    unpaid_invoices BIGINT,
    unpaid_amount NUMERIC,
    low_stock_items BIGINT,
    pending_lab_orders BIGINT,
    unread_messages BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.pets WHERE tenant_id = p_tenant_id AND deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = p_tenant_id AND role = 'owner' AND deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.vaccines v
         WHERE v.tenant_id = p_tenant_id AND v.status = 'scheduled' AND v.deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.vaccines v
         WHERE v.tenant_id = p_tenant_id AND v.next_due_date < CURRENT_DATE AND v.status = 'completed' AND v.deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.appointments
         WHERE tenant_id = p_tenant_id AND start_time::DATE = CURRENT_DATE AND status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.appointments
         WHERE tenant_id = p_tenant_id AND start_time >= CURRENT_DATE AND start_time < CURRENT_DATE + 7 AND status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.hospitalizations
         WHERE tenant_id = p_tenant_id AND status IN ('admitted', 'in_treatment', 'observation', 'critical'))::BIGINT,
        (SELECT COUNT(*) FROM public.invoices WHERE tenant_id = p_tenant_id AND balance_due > 0 AND status NOT IN ('cancelled', 'refunded', 'draft') AND deleted_at IS NULL)::BIGINT,
        (SELECT COALESCE(SUM(balance_due), 0) FROM public.invoices WHERE tenant_id = p_tenant_id AND balance_due > 0 AND status NOT IN ('cancelled', 'refunded', 'draft') AND deleted_at IS NULL)::NUMERIC,
        (SELECT COUNT(*) FROM public.store_inventory i
         JOIN public.store_products p ON i.product_id = p.id
         WHERE p.tenant_id = p_tenant_id AND i.stock_quantity <= i.min_stock_level AND p.is_active = TRUE AND p.deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.lab_orders WHERE tenant_id = p_tenant_id AND status IN ('pending', 'in_progress') AND deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.conversations c
         WHERE c.tenant_id = p_tenant_id AND c.status = 'open'
         AND EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = c.id AND m.sender_type = 'client' AND m.status = 'delivered'))::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_clinic_stats IS 'Returns dashboard summary statistics for a clinic';

-- =============================================================================
-- NETWORK STATS FUNCTION (Cross-tenant)
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_network_stats();
CREATE OR REPLACE FUNCTION public.get_network_stats()
RETURNS TABLE (
    total_tenants BIGINT,
    active_tenants BIGINT,
    total_pets BIGINT,
    total_users BIGINT,
    total_appointments BIGINT,
    top_species JSONB,
    active_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.tenants)::BIGINT,
        (SELECT COUNT(*) FROM public.tenants WHERE is_active = TRUE)::BIGINT,
        (SELECT COUNT(*) FROM public.pets WHERE deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL)::BIGINT,
        (SELECT COUNT(*) FROM public.appointments WHERE deleted_at IS NULL)::BIGINT,
        (SELECT jsonb_agg(row_to_json(s)) FROM (
            SELECT species, COUNT(*) as count
            FROM public.pets
            WHERE deleted_at IS NULL
            GROUP BY species
            ORDER BY count DESC
            LIMIT 5
        ) s),
        (SELECT COUNT(DISTINCT tenant_id) FROM public.appointments
         WHERE start_time::DATE = CURRENT_DATE AND deleted_at IS NULL)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_network_stats IS 'Returns network-wide statistics';

-- =============================================================================
-- REVENUE SUMMARY FUNCTION
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_revenue_summary(TEXT, DATE, DATE);
CREATE OR REPLACE FUNCTION public.get_revenue_summary(
    p_tenant_id TEXT,
    p_start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_revenue NUMERIC,
    total_collected NUMERIC,
    total_outstanding NUMERIC,
    invoice_count BIGINT,
    avg_invoice_value NUMERIC,
    payment_count BIGINT,
    refund_total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COALESCE(SUM(total), 0) FROM public.invoices
         WHERE tenant_id = p_tenant_id AND invoice_date BETWEEN p_start_date AND p_end_date
         AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL)::NUMERIC,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM public.invoices
         WHERE tenant_id = p_tenant_id AND invoice_date BETWEEN p_start_date AND p_end_date
         AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL)::NUMERIC,
        (SELECT COALESCE(SUM(balance_due), 0) FROM public.invoices
         WHERE tenant_id = p_tenant_id AND invoice_date BETWEEN p_start_date AND p_end_date
         AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL)::NUMERIC,
        (SELECT COUNT(*) FROM public.invoices
         WHERE tenant_id = p_tenant_id AND invoice_date BETWEEN p_start_date AND p_end_date
         AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL)::BIGINT,
        (SELECT COALESCE(AVG(total), 0) FROM public.invoices
         WHERE tenant_id = p_tenant_id AND invoice_date BETWEEN p_start_date AND p_end_date
         AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL)::NUMERIC,
        (SELECT COUNT(*) FROM public.payments p
         JOIN public.invoices i ON p.invoice_id = i.id
         WHERE i.tenant_id = p_tenant_id AND p.payment_date BETWEEN p_start_date AND p_end_date
         AND p.status = 'completed' AND p.deleted_at IS NULL)::BIGINT,
        (SELECT COALESCE(SUM(r.amount), 0) FROM public.refunds r
         JOIN public.payments p ON r.payment_id = p.id
         JOIN public.invoices i ON p.invoice_id = i.id
         WHERE i.tenant_id = p_tenant_id AND r.created_at::DATE BETWEEN p_start_date AND p_end_date
         AND r.status = 'completed')::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_revenue_summary IS 'Returns revenue summary for a date range';

-- =============================================================================
-- GRANT ACCESS TO VIEWS
-- =============================================================================

GRANT SELECT ON public.low_stock_products TO authenticated;
GRANT SELECT ON public.expiring_products TO authenticated;
GRANT SELECT ON public.public_health_heatmap TO authenticated;
GRANT SELECT ON public.overdue_vaccines TO authenticated;
GRANT SELECT ON public.upcoming_appointments TO authenticated;
GRANT SELECT ON public.active_hospitalizations TO authenticated;
GRANT SELECT ON public.unpaid_invoices TO authenticated;
GRANT SELECT ON public.pending_lab_orders TO authenticated;
GRANT SELECT ON public.staff_workload TO authenticated;


