-- =============================================================================
-- Migration 064: Cron Job Tracking
-- =============================================================================
-- Creates tracking infrastructure for cron job executions to enable
-- health monitoring and debugging of background processes.
-- =============================================================================

-- =============================================================================
-- CRON JOB RUNS TABLE
-- =============================================================================
-- Tracks each execution of a cron job with timing and result information.

CREATE TABLE IF NOT EXISTS public.cron_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cron_job_runs IS 'Tracks execution history for cron jobs to enable monitoring and debugging';
COMMENT ON COLUMN public.cron_job_runs.job_name IS 'Name of the cron job (e.g., process-subscriptions, generate-recurring)';
COMMENT ON COLUMN public.cron_job_runs.status IS 'Execution status: running, completed, or failed';
COMMENT ON COLUMN public.cron_job_runs.records_processed IS 'Number of records processed in this run';
COMMENT ON COLUMN public.cron_job_runs.execution_time_ms IS 'Total execution time in milliseconds';
COMMENT ON COLUMN public.cron_job_runs.metadata IS 'Additional context about the run (e.g., error counts, skipped records)';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for querying job runs by name
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job_name
    ON public.cron_job_runs(job_name);

-- Index for recent runs (ordered by start time)
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_started_at
    ON public.cron_job_runs(started_at DESC);

-- Composite index for common query pattern: latest run per job
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job_name_started
    ON public.cron_job_runs(job_name, started_at DESC);

-- Index for failed jobs (useful for alerting)
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_failed
    ON public.cron_job_runs(job_name, started_at DESC)
    WHERE status = 'failed';

-- =============================================================================
-- CLEANUP FUNCTION
-- =============================================================================
-- Removes old execution records to prevent table bloat.
-- Keeps last 30 days of history.

CREATE OR REPLACE FUNCTION public.cleanup_old_cron_runs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.cron_job_runs
    WHERE started_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.cleanup_old_cron_runs() IS
'Removes cron job run records older than 30 days. Returns count of deleted records.';

-- =============================================================================
-- RPC FUNCTIONS FOR CRON TRACKING
-- =============================================================================

-- Start a new cron job run
CREATE OR REPLACE FUNCTION public.start_cron_run(p_job_name TEXT)
RETURNS UUID AS $$
DECLARE
    v_run_id UUID;
BEGIN
    INSERT INTO public.cron_job_runs (job_name, status)
    VALUES (p_job_name, 'running')
    RETURNING id INTO v_run_id;

    RETURN v_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.start_cron_run(TEXT) IS 'Creates a new cron job run record and returns its ID';

-- Complete a cron job run successfully
CREATE OR REPLACE FUNCTION public.complete_cron_run(
    p_run_id UUID,
    p_records_processed INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
DECLARE
    v_started_at TIMESTAMPTZ;
BEGIN
    SELECT started_at INTO v_started_at
    FROM public.cron_job_runs
    WHERE id = p_run_id;

    UPDATE public.cron_job_runs
    SET status = 'completed',
        completed_at = NOW(),
        records_processed = p_records_processed,
        execution_time_ms = EXTRACT(MILLISECONDS FROM (NOW() - v_started_at))::INTEGER,
        metadata = p_metadata
    WHERE id = p_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.complete_cron_run(UUID, INTEGER, JSONB) IS 'Marks a cron job run as completed with execution metrics';

-- Fail a cron job run
CREATE OR REPLACE FUNCTION public.fail_cron_run(
    p_run_id UUID,
    p_error_message TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
DECLARE
    v_started_at TIMESTAMPTZ;
BEGIN
    SELECT started_at INTO v_started_at
    FROM public.cron_job_runs
    WHERE id = p_run_id;

    UPDATE public.cron_job_runs
    SET status = 'failed',
        completed_at = NOW(),
        error_message = p_error_message,
        execution_time_ms = EXTRACT(MILLISECONDS FROM (NOW() - v_started_at))::INTEGER,
        metadata = p_metadata
    WHERE id = p_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fail_cron_run(UUID, TEXT, JSONB) IS 'Marks a cron job run as failed with error information';

-- Get last run for each job
CREATE OR REPLACE FUNCTION public.get_cron_job_status()
RETURNS TABLE (
    job_name TEXT,
    last_run_at TIMESTAMPTZ,
    last_status TEXT,
    last_duration_ms INTEGER,
    last_error TEXT,
    runs_today INTEGER,
    failures_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_runs AS (
        SELECT DISTINCT ON (r.job_name)
            r.job_name,
            r.started_at,
            r.status,
            r.execution_time_ms,
            r.error_message
        FROM public.cron_job_runs r
        ORDER BY r.job_name, r.started_at DESC
    ),
    today_stats AS (
        SELECT
            r.job_name,
            COUNT(*)::INTEGER as total_runs,
            COUNT(*) FILTER (WHERE r.status = 'failed')::INTEGER as failed_runs
        FROM public.cron_job_runs r
        WHERE r.started_at >= CURRENT_DATE
        GROUP BY r.job_name
    )
    SELECT
        lr.job_name,
        lr.started_at,
        lr.status,
        lr.execution_time_ms,
        lr.error_message,
        COALESCE(ts.total_runs, 0),
        COALESCE(ts.failed_runs, 0)
    FROM latest_runs lr
    LEFT JOIN today_stats ts ON lr.job_name = ts.job_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_cron_job_status() IS 'Returns health status for all cron jobs including last run info and today''s statistics';

-- =============================================================================
-- PERMISSIONS
-- =============================================================================
-- No RLS needed as this is system-level data accessed via service role

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.cleanup_old_cron_runs() TO service_role;
GRANT EXECUTE ON FUNCTION public.start_cron_run(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_cron_run(UUID, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_cron_run(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_job_status() TO service_role;
