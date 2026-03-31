# Checkout System Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [x] Database function fix applied (`decrement_stock` uses correct table)
- [x] API endpoint optimized (uses atomic function)
- [x] Client code reviewed (no changes needed)
- [x] Cart context reviewed (no changes needed)

### 2. Documentation
- [x] System documentation created (`documentation/features/store-checkout.md`)
- [x] API reference created (`documentation/api/checkout-endpoint.md`)
- [x] Flow diagrams created (`documentation/architecture/checkout-flow.md`)
- [x] Implementation summary created (`CHECKOUT_IMPLEMENTATION_SUMMARY.md`)
- [x] This checklist created

### 3. Migration Preparation
- [x] Migration file created (`web/db/85_fix_checkout_inventory_table.sql`)
- [ ] Migration tested in local environment
- [ ] Migration backed up

## Deployment Steps

### Step 1: Database Migration

```bash
# Connect to database
cd web

# Option A: Using Supabase CLI
npx supabase db push

# Option B: Run SQL directly in Supabase dashboard
# Copy contents of web/db/85_fix_checkout_inventory_table.sql
# Paste into SQL Editor and execute
```

**Verification**:
```sql
-- Check function was updated
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'decrement_stock'
AND routine_definition LIKE '%store_inventory_transactions%';
```

Expected: 1 row returned

- [ ] Migration executed successfully
- [ ] Function verification passed

### Step 2: Code Deployment

```bash
# Build production
npm run build

# Test build locally
npm run start

# Deploy to hosting (Vercel/Netlify/etc)
# Follow your deployment process
```

- [ ] Build successful
- [ ] No build errors
- [ ] No TypeScript errors
- [ ] Deployed to production

### Step 3: Smoke Tests

#### Test 1: Authentication
```bash
curl https://vetic.ai-whisperers.org/api/store/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"items":[],"clinic":"adris"}'
```

Expected: `401 Unauthorized`
- [ ] Passed

#### Test 2: Empty Cart
```bash
# Use valid auth token
curl https://vetic.ai-whisperers.org/api/store/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"items":[],"clinic":"adris"}'
```

Expected: `400 Bad Request` with "El carrito está vacío"
- [ ] Passed

#### Test 3: Successful Checkout (Small Order)
```bash
curl https://vetic.ai-whisperers.org/api/store/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "id": "TEST-SKU",
        "name": "Test Product",
        "price": 1000,
        "type": "product",
        "quantity": 1
      }
    ],
    "clinic": "YOUR_TENANT"
  }'
```

Expected: `201 Created` with invoice details
- [ ] Passed

#### Test 4: Stock Error
```bash
curl https://vetic.ai-whisperers.org/api/store/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "id": "TEST-SKU",
        "name": "Test Product",
        "price": 1000,
        "type": "product",
        "quantity": 999999
      }
    ],
    "clinic": "YOUR_TENANT"
  }'
```

Expected: `400 Bad Request` with stockErrors array
- [ ] Passed

### Step 4: Database Verification

```sql
-- Check recent checkouts
SELECT * FROM invoices
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```
- [ ] Invoices created correctly

```sql
-- Check inventory transactions
SELECT * FROM store_inventory_transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
```
- [ ] Transactions logged correctly
- [ ] Negative quantities for sales
- [ ] Correct product_id and tenant_id

```sql
-- Check inventory levels updated
SELECT
  sp.name,
  si.stock_quantity,
  COUNT(sit.id) as transaction_count
FROM store_products sp
LEFT JOIN store_inventory si ON si.product_id = sp.id
LEFT JOIN store_inventory_transactions sit ON sit.product_id = sp.id
WHERE sit.created_at > NOW() - INTERVAL '1 hour'
GROUP BY sp.id, sp.name, si.stock_quantity;
```
- [ ] Stock quantities decreased correctly

```sql
-- Check audit logs
SELECT * FROM audit_logs
WHERE action = 'CHECKOUT'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```
- [ ] Audit logs created

### Step 5: End-to-End UI Test

1. **Login as customer**
   - [ ] Can login successfully
   - [ ] Redirected to appropriate page

2. **Browse products**
   - [ ] Products display correctly
   - [ ] Stock levels visible
   - [ ] Prices formatted correctly

3. **Add to cart**
   - [ ] "Add to cart" button works
   - [ ] Cart counter updates
   - [ ] Cart persists on page refresh

4. **View cart**
   - [ ] Cart page displays items
   - [ ] Quantities can be adjusted
   - [ ] Items can be removed
   - [ ] Total calculates correctly

5. **Checkout**
   - [ ] Checkout page loads
   - [ ] Items displayed correctly
   - [ ] Tax calculation correct (10%)
   - [ ] Total calculation correct

6. **Complete order**
   - [ ] "Confirmar Pedido" button works
   - [ ] Loading state shows
   - [ ] Success screen appears
   - [ ] Invoice number displayed
   - [ ] Cart cleared

7. **Post-checkout**
   - [ ] WhatsApp link works (if configured)
   - [ ] Print button works
   - [ ] Can navigate back to store

### Step 6: Error Scenarios

1. **Insufficient stock**
   - [ ] Add product with low stock
   - [ ] Set quantity > available
   - [ ] Attempt checkout
   - [ ] Error message displays
   - [ ] Stock error details shown
   - [ ] Can adjust quantity

2. **Concurrent checkout**
   - [ ] Two browsers, same product
   - [ ] Add to cart in both
   - [ ] Checkout in Browser A (success)
   - [ ] Checkout in Browser B (stock error if insufficient)
   - [ ] Verify stock decremented only once

3. **Session timeout**
   - [ ] Start checkout
   - [ ] Let session expire
   - [ ] Attempt checkout
   - [ ] Redirected to login
   - [ ] Cart persists after login

## Performance Verification

### Response Time Checks

```bash
# Use Apache Bench or similar tool
ab -n 100 -c 10 -T "application/json" \
  -H "Authorization: Bearer TOKEN" \
  -p checkout_payload.json \
  https://vetic.ai-whisperers.org/api/store/checkout
```

Expected metrics:
- [ ] Mean response time < 500ms
- [ ] 95th percentile < 800ms
- [ ] 99th percentile < 1500ms
- [ ] No failed requests

### Database Performance

```sql
-- Check slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%process_checkout%'
ORDER BY mean_exec_time DESC;
```

Expected:
- [ ] Mean execution time < 400ms
- [ ] No queries taking > 2s

## Monitoring Setup

### 1. Error Tracking
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Test error reporting
- [ ] Set up alerts for checkout failures

### 2. Database Monitoring
```sql
-- Create monitoring view
CREATE OR REPLACE VIEW checkout_metrics AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_checkouts,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'paid') as paid,
  AVG(total) as avg_order_value,
  SUM(total) as total_revenue
FROM invoices
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```
- [ ] Monitoring view created
- [ ] Dashboard configured

### 3. Alerts
- [ ] Alert on checkout failure rate > 5%
- [ ] Alert on stock errors > 10/hour
- [ ] Alert on response time > 2s
- [ ] Alert on database errors

## Rollback Plan

If issues are encountered:

### 1. Immediate Actions
```bash
# Revert code deployment
git revert HEAD
npm run build
# Deploy previous version

# OR use hosting rollback feature
# Vercel: vercel rollback
# Netlify: rollback in dashboard
```

### 2. Database Rollback
```sql
-- If needed, revert function to previous version
-- (Keep backup of old function before migration)
-- Restore from backup
```

### 3. Communication
- [ ] Notify team of rollback
- [ ] Update status page (if applicable)
- [ ] Document issues encountered

## Post-Deployment

### 1. Monitor for 24 Hours
- [ ] Check error rates every 2 hours
- [ ] Review checkout success rate
- [ ] Monitor database performance
- [ ] Check user feedback

### 2. Performance Review
```sql
-- Check checkout statistics
SELECT
  DATE(created_at) as date,
  COUNT(*) as checkouts,
  COUNT(*) FILTER (WHERE status = 'paid') as completed,
  AVG(total) as avg_value
FROM invoices
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 3. Stock Accuracy Audit
```sql
-- Compare expected vs actual stock
WITH sales_summary AS (
  SELECT
    product_id,
    SUM(quantity) as units_sold
  FROM store_inventory_transactions
  WHERE type = 'sale'
  AND created_at > '2024-01-01'
  GROUP BY product_id
)
SELECT
  sp.name,
  si.stock_quantity as current_stock,
  ss.units_sold,
  'OK' as status
FROM store_products sp
JOIN store_inventory si ON si.product_id = sp.id
LEFT JOIN sales_summary ss ON ss.product_id = sp.id
WHERE sp.is_active = true;
```
- [ ] Stock levels accurate
- [ ] No negative stock
- [ ] No missing inventory records

### 4. User Feedback
- [ ] Review support tickets
- [ ] Check user reviews
- [ ] Monitor social media mentions

## Success Criteria

All checkboxes must be checked for successful deployment:

### Critical (Must Pass)
- [ ] Migration executed without errors
- [ ] All smoke tests passed
- [ ] Stock decrements correctly
- [ ] Transactions logged correctly
- [ ] No critical errors in logs

### Important (Should Pass)
- [ ] Response times within target
- [ ] UI tests all passed
- [ ] Error scenarios handled gracefully
- [ ] Monitoring configured

### Nice to Have
- [ ] Documentation reviewed by team
- [ ] Training provided to staff
- [ ] User guide updated

## Sign-Off

- [ ] Developer: _______________ Date: _______
- [ ] QA: _______________ Date: _______
- [ ] Product Owner: _______________ Date: _______

## Notes

Use this section to document any issues, workarounds, or special considerations:

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Quick Commands Reference

### Check Function
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'decrement_stock';
```

### Check Recent Checkouts
```sql
SELECT * FROM invoices WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Check Stock Transactions
```sql
SELECT * FROM store_inventory_transactions
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Check Errors
```sql
SELECT * FROM audit_logs
WHERE action = 'CHECKOUT'
AND details->>'error' IS NOT NULL
ORDER BY created_at DESC;
```

### Reset Test Data
```sql
-- Only use in development!
DELETE FROM store_inventory_transactions WHERE notes LIKE '%Test%';
DELETE FROM invoice_items WHERE invoice_id IN (
  SELECT id FROM invoices WHERE notes LIKE '%Test%'
);
DELETE FROM invoices WHERE notes LIKE '%Test%';
```

---

**Last Updated**: 2024-12-18
**Next Review**: After first week of production use
