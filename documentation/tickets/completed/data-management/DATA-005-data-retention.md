# DATA-005: Data Retention Policy Implementation

## Priority: P2
## Category: Data Management
## Status: ✅ Complete
## Epic: [EPIC-12: Data Management & Disaster Recovery](../epics/EPIC-12-data-management.md)

## Description
Implement automated data retention policies to manage data lifecycle, comply with regulations, and optimize storage costs.

## Current State (Before)
- No data retention policies
- All data kept indefinitely
- Storage costs growing
- Potential compliance issues

## Implementation

### 1. Retention Configuration (`lib/data/retention-config.ts`)

Defined retention policies for all data categories:

#### Short-Term (7-30 days)
| Table | Retention | Action | Notes |
|-------|-----------|--------|-------|
| `store_carts` | 7 days | Delete | Empty/abandoned carts only |
| `store_stock_alerts` | 30 days | Delete | After notification sent |

#### Medium-Term (30-180 days)
| Table | Retention | Action | Notes |
|-------|-----------|--------|-------|
| `notifications` | 90 days | Delete | Read notifications only |
| `reminders` | 90 days | Delete | Processed reminders |
| `whatsapp_messages` | 180 days | Delete | Message logs |
| `lost_pet_sightings` | 180 days | Delete | After pet reunited |

#### Long-Term Compliance (2-10 years)
| Table | Retention | Action | Legal Requirement |
|-------|-----------|--------|-------------------|
| `audit_logs` | 2 years | Archive | Security compliance |
| `medical_records` | 10 years | Archive | Paraguay health regulations |
| `prescriptions` | 10 years | Archive | Controlled substances |
| `invoices` | 7 years | Archive | Tax compliance |
| `payments` | 7 years | Archive | Financial records |
| `consent_documents` | 10 years | Archive | Legal evidence |
| `insurance_claims` | 7 years | Archive | Dispute period |

#### Protected Tables (No Auto-Deletion)
- `tenants` - Core tenant data
- `profiles` - User accounts
- `pets` - Pet records
- `vaccines` - Core health data
- `appointments` - Historical record
- `hospitalizations` - Critical care history
- `lab_orders` / `lab_results` - Diagnostic data

### 2. Retention Job (`lib/data/retention-job.ts`)

Features:
- **Batch processing**: Max 1000 records per table per run
- **Safety limits**: Max 5 tables per cron run
- **Dry-run mode**: Test without deleting
- **Per-table results**: Detailed success/failure tracking
- **Protected tables**: Cannot be processed automatically

Actions supported:
- `delete`: Hard delete records
- `soft_delete`: Set `deleted_at` timestamp
- `archive`: Mark as archived (full S3 export planned for future)

### 3. Cron Endpoint (`/api/cron/retention`)

```
POST /api/cron/retention
Authorization: Bearer <CRON_SECRET>

Query params:
- dryRun=true: Report only, no deletions
- tables=notifications,reminders: Process specific tables
```

Recommended schedule: Weekly (Sunday 3 AM)

Response:
```json
{
  "success": true,
  "processed": 450,
  "failed": 0,
  "errors": [],
  "runId": "abc12345",
  "dryRun": false,
  "tablesProcessed": 5,
  "results": [
    { "table": "notifications", "action": "delete", "recordsProcessed": 200, "success": true }
  ]
}
```

### 4. Statistics Endpoint (`/api/health/retention`)

```
GET /api/health/retention
Authorization: Bearer <CRON_SECRET>
```

Response:
```json
{
  "policies": [...],
  "statistics": [
    { "table": "notifications", "estimatedRecords": 5234, "oldestRecord": "2024-01-15" }
  ],
  "protectedTables": ["tenants", "profiles", "pets", ...],
  "timestamp": "2026-01-08T..."
}
```

## Files Created/Modified

| File | Action |
|------|--------|
| `lib/data/retention-config.ts` | **Created** - Policy definitions |
| `lib/data/retention-job.ts` | **Created** - Job execution logic |
| `lib/data/index.ts` | **Created** - Module exports |
| `app/api/cron/retention/route.ts` | **Created** - Cron endpoint |
| `app/api/health/retention/route.ts` | **Created** - Statistics endpoint |

## Acceptance Criteria

- [x] Policies defined for all tables (14 policies across 4 categories)
- [x] Automated retention job with cron integration
- [x] Batch processing to prevent overload
- [x] Protected tables cannot be auto-processed
- [x] Dry-run mode for testing
- [x] Retention statistics endpoint
- [ ] Full S3 archival (deferred - marked as future enhancement)
- [ ] Storage savings tracking dashboard (requires observability integration)

## Future Enhancements

1. **S3 Archival**: Export records to S3 before deletion for long-term compliance
2. **Vercel Cron**: Configure in `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/retention",
       "schedule": "0 3 * * 0"
     }]
   }
   ```
3. **Storage Metrics**: Track storage savings over time
4. **Tenant-specific policies**: Allow clinics to customize retention

## Estimated Effort
- 5 hours (actual: ~4 hours)

## Resolution Summary

**Completed:** January 2026

Implemented comprehensive data retention system:
- 14 retention policies covering operational, transactional, and compliance data
- Weekly cron job with batch processing and dry-run support
- Protected tables safeguard critical data
- Statistics endpoint for monitoring
- Integrates with existing cron monitoring and alerting infrastructure
