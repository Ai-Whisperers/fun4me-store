# INT-004: Accounting Software Export

## Priority: P3
## Category: Integrations
## Status: Not Started
## Epic: [EPIC-15: Integration Expansion](../epics/EPIC-15-integration-expansion.md)

## Description
Implement export functionality for popular accounting software used in Paraguay (Contap, Marangatu) and standard formats (XLSX, CSV).

## Current State
- Manual invoice management
- No accounting software integration
- PDF invoices only
- No bulk export capability

## Proposed Solution

### Export Format Interface
```typescript
// lib/accounting/export.ts
interface AccountingExporter {
  format: string;
  extension: string;
  mimeType: string;
  export(data: InvoiceData[]): Promise<Buffer>;
}

export async function exportInvoices(
  invoices: Invoice[],
  format: 'contap' | 'marangatu' | 'xlsx' | 'csv'
): Promise<Buffer> {
  const exporter = getExporter(format);
  const data = await prepareInvoiceData(invoices);
  return exporter.export(data);
}
```

### Contap Export (Paraguay)
```typescript
// lib/accounting/contap.ts
export class ContapExporter implements AccountingExporter {
  format = 'contap';
  extension = 'txt';
  mimeType = 'text/plain';

  async export(invoices: InvoiceData[]): Promise<Buffer> {
    // Contap fixed-width format
    const lines = invoices.map(inv => {
      return [
        padRight(inv.invoiceNumber, 10),        // Nro Factura
        formatDate(inv.date, 'DDMMYYYY'),       // Fecha
        padRight(inv.clientRuc, 15),            // RUC Cliente
        padRight(inv.clientName, 50),           // Nombre
        formatAmount(inv.subtotal, 15),         // Gravado 10%
        formatAmount(0, 15),                    // Gravado 5%
        formatAmount(0, 15),                    // Exento
        formatAmount(inv.taxAmount, 15),        // IVA
        formatAmount(inv.total, 15),            // Total
        '1',                                    // Tipo (1=Contado)
        padRight(inv.timbrado, 8),              // Timbrado
      ].join('');
    });

    return Buffer.from(lines.join('\r\n'), 'utf-8');
  }
}
```

### Marangatu Export (SET Paraguay)
```typescript
// lib/accounting/marangatu.ts
export class MarangatuExporter implements AccountingExporter {
  format = 'marangatu';
  extension = 'xml';
  mimeType = 'application/xml';

  async export(invoices: InvoiceData[]): Promise<Buffer> {
    // SET Marangatu XML format
    const xml = js2xml({
      reporte: {
        version: '2.0',
        ruc_informante: process.env.CLINIC_RUC,
        periodo: this.getPeriod(invoices),
        comprobantes: {
          comprobante: invoices.map(inv => ({
            tipo_comprobante: '1', // Factura
            timbrado: inv.timbrado,
            numero_comprobante: inv.invoiceNumber,
            fecha_emision: formatDate(inv.date, 'YYYY-MM-DD'),
            ruc_cliente: inv.clientRuc,
            razon_social: inv.clientName,
            condicion: inv.paymentTerms === 'cash' ? 'CO' : 'CR',
            monto_gravado_10: inv.subtotal,
            monto_iva_10: inv.taxAmount,
            monto_total: inv.total,
          })),
        },
      },
    });

    return Buffer.from(xml, 'utf-8');
  }
}
```

### Excel Export
```typescript
// lib/accounting/xlsx.ts
import ExcelJS from 'exceljs';

export class XLSXExporter implements AccountingExporter {
  format = 'xlsx';
  extension = 'xlsx';
  mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  async export(invoices: InvoiceData[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Facturas');

    // Headers
    sheet.columns = [
      { header: 'Nro. Factura', key: 'number', width: 15 },
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Cliente', key: 'client', width: 30 },
      { header: 'RUC', key: 'ruc', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'IVA', key: 'tax', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Estado', key: 'status', width: 10 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Data rows
    invoices.forEach(inv => {
      sheet.addRow({
        number: inv.invoiceNumber,
        date: inv.date,
        client: inv.clientName,
        ruc: inv.clientRuc,
        subtotal: inv.subtotal,
        tax: inv.taxAmount,
        total: inv.total,
        status: inv.status,
      });
    });

    // Format currency columns
    ['subtotal', 'tax', 'total'].forEach(col => {
      sheet.getColumn(col).numFmt = '#,##0';
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
```

### Export API
```typescript
// app/api/invoices/export/route.ts
export async function POST(request: NextRequest) {
  const { format, dateFrom, dateTo, status } = await request.json();

  const invoices = await getInvoices({
    tenantId: await getTenantId(request),
    dateFrom,
    dateTo,
    status,
  });

  const buffer = await exportInvoices(invoices, format);
  const exporter = getExporter(format);

  return new Response(buffer, {
    headers: {
      'Content-Type': exporter.mimeType,
      'Content-Disposition': `attachment; filename="facturas-${dateFrom}-${dateTo}.${exporter.extension}"`,
    },
  });
}
```

## Implementation Steps
1. Create export abstraction layer
2. Implement Contap export format
3. Implement Marangatu XML format
4. Implement Excel export
5. Add CSV export option
6. Create export UI with filters
7. Add scheduled export option

## Acceptance Criteria
- [ ] Contap export working
- [ ] Marangatu XML valid
- [ ] Excel export formatted
- [ ] CSV export available
- [ ] Date range filtering
- [ ] Export UI implemented

## Related Files
- `lib/accounting/` - Export providers
- `app/api/invoices/export/` - Export API
- `app/[clinic]/dashboard/finance/` - Finance UI

## Estimated Effort
- 10 hours
  - Export abstraction: 1h
  - Contap format: 2h
  - Marangatu XML: 3h
  - Excel/CSV: 2h
  - UI: 2h
