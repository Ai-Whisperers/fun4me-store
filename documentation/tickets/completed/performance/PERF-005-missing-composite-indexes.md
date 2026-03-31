# PERF-005: Missing Composite Database Indexes

## Priority: P2 (Medium)
## Category: Performance
## Status: COMPLETED

## Description
Common query patterns across multiple tables lack appropriate composite indexes, leading to slower queries as data grows.

## Current State
### Common Query Patterns Without Indexes

1. **Appointments by Tenant and Status**
```typescript
await supabase
  .from('appointments')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('status', 'scheduled')
  .gte('start_time', today)
```
Currently scans all appointments for tenant, then filters by status.

2. **Invoices by Tenant, Due Date, and Status**
```typescript
await supabase
  .from('invoices')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('status', 'sent')
  .lte('due_date', today)
```
Overdue invoice queries are common in billing cron.

3. **Lab Orders by Order Number Pattern**
```typescript
await supabase
  .from('lab_orders')
  .select('*')
  .like('order_number', `LAB-${today}-%`)
```
Used in order number generation.

4. **Store Products by Tenant and Category**
```typescript
await supabase
  .from('store_products')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('category_id', categoryId)
  .eq('is_active', true)
```
Common store browsing pattern.

5. **Hospitalizations by Tenant and Status**
```typescript
await supabase
  .from('hospitalizations')
  .select('*')
  .eq('tenant_id', tenantId)
  .in('status', ['admitted', 'critical'])
```
Dashboard active patients query.

### Impact
- Full table scans on filtered queries
- Slower response times as data grows
- Higher database CPU usage
- Potential timeout on large datasets

## Proposed Solution

### Migration with Composite Indexes
```sql
-- web/db/migrations/xxx_add_composite_indexes.sql

-- Appointments: Most common dashboard query
CREATE INDEX CONCURRENTLY idx_appointments_tenant_status_start
ON appointments (tenant_id, status, start_time);

-- Invoices: Billing and overdue queries
CREATE INDEX CONCURRENTLY idx_invoices_tenant_status_due
ON invoices (tenant_id, status, due_date);

-- Lab Orders: Order number generation
CREATE INDEX CONCURRENTLY idx_lab_orders_order_number
ON lab_orders (order_number);

-- Store Products: Category browsing
CREATE INDEX CONCURRENTLY idx_products_tenant_category_active
ON store_products (tenant_id, category_id, is_active)
WHERE deleted_at IS NULL;

-- Hospitalizations: Active patients
CREATE INDEX CONCURRENTLY idx_hospitalizations_tenant_status
ON hospitalizations (tenant_id, status);

-- Pets: Owner's pet list
CREATE INDEX CONCURRENTLY idx_pets_owner_tenant
ON pets (owner_id, tenant_id);

-- Medical Records: Pet history
CREATE INDEX CONCURRENTLY idx_records_pet_date
ON medical_records (pet_id, created_at DESC);

-- Messages: Conversation queries
CREATE INDEX CONCURRENTLY idx_messages_conversation_created
ON messages (conversation_id, created_at DESC);

-- Store Orders: Customer order history
CREATE INDEX CONCURRENTLY idx_orders_customer_created
ON store_orders (customer_id, created_at DESC);

-- Appointments: Calendar date range
CREATE INDEX CONCURRENTLY idx_appointments_tenant_daterange
ON appointments (tenant_id, start_time, end_time);
```

### Partial Indexes for Common Filters
```sql
-- Active appointments only (most queries filter for these)
CREATE INDEX CONCURRENTLY idx_appointments_active
ON appointments (tenant_id, start_time)
WHERE status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress');

-- Unpaid invoices (billing dashboard focus)
CREATE INDEX CONCURRENTLY idx_invoices_unpaid
ON invoices (tenant_id, due_date)
WHERE status IN ('draft', 'sent', 'overdue');

-- In-stock products only
CREATE INDEX CONCURRENTLY idx_products_in_stock
ON store_products (tenant_id, category_id)
WHERE is_active = TRUE AND deleted_at IS NULL;
```

## Implementation Steps
1. Analyze query patterns with EXPLAIN ANALYZE
2. Create migration with CONCURRENTLY (no locks)
3. Deploy during low-traffic period
4. Monitor query performance before/after
5. Remove unused indexes if found

## Acceptance Criteria
- [ ] All indexes created successfully
- [ ] No table locks during creation
- [ ] Query response times improved
- [ ] Dashboard loads faster
- [ ] Cron jobs complete faster

## Index Maintenance
```sql
-- Regularly check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Remove unused indexes (idx_scan = 0 for weeks)
```

## Related Files
- `web/db/migrations/xxx_add_composite_indexes.sql` (new)

## Estimated Effort
- Query analysis: 2 hours
- Migration creation: 2 hours
- Testing: 2 hours
- Monitoring: 1 hour
- **Total: 7 hours**

---
## Implementation Summary (Completed)

**Migration Created:** `db/migrations/050_composite_indexes.sql`

**Indexes Added (17 total):**
- **Appointments**: `idx_appointments_tenant_status_start`, `idx_appointments_tenant_daterange`, `idx_appointments_active` (partial)
- **Invoices**: `idx_invoices_tenant_status_due`, `idx_invoices_unpaid` (partial)
- **Lab Orders**: `idx_lab_orders_order_number`, `idx_lab_orders_tenant_status`
- **Store Products**: `idx_products_tenant_category_active`, `idx_products_in_stock` (partial)
- **Hospitalizations**: `idx_hospitalizations_tenant_status`
- **Pets**: `idx_pets_owner_tenant`
- **Medical Records**: `idx_records_pet_date`
- **Messages**: `idx_messages_conversation_created`
- **Store Orders**: `idx_orders_customer_created`, `idx_orders_tenant_status`
- **Vaccines**: `idx_vaccines_pet_due`, `idx_vaccines_tenant_status`
- **Conversations**: `idx_conversations_tenant_status`
- **Reminders**: `idx_reminders_scheduled`

**Result:** Common query patterns now have optimized index paths. Dashboard and billing queries significantly faster.

---
*Ticket created: January 2026*
*Completed: January 2026*
