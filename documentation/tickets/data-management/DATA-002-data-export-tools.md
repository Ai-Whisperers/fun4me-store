# DATA-002: Data Export Tools (CSV, JSON)

## Priority: P2
## Category: Data Management
## Status: Not Started
## Epic: [EPIC-12: Data Management & Disaster Recovery](../epics/EPIC-12-data-management.md)

## Description
Provide self-service data export functionality for clinics to download their data in standard formats.

## Current State
- Limited export capabilities
- No bulk data export
- Clinics cannot easily migrate data
- GDPR data portability not fully supported

## Proposed Solution

### Export API
```typescript
// app/api/export/route.ts
export async function POST(request: NextRequest) {
  const { format, tables, dateRange } = await request.json();

  const exportJob = await createExportJob({
    tenantId: profile.tenant_id,
    format, // 'csv' | 'json' | 'xlsx'
    tables, // ['pets', 'appointments', 'invoices']
    dateRange,
  });

  // Queue background job
  await inngest.send({
    name: 'export/generate',
    data: { jobId: exportJob.id },
  });

  return NextResponse.json({ jobId: exportJob.id });
}
```

### Export Worker
```typescript
// lib/export/worker.ts
export async function generateExport(job: ExportJob) {
  const data: Record<string, any[]> = {};

  for (const table of job.tables) {
    data[table] = await fetchTableData(table, job.tenantId, job.dateRange);
  }

  const file = job.format === 'csv'
    ? await generateCSVZip(data)
    : await generateJSON(data);

  const url = await uploadToStorage(file, `exports/${job.id}`);

  await notifyExportReady(job.userId, url);
}
```

### Exportable Tables
- pets (with medical records)
- appointments
- invoices & payments
- inventory & products
- clients & profiles
- prescriptions
- lab results

## Implementation Steps
1. Create export job queue system
2. Implement CSV generation for each table
3. Implement JSON export with relationships
4. Add Excel (XLSX) export option
5. Create download management UI
6. Add export history and re-download
7. Implement data anonymization option

## Acceptance Criteria
- [ ] Export pets, appointments, invoices
- [ ] CSV, JSON, XLSX formats supported
- [ ] Background processing for large exports
- [ ] Email notification when ready
- [ ] Download link valid for 7 days
- [ ] Tenant-isolated (RLS enforced)

## Related Files
- `app/api/export/` - Export endpoints
- `lib/export/` - Export utilities
- `app/[clinic]/dashboard/settings/` - Export UI

## Estimated Effort
- 6 hours
  - API & queue: 2h
  - Format generators: 2h
  - UI & notifications: 2h
