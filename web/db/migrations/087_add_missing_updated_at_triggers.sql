-- =============================================================================
-- 084_ADD_MISSING_UPDATED_AT_TRIGGERS.SQL
-- =============================================================================
-- Adds handle_updated_at() triggers to all tables with updated_at column
-- that are missing the automatic timestamp update trigger.
--
-- ISSUE: Some tables have updated_at column but no trigger to auto-update it,
-- causing stale timestamps when records are modified.
--
-- EPIC: EPIC-002-Database-Schema-Consistency
-- TICKET: TICKET-DB-004
-- =============================================================================

BEGIN;

-- Ensure handle_updated_at function exists
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all public schema tables with updated_at
DO $$
DECLARE
    table_record RECORD;
    trigger_exists BOOLEAN;
BEGIN
    FOR table_record IN
        SELECT DISTINCT t.table_name
        FROM information_schema.tables t
        INNER JOIN information_schema.columns c 
            ON c.table_schema = t.table_schema 
            AND c.table_name = t.table_name
        WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND c.column_name = 'updated_at'
        ORDER BY t.table_name
    LOOP
        -- Check if trigger already exists
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'handle_updated_at'
            AND tgrelid = ('public.' || table_record.table_name)::regclass
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            EXECUTE format('
                CREATE TRIGGER handle_updated_at
                BEFORE UPDATE ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION handle_updated_at()
            ', table_record.table_name);
            
            RAISE NOTICE 'Added trigger to: public.%', table_record.table_name;
        END IF;
    END LOOP;
END $$;

-- Add triggers for archive schema tables
DO $$
DECLARE
    table_record RECORD;
    trigger_exists BOOLEAN;
BEGIN
    FOR table_record IN
        SELECT DISTINCT t.table_name
        FROM information_schema.tables t
        INNER JOIN information_schema.columns c 
            ON c.table_schema = t.table_schema 
            AND c.table_name = t.table_name
        WHERE t.table_schema = 'archive'
            AND t.table_type = 'BASE TABLE'
            AND c.column_name = 'updated_at'
        ORDER BY t.table_name
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'handle_updated_at'
            AND tgrelid = ('archive.' || table_record.table_name)::regclass
        ) INTO trigger_exists;
        
        IF NOT trigger_exists THEN
            EXECUTE format('
                CREATE TRIGGER handle_updated_at
                BEFORE UPDATE ON archive.%I
                FOR EACH ROW
                EXECUTE FUNCTION handle_updated_at()
            ', table_record.table_name);
            
            RAISE NOTICE 'Added trigger to: archive.%', table_record.table_name;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    tables_with_column INTEGER;
    tables_with_trigger INTEGER;
BEGIN
    -- Count tables with updated_at
    SELECT COUNT(DISTINCT t.table_name) INTO tables_with_column
    FROM information_schema.tables t
    INNER JOIN information_schema.columns c 
        ON c.table_schema = t.table_schema 
        AND c.table_name = t.table_name
    WHERE t.table_schema IN ('public', 'archive')
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'updated_at';
    
    -- Count tables with trigger
    SELECT COUNT(DISTINCT pc.relname) INTO tables_with_trigger
    FROM information_schema.columns c
    INNER JOIN pg_class pc ON pc.relname = c.table_name
    INNER JOIN pg_namespace pn ON pn.oid = pc.relnamespace
    INNER JOIN pg_trigger pt ON pt.tgrelid = pc.oid
    WHERE pn.nspname IN ('public', 'archive')
        AND c.column_name = 'updated_at'
        AND pt.tgname = 'handle_updated_at';
    
    RAISE NOTICE 'Tables with updated_at column: %', tables_with_column;
    RAISE NOTICE 'Tables with handle_updated_at trigger: %', tables_with_trigger;
    
    IF tables_with_column = tables_with_trigger THEN
        RAISE NOTICE '✅ All tables with updated_at have triggers!';
    ELSE
        RAISE WARNING '⚠ Mismatch: % tables with column vs % with trigger', 
            tables_with_column, tables_with_trigger;
    END IF;
END $$;
