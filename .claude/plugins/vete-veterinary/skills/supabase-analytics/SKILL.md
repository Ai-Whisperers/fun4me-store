---
name: supabase-analytics
description: Supabase-specific analytics patterns for dashboards including RLS-aware queries, time-series analysis, cohort analysis, and tenant-isolated aggregations. Use when building analytics features for the Vete platform.
---

# Supabase Analytics Patterns

## Overview

This skill covers Supabase-specific patterns for building analytics dashboards with proper tenant isolation through RLS, efficient aggregations, and time-series analysis.

---

## 1. RLS-Aware Analytics Functions

### Tenant-Scoped Statistics Function

```sql
-- Create a function for dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify caller has access to tenant
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'totalClients', (
      SELECT COUNT(*) FROM profiles
      WHERE tenant_id = p_tenant_id AND role = 'owner'
    ),
    'totalPets', (
      SELECT COUNT(*) FROM pets
      WHERE tenant_id = p_tenant_id
    ),
    'appointmentsToday', (
      SELECT COUNT(*) FROM appointments
      WHERE tenant_id = p_tenant_id
      AND DATE(start_time AT TIME ZONE 'America/Asuncion') = CURRENT_DATE
    ),
    'appointmentsThisWeek', (
      SELECT COUNT(*) FROM appointments
      WHERE tenant_id = p_tenant_id
      AND start_time >= DATE_TRUNC('week', NOW())
      AND start_time < DATE_TRUNC('week', NOW()) + INTERVAL '7 days'
    ),
    'revenueToday', (
      SELECT COALESCE(SUM(total), 0) FROM invoices
      WHERE tenant_id = p_tenant_id
      AND status = 'paid'
      AND DATE(created_at AT TIME ZONE 'America/Asuncion') = CURRENT_DATE
    ),
    'revenueThisMonth', (
      SELECT COALESCE(SUM(total), 0) FROM invoices
      WHERE tenant_id = p_tenant_id
      AND status = 'paid'
      AND created_at >= DATE_TRUNC('month', NOW())
    ),
    'pendingAppointments', (
      SELECT COUNT(*) FROM appointments
      WHERE tenant_id = p_tenant_id
      AND status = 'pending'
      AND start_time >= NOW()
    ),
    'lowStockProducts', (
      SELECT COUNT(*) FROM store_inventory si
      JOIN store_products sp ON sp.id = si.product_id
      WHERE sp.tenant_id = p_tenant_id
      AND si.stock_quantity <= si.reorder_point
    )
  ) INTO result;

  RETURN result;
END;
$$;
```

### Time-Series Revenue Query

```sql
-- Daily revenue for the past 30 days
CREATE OR REPLACE FUNCTION get_revenue_time_series(
  p_tenant_id TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC,
  invoice_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS date
  ),
  daily_revenue AS (
    SELECT
      DATE(created_at AT TIME ZONE 'America/Asuncion') AS date,
      SUM(total) AS revenue,
      COUNT(*)::INTEGER AS invoice_count
    FROM invoices
    WHERE tenant_id = p_tenant_id
    AND status = 'paid'
    AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY DATE(created_at AT TIME ZONE 'America/Asuncion')
  )
  SELECT
    ds.date,
    COALESCE(dr.revenue, 0) AS revenue,
    COALESCE(dr.invoice_count, 0) AS invoice_count
  FROM date_series ds
  LEFT JOIN daily_revenue dr ON ds.date = dr.date
  ORDER BY ds.date;
END;
$$;
```

### Appointment Analytics

```sql
-- Appointment statistics by status and service
CREATE OR REPLACE FUNCTION get_appointment_analytics(
  p_tenant_id TEXT,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'byStatus', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT status, COUNT(*) AS count
        FROM appointments
        WHERE tenant_id = p_tenant_id
        AND DATE(start_time) BETWEEN p_start_date AND p_end_date
        GROUP BY status
      ) t
    ),
    'byService', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT s.name AS service_name, COUNT(*) AS count
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.tenant_id = p_tenant_id
        AND DATE(a.start_time) BETWEEN p_start_date AND p_end_date
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'byDayOfWeek', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          EXTRACT(DOW FROM start_time) AS day_of_week,
          TO_CHAR(start_time, 'Day') AS day_name,
          COUNT(*) AS count
        FROM appointments
        WHERE tenant_id = p_tenant_id
        AND DATE(start_time) BETWEEN p_start_date AND p_end_date
        GROUP BY EXTRACT(DOW FROM start_time), TO_CHAR(start_time, 'Day')
        ORDER BY day_of_week
      ) t
    ),
    'byHour', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          EXTRACT(HOUR FROM start_time AT TIME ZONE 'America/Asuncion') AS hour,
          COUNT(*) AS count
        FROM appointments
        WHERE tenant_id = p_tenant_id
        AND DATE(start_time) BETWEEN p_start_date AND p_end_date
        GROUP BY EXTRACT(HOUR FROM start_time AT TIME ZONE 'America/Asuncion')
        ORDER BY hour
      ) t
    ),
    'completionRate', (
      SELECT
        ROUND(
          COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
          NULLIF(COUNT(*), 0) * 100,
          1
        )
      FROM appointments
      WHERE tenant_id = p_tenant_id
      AND DATE(start_time) BETWEEN p_start_date AND p_end_date
    ),
    'noShowRate', (
      SELECT
        ROUND(
          COUNT(*) FILTER (WHERE status = 'no_show')::NUMERIC /
          NULLIF(COUNT(*), 0) * 100,
          1
        )
      FROM appointments
      WHERE tenant_id = p_tenant_id
      AND DATE(start_time) BETWEEN p_start_date AND p_end_date
    )
  ) INTO result;

  RETURN result;
END;
$$;
```

---

## 2. Cohort Analysis

### Client Retention Cohort

```sql
-- Monthly cohort retention analysis
CREATE OR REPLACE FUNCTION get_client_retention_cohorts(
  p_tenant_id TEXT,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  cohort_month DATE,
  month_number INTEGER,
  clients_count INTEGER,
  retained_count INTEGER,
  retention_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH client_cohorts AS (
    -- First appointment date determines cohort
    SELECT
      p.id AS client_id,
      DATE_TRUNC('month', MIN(a.start_time))::DATE AS cohort_month
    FROM profiles p
    JOIN appointments a ON a.pet_id IN (SELECT id FROM pets WHERE owner_id = p.id)
    WHERE p.tenant_id = p_tenant_id
    AND p.role = 'owner'
    GROUP BY p.id
  ),
  client_activity AS (
    -- All months where client had activity
    SELECT DISTINCT
      cc.client_id,
      cc.cohort_month,
      DATE_TRUNC('month', a.start_time)::DATE AS activity_month
    FROM client_cohorts cc
    JOIN pets pet ON pet.owner_id = cc.client_id
    JOIN appointments a ON a.pet_id = pet.id
    WHERE a.status IN ('completed', 'confirmed')
  ),
  cohort_sizes AS (
    SELECT cohort_month, COUNT(DISTINCT client_id) AS cohort_size
    FROM client_cohorts
    WHERE cohort_month >= DATE_TRUNC('month', NOW()) - (p_months || ' months')::INTERVAL
    GROUP BY cohort_month
  ),
  retention AS (
    SELECT
      ca.cohort_month,
      EXTRACT(MONTH FROM AGE(ca.activity_month, ca.cohort_month))::INTEGER AS month_number,
      COUNT(DISTINCT ca.client_id) AS retained
    FROM client_activity ca
    WHERE ca.cohort_month >= DATE_TRUNC('month', NOW()) - (p_months || ' months')::INTERVAL
    GROUP BY ca.cohort_month, EXTRACT(MONTH FROM AGE(ca.activity_month, ca.cohort_month))
  )
  SELECT
    cs.cohort_month,
    r.month_number,
    cs.cohort_size AS clients_count,
    r.retained AS retained_count,
    ROUND((r.retained::NUMERIC / cs.cohort_size) * 100, 1) AS retention_rate
  FROM cohort_sizes cs
  JOIN retention r ON r.cohort_month = cs.cohort_month
  ORDER BY cs.cohort_month, r.month_number;
END;
$$;
```

### Pet Health Cohort (Vaccination Compliance)

```sql
-- Vaccination compliance by registration month
CREATE OR REPLACE FUNCTION get_vaccine_compliance_cohorts(
  p_tenant_id TEXT
)
RETURNS TABLE (
  cohort_month DATE,
  total_pets INTEGER,
  vaccinated_count INTEGER,
  compliance_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH pet_cohorts AS (
    SELECT
      id AS pet_id,
      DATE_TRUNC('month', created_at)::DATE AS cohort_month
    FROM pets
    WHERE tenant_id = p_tenant_id
    AND created_at >= NOW() - INTERVAL '12 months'
  ),
  vaccination_status AS (
    SELECT
      pc.cohort_month,
      pc.pet_id,
      EXISTS (
        SELECT 1 FROM vaccines v
        WHERE v.pet_id = pc.pet_id
        AND v.status = 'completed'
        AND v.administered_date >= NOW() - INTERVAL '1 year'
      ) AS is_vaccinated
    FROM pet_cohorts pc
  )
  SELECT
    vs.cohort_month,
    COUNT(*)::INTEGER AS total_pets,
    COUNT(*) FILTER (WHERE vs.is_vaccinated)::INTEGER AS vaccinated_count,
    ROUND(
      COUNT(*) FILTER (WHERE vs.is_vaccinated)::NUMERIC /
      NULLIF(COUNT(*), 0) * 100,
      1
    ) AS compliance_rate
  FROM vaccination_status vs
  GROUP BY vs.cohort_month
  ORDER BY vs.cohort_month;
END;
$$;
```

---

## 3. TypeScript Integration Patterns

### Dashboard Hook with React Query

```typescript
// hooks/use-dashboard-stats.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  totalClients: number;
  totalPets: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  revenueToday: number;
  revenueThisMonth: number;
  pendingAppointments: number;
  lowStockProducts: number;
}

export function useDashboardStats(tenantId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });
}
```

### Time Series Chart Component

```typescript
// components/analytics/revenue-chart.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatGuarani } from '@/lib/utils/currency-paraguay';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  invoice_count: number;
}

export function RevenueChart({ tenantId, days = 30 }: { tenantId: string; days?: number }) {
  const supabase = createClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['revenue-time-series', tenantId, days],
    queryFn: async (): Promise<RevenueDataPoint[]> => {
      const { data, error } = await supabase.rpc('get_revenue_time_series', {
        p_tenant_id: tenantId,
        p_days: days,
      });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded" />;
  if (error) return <div className="text-red-500">Error al cargar datos</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' })}
          />
          <YAxis
            tickFormatter={(value) => formatGuarani(value, { showSymbol: false })}
          />
          <Tooltip
            formatter={(value: number) => formatGuarani(value)}
            labelFormatter={(date) => new Date(date).toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Server Action for Analytics

```typescript
// actions/analytics.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getDashboardAnalytics() {
  const supabase = await createClient();

  // Get current user's tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    throw new Error('No autorizado');
  }

  // Fetch all analytics in parallel
  const [stats, revenue, appointments] = await Promise.all([
    supabase.rpc('get_dashboard_stats', { p_tenant_id: profile.tenant_id }),
    supabase.rpc('get_revenue_time_series', { p_tenant_id: profile.tenant_id, p_days: 30 }),
    supabase.rpc('get_appointment_analytics', { p_tenant_id: profile.tenant_id }),
  ]);

  return {
    stats: stats.data,
    revenue: revenue.data,
    appointments: appointments.data,
  };
}
```

---

## 4. Materialized Views for Performance

### Daily Summary Materialized View

```sql
-- Materialized view for daily summaries (refresh nightly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_clinic_summary AS
SELECT
  tenant_id,
  DATE(created_at AT TIME ZONE 'America/Asuncion') AS date,

  -- Appointments
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') AS completed_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'no_show') AS no_show_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') AS cancelled_appointments,

  -- Revenue
  COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) AS daily_revenue,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'paid') AS paid_invoices,

  -- Clients
  COUNT(DISTINCT a.pet_id) AS unique_pets_seen,
  COUNT(DISTINCT p.owner_id) AS unique_clients,

  -- New registrations
  COUNT(DISTINCT new_pets.id) AS new_pet_registrations,
  COUNT(DISTINCT new_clients.id) AS new_client_registrations

FROM appointments a
LEFT JOIN invoices i ON i.tenant_id = a.tenant_id
  AND DATE(i.created_at AT TIME ZONE 'America/Asuncion') = DATE(a.start_time AT TIME ZONE 'America/Asuncion')
LEFT JOIN pets p ON p.id = a.pet_id
LEFT JOIN pets new_pets ON new_pets.tenant_id = a.tenant_id
  AND DATE(new_pets.created_at AT TIME ZONE 'America/Asuncion') = DATE(a.start_time AT TIME ZONE 'America/Asuncion')
LEFT JOIN profiles new_clients ON new_clients.tenant_id = a.tenant_id
  AND new_clients.role = 'owner'
  AND DATE(new_clients.created_at AT TIME ZONE 'America/Asuncion') = DATE(a.start_time AT TIME ZONE 'America/Asuncion')
WHERE a.start_time >= NOW() - INTERVAL '1 year'
GROUP BY tenant_id, DATE(created_at AT TIME ZONE 'America/Asuncion');

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON mv_daily_clinic_summary (tenant_id, date);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_daily_summary()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_clinic_summary;
END;
$$;
```

### Cron Job for Refresh

```typescript
// api/cron/refresh-analytics/route.ts
import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.rpc('refresh_daily_summary');

  if (error) {
    console.error('Failed to refresh analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, refreshedAt: new Date().toISOString() });
}
```

---

## 5. Top N Queries Pattern

### Top Services/Products

```sql
-- Top performing services
CREATE OR REPLACE FUNCTION get_top_services(
  p_tenant_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  service_id UUID,
  service_name TEXT,
  appointment_count BIGINT,
  total_revenue NUMERIC,
  avg_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS service_id,
    s.name AS service_name,
    COUNT(a.id) AS appointment_count,
    COALESCE(SUM(ii.unit_price * ii.quantity), 0) AS total_revenue,
    ROUND(AVG(r.rating), 1) AS avg_rating
  FROM services s
  LEFT JOIN appointments a ON a.service_id = s.id
    AND DATE(a.start_time) BETWEEN p_start_date AND p_end_date
    AND a.status = 'completed'
  LEFT JOIN invoice_items ii ON ii.service_id = s.id
    AND ii.created_at BETWEEN p_start_date AND p_end_date
  LEFT JOIN reviews r ON r.service_id = s.id
  WHERE s.tenant_id = p_tenant_id
  GROUP BY s.id, s.name
  ORDER BY appointment_count DESC
  LIMIT p_limit;
END;
$$;

-- Top selling products
CREATE OR REPLACE FUNCTION get_top_products(
  p_tenant_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  sku TEXT,
  units_sold BIGINT,
  total_revenue NUMERIC,
  current_stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    sp.id AS product_id,
    sp.name AS product_name,
    sp.sku,
    COALESCE(SUM(soi.quantity), 0) AS units_sold,
    COALESCE(SUM(soi.unit_price * soi.quantity), 0) AS total_revenue,
    si.stock_quantity AS current_stock
  FROM store_products sp
  LEFT JOIN store_order_items soi ON soi.product_id = sp.id
  LEFT JOIN store_orders so ON so.id = soi.order_id
    AND so.status IN ('completed', 'delivered')
    AND DATE(so.created_at) BETWEEN p_start_date AND p_end_date
  LEFT JOIN store_inventory si ON si.product_id = sp.id
  WHERE sp.tenant_id = p_tenant_id
  GROUP BY sp.id, sp.name, sp.sku, si.stock_quantity
  ORDER BY units_sold DESC
  LIMIT p_limit;
END;
$$;
```

---

## 6. Comparison Queries (Period over Period)

```sql
-- Compare current period vs previous period
CREATE OR REPLACE FUNCTION get_period_comparison(
  p_tenant_id TEXT,
  p_current_start DATE,
  p_current_end DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_length INTEGER;
  previous_start DATE;
  previous_end DATE;
  result JSON;
BEGIN
  IF NOT is_staff_of(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Calculate previous period of same length
  period_length := p_current_end - p_current_start;
  previous_end := p_current_start - INTERVAL '1 day';
  previous_start := previous_end - (period_length || ' days')::INTERVAL;

  SELECT json_build_object(
    'current', json_build_object(
      'startDate', p_current_start,
      'endDate', p_current_end,
      'revenue', (
        SELECT COALESCE(SUM(total), 0) FROM invoices
        WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND DATE(created_at) BETWEEN p_current_start AND p_current_end
      ),
      'appointments', (
        SELECT COUNT(*) FROM appointments
        WHERE tenant_id = p_tenant_id
        AND DATE(start_time) BETWEEN p_current_start AND p_current_end
      ),
      'newClients', (
        SELECT COUNT(*) FROM profiles
        WHERE tenant_id = p_tenant_id AND role = 'owner'
        AND DATE(created_at) BETWEEN p_current_start AND p_current_end
      )
    ),
    'previous', json_build_object(
      'startDate', previous_start,
      'endDate', previous_end,
      'revenue', (
        SELECT COALESCE(SUM(total), 0) FROM invoices
        WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND DATE(created_at) BETWEEN previous_start AND previous_end
      ),
      'appointments', (
        SELECT COUNT(*) FROM appointments
        WHERE tenant_id = p_tenant_id
        AND DATE(start_time) BETWEEN previous_start AND previous_end
      ),
      'newClients', (
        SELECT COUNT(*) FROM profiles
        WHERE tenant_id = p_tenant_id AND role = 'owner'
        AND DATE(created_at) BETWEEN previous_start AND previous_end
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;
```

---

*Reference: Supabase documentation, PostgreSQL analytics patterns*
