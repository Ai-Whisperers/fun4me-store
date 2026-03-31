-- OPS-002: Performance Metrics History
-- Stores historical performance metrics for 30+ day analysis
--
-- This table captures periodic snapshots of platform performance metrics
-- to enable trend analysis, capacity planning, and regression detection.

-- Table for storing periodic metric snapshots
CREATE TABLE IF NOT EXISTS performance_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Overall status
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),

    -- API metrics
    api_response_avg_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    api_response_p50_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    api_response_p95_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    api_response_p99_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    api_requests_total INTEGER NOT NULL DEFAULT 0,
    api_errors_total INTEGER NOT NULL DEFAULT 0,
    api_error_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
    api_requests_per_minute NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- Database metrics
    db_query_avg_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    db_slow_query_count INTEGER NOT NULL DEFAULT 0,
    db_critical_query_count INTEGER NOT NULL DEFAULT 0,
    db_slow_query_rate NUMERIC(6,4) NOT NULL DEFAULT 0,

    -- System metrics
    memory_heap_used_mb INTEGER NOT NULL DEFAULT 0,
    memory_heap_total_mb INTEGER NOT NULL DEFAULT 0,
    memory_rss_mb INTEGER NOT NULL DEFAULT 0,
    memory_external_mb INTEGER NOT NULL DEFAULT 0,

    -- Uptime
    uptime_ms BIGINT NOT NULL DEFAULT 0,

    -- Raw metrics snapshot (for detailed analysis)
    counters JSONB DEFAULT '{}',
    gauges JSONB DEFAULT '{}',
    histograms JSONB DEFAULT '{}',

    -- Metadata
    environment TEXT NOT NULL DEFAULT 'production',
    node_version TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-based queries (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_performance_metrics_history_timestamp
    ON performance_metrics_history(timestamp DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_performance_metrics_history_status
    ON performance_metrics_history(status, timestamp DESC);

-- Index for environment filtering
CREATE INDEX IF NOT EXISTS idx_performance_metrics_history_environment
    ON performance_metrics_history(environment, timestamp DESC);

-- Enable RLS (platform admins only)
ALTER TABLE performance_metrics_history ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can view all metrics
CREATE POLICY "Platform admins can view metrics"
    ON performance_metrics_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = TRUE
        )
    );

-- Policy: Service role can insert metrics (for cron jobs)
CREATE POLICY "Service role can insert metrics"
    ON performance_metrics_history
    FOR INSERT
    WITH CHECK (TRUE);

-- Function to clean up old metrics (keep 90 days by default)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM performance_metrics_history
    WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- Comment on table and columns
COMMENT ON TABLE performance_metrics_history IS 'OPS-002: Historical performance metrics for trend analysis';
COMMENT ON COLUMN performance_metrics_history.status IS 'Overall system health: healthy, degraded, or critical';
COMMENT ON COLUMN performance_metrics_history.api_response_avg_ms IS 'Average API response time in milliseconds';
COMMENT ON COLUMN performance_metrics_history.api_error_rate IS 'Ratio of errors to total requests (0.0 to 1.0)';
COMMENT ON COLUMN performance_metrics_history.db_slow_query_rate IS 'Ratio of slow queries (>100ms) to total queries';
COMMENT ON COLUMN performance_metrics_history.counters IS 'Raw counter metrics snapshot';
COMMENT ON COLUMN performance_metrics_history.histograms IS 'Raw histogram metrics snapshot';
