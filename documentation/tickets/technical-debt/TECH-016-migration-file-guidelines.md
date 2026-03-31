# TECH-016: Establish Migration File Size Guidelines

**Category**: Technical Debt  
**Priority**: P3 - Low  
**Status**: Open  
**Effort**: 1 hour (documentation)  
**Impact**: Low - Process improvement  
**Created**: 2025-01-19  
**Source**: critique/04-database-roast.md (DB-005)

## Summary

Existing migration files are too large (3,577 lines!), making them hard to review and debug. Need guidelines for future migrations.

## Problem

**Monster migrations:**
```
web/db/migrations/0000_parched_scalphunter.sql — 3,577 lines
web/db/60_store/01_inventory.sql — 1,722 lines
```

**Issues:**
- Can't rollback specific changes
- Code review is impossible
- Debugging is archaeology
- No clear audit trail

## Solution

### Guidelines for New Migrations

**DO:**
- Max 200 lines per migration
- One logical change per file
- Descriptive names: `095_add_invoice_refunds.sql`
- Include rollback script: `095_add_invoice_refunds_rollback.sql`
- Test migrations before committing

**DON'T:**
- Combine unrelated changes
- Create files over 200 lines
- Use auto-generated names without documenting

### For Existing Files

**DO NOT** modify deployed migrations!
Instead:
- Document what they contain in README
- Create new migrations for changes
- Never repeat this pattern

### Migration Template

```sql
-- Migration: 095_add_invoice_refunds.sql
-- Description: Add refund tracking to invoices
-- Author: [name]
-- Date: 2025-01-19

-- Add refund columns
ALTER TABLE invoices
ADD COLUMN refund_amount NUMERIC(10,2),
ADD COLUMN refund_reason TEXT,
ADD COLUMN refunded_at TIMESTAMPTZ;

-- Create refund tracking table
CREATE TABLE invoice_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  refunded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_invoice_refunds_invoice
ON invoice_refunds(invoice_id);

-- Enable RLS
ALTER TABLE invoice_refunds ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Staff manage refunds" ON invoice_refunds
FOR ALL USING (is_staff_of(
  (SELECT tenant_id FROM invoices WHERE id = invoice_id)
));
```

### Rollback Template

```sql
-- Rollback: 095_add_invoice_refunds_rollback.sql
DROP POLICY "Staff manage refunds" ON invoice_refunds;
DROP TABLE invoice_refunds;
ALTER TABLE invoices
DROP COLUMN refund_amount,
DROP COLUMN refund_reason,
DROP COLUMN refunded_at;
```

## Implementation

1. Create `web/db/MIGRATION_GUIDELINES.md`
2. Document best practices
3. Add to onboarding docs
4. Review in code reviews

## Acceptance Criteria
- [ ] Migration guidelines documented
- [ ] Maximum file size specified (200 lines)
- [ ] Template files created
- [ ] Team trained on process

## Related
- Database migration documentation
- Code review checklist
