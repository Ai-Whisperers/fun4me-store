#!/bin/bash
# =============================================================================
# FIND MISSING updated_at TRIGGERS
# =============================================================================
# Finds tables with updated_at column but missing trigger
#
# TICKET: TICKET-DB-004
# =============================================================================

set -e

echo "🔍 Finding tables missing updated_at triggers..."
echo ""

psql "$DATABASE_URL" -t -c "
SELECT 
    t.table_schema || '.' || t.table_name AS full_table_name,
    CASE 
        WHEN tg.tgname IS NULL THEN '❌ MISSING'
        ELSE '✅ HAS TRIGGER'
    END AS trigger_status
FROM information_schema.tables t
INNER JOIN information_schema.columns c 
    ON c.table_schema = t.table_schema 
    AND c.table_name = t.table_name
LEFT JOIN pg_class pc 
    ON pc.relname = t.table_name 
    AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = t.table_schema)
LEFT JOIN pg_trigger tg 
    ON tg.tgrelid = pc.oid 
    AND tg.tgname = 'handle_updated_at'
WHERE t.table_schema IN ('public', 'archive')
    AND t.table_type = 'BASE TABLE'
    AND c.column_name = 'updated_at'
ORDER BY 
    CASE WHEN tg.tgname IS NULL THEN 0 ELSE 1 END,
    t.table_schema,
    t.table_name;
" | grep -E "MISSING|HAS TRIGGER"

echo ""
echo "Summary:"
psql "$DATABASE_URL" -t -c "
SELECT 
    CASE 
        WHEN tg.tgname IS NULL THEN 'Missing triggers'
        ELSE 'Has triggers'
    END AS status,
    COUNT(*) AS table_count
FROM information_schema.tables t
INNER JOIN information_schema.columns c 
    ON c.table_schema = t.table_schema 
    AND c.table_name = t.table_name
LEFT JOIN pg_class pc 
    ON pc.relname = t.table_name 
    AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = t.table_schema)
LEFT JOIN pg_trigger tg 
    ON tg.tgrelid = pc.oid 
    AND tg.tgname = 'handle_updated_at'
WHERE t.table_schema IN ('public', 'archive')
    AND t.table_type = 'BASE TABLE'
    AND c.column_name = 'updated_at'
GROUP BY status;
"
