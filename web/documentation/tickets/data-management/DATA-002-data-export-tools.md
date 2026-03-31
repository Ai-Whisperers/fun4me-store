# DATA-002: Data Export Tools (CSV, JSON, XLSX)

## Priority: P2
## Category: Data Management
## Status: ✅ Complete
## Epic: [EPIC-12: Data Management & Disaster Recovery](../epics/EPIC-12-data-management.md)

## Description
Provide self-service data export functionality for clinics to download their data in standard formats.

## Current State (Before)
- Limited export capabilities
- No bulk data export
- Clinics cannot easily migrate data
- GDPR data portability not fully supported

## Implementation

### 1. Export Module (`lib/export/`)

#### Types (`lib/export/types.ts`)
- `ExportFormat`: `'csv' | 'json' | 'xlsx'`
- `ExportStatus`: `'pending' | 'processing' | 'completed' | 'failed' | 'expired'`
- `ExportableTable`: 12 supported tables
- `ExportJob`: Full job tracking interface
- `ExportConfig`: Configuration with date range, anonymization options

#### Exportable Tables
| Table | Description |
|-------|-------------|
| `pets` | Pet profiles with owner info |
| `appointments` | Appointment history |
| `invoices` | Invoice records |
| `payments` | Payment transactions |
| `vaccines` | Vaccine records |
| `medical_records` | Medical history |
| `prescriptions` | Prescription history |
| `lab_orders` | Lab order records |
| `lab_results` | Lab test results |
| `clients` | Client profiles (owners) |
| `products` | Store products |
| `inventory` | Current stock levels |

#### Configuration (`lib/export/config.ts`)
- Column mappings for each table
- Header translations (Spanish)
- Data transformations (date formatting, currency)
- Anonymization support (GDPR compliance)
- Related table join definitions

#### Generators (`lib/export/generators.ts`)
- `generateCSVExport()` - Single table or multi-table CSV
- `generateJSONExport()` - Structured JSON with metadata
- `generateXLSXExport()` - Excel workbook with sheets per table
- `transformRows()` - Apply column configs and anonymization

#### Job Management (`lib/export/job.ts`)
- `createExportJob()` - Create new export request
- `getExportJob()` - Get job status by ID
- `listExportJobs()` - List user's export history
- `processExportJob()` - Execute export and upload to storage
- `cleanupExpiredExports()` - Mark expired jobs

### 2. Database Migration (`db/migrations/064_export_jobs.sql`)

```sql
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  config JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  file_url TEXT,
  file_size BIGINT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

RLS Policies:
- Users can view their own export jobs
- Users can create export jobs for their tenant
- Staff can view all tenant export jobs

### 3. API Routes

#### `POST /api/export`
Create a new export job.

Request:
```json
{
  "tables": ["pets", "appointments", "invoices"],
  "format": "xlsx",
  "dateRange": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z"
  },
  "includeRelations": true,
  "anonymize": false
}
```

Response:
```json
{
  "success": true,
  "jobId": "abc-123",
  "message": "Exportación iniciada. Recibirás un correo cuando esté lista."
}
```

#### `GET /api/export`
List user's export jobs.

Response:
```json
{
  "jobs": [
    {
      "id": "abc-123",
      "status": "completed",
      "progress": 100,
      "fileUrl": "https://...",
      "fileSize": 524288,
      "expiresAt": "2026-01-15T00:00:00Z",
      "createdAt": "2026-01-08T12:00:00Z",
      "completedAt": "2026-01-08T12:01:30Z"
    }
  ],
  "total": 1
}
```

#### `GET /api/export/[id]`
Get specific export job status.

### 4. Cron Job (`/api/cron/cleanup-exports`)

Marks expired export jobs. Recommended schedule: Daily at 3 AM.

### 5. Email Notification

When export completes, user receives email with:
- Download link (valid for 7 days)
- Expiration date

## Files Created/Modified

| File | Action |
|------|--------|
| `lib/export/types.ts` | **Created** - Type definitions |
| `lib/export/config.ts` | **Created** - Table configurations |
| `lib/export/generators.ts` | **Created** - File generation |
| `lib/export/job.ts` | **Created** - Job management |
| `lib/export/index.ts` | **Created** - Module exports |
| `app/api/export/route.ts` | **Created** - Create/list endpoints |
| `app/api/export/[id]/route.ts` | **Created** - Job detail endpoint |
| `app/api/cron/cleanup-exports/route.ts` | **Created** - Cleanup cron |
| `db/migrations/064_export_jobs.sql` | **Created** - Database schema |

## Acceptance Criteria

- [x] Export pets, appointments, invoices
- [x] CSV, JSON, XLSX formats supported
- [x] Background processing for large exports
- [x] Email notification when ready
- [x] Download link valid for 7 days
- [x] Tenant-isolated (RLS enforced)
- [x] Anonymization option for GDPR

## Usage Example

```typescript
// Create export via API
const response = await fetch('/api/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tables: ['pets', 'vaccines', 'medical_records'],
    format: 'xlsx',
    dateRange: {
      from: '2024-01-01T00:00:00Z',
      to: '2024-12-31T23:59:59Z',
    },
  }),
});

const { jobId } = await response.json();

// Poll for status
const status = await fetch(`/api/export/${jobId}`);
const job = await status.json();

if (job.status === 'completed') {
  window.open(job.fileUrl, '_blank');
}
```

## Future Enhancements

1. **Inngest Integration**: Queue large exports via Inngest for better reliability
2. **Admin Dashboard UI**: Export management interface
3. **Scheduled Exports**: Recurring export jobs
4. **Export Templates**: Pre-defined export configurations
5. **ZIP for Multi-CSV**: Proper ZIP archive for multiple CSV exports

## Estimated Effort
- 6 hours (actual: ~5 hours)

## Resolution Summary

**Completed:** January 2026

Implemented comprehensive data export system:
- 12 exportable tables with full column mapping
- CSV, JSON, and XLSX format support
- Background job processing with progress tracking
- Email notifications with download links
- GDPR-compliant anonymization option
- 7-day download expiration with automatic cleanup
- Full RLS protection for multi-tenant isolation
