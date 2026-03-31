---
name: thermal-printer
description: ESC/POS thermal printer patterns for veterinary POS receipts, pet ID labels, appointment tickets, and prescription labels. Use when building printing features for clinic point-of-sale systems.
---

# Thermal Printer Integration Guide

## Overview

This skill covers ESC/POS command generation for thermal printers commonly used in veterinary clinics for receipts, labels, and tickets.

---

## 1. ESC/POS Command Reference

### Basic Commands

```typescript
// lib/printer/escpos-commands.ts
export const ESC = '\x1B';
export const GS = '\x1D';
export const FS = '\x1C';

export const ESCPOS = {
  // Initialization
  INIT: `${ESC}@`,                    // Initialize printer
  RESET: `${ESC}@`,                   // Reset printer

  // Text formatting
  BOLD_ON: `${ESC}E\x01`,             // Bold on
  BOLD_OFF: `${ESC}E\x00`,            // Bold off
  UNDERLINE_ON: `${ESC}-\x01`,        // Underline on
  UNDERLINE_OFF: `${ESC}-\x00`,       // Underline off
  DOUBLE_HEIGHT_ON: `${ESC}!\x10`,    // Double height
  DOUBLE_WIDTH_ON: `${ESC}!\x20`,     // Double width
  DOUBLE_SIZE_ON: `${ESC}!\x30`,      // Double height + width
  NORMAL: `${ESC}!\x00`,              // Normal text

  // Alignment
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,

  // Paper handling
  FEED_LINE: '\n',
  FEED_LINES: (n: number) => `${ESC}d${String.fromCharCode(n)}`,
  CUT_PAPER: `${GS}V\x00`,            // Full cut
  PARTIAL_CUT: `${GS}V\x01`,          // Partial cut
  FEED_AND_CUT: `${GS}V\x41\x03`,     // Feed 3 lines and cut

  // Barcode
  BARCODE_HEIGHT: (h: number) => `${GS}h${String.fromCharCode(h)}`,
  BARCODE_WIDTH: (w: number) => `${GS}w${String.fromCharCode(w)}`,
  BARCODE_TEXT_BELOW: `${GS}H\x02`,
  BARCODE_CODE128: `${GS}k\x49`,      // Code 128

  // QR Code
  QR_MODEL: `${GS}(k\x04\x001A2\x00`,
  QR_SIZE: (size: number) => `${GS}(k\x03\x001C${String.fromCharCode(size)}`,
  QR_ERROR_CORRECTION: `${GS}(k\x03\x001E0`,  // L=0, M=1, Q=2, H=3
  QR_STORE: (data: string) => {
    const len = data.length + 3;
    return `${GS}(k${String.fromCharCode(len % 256)}${String.fromCharCode(Math.floor(len / 256))}1P0${data}`;
  },
  QR_PRINT: `${GS}(k\x03\x001Q0`,

  // Cash drawer
  OPEN_DRAWER: `${ESC}p\x00\x19\xFA`,

  // Charset
  CHARSET_PC850: `${ESC}t\x02`,       // Multilingual (Spanish)
  CHARSET_UTF8: `${ESC}t\x13`,        // UTF-8
};
```

### Utility Functions

```typescript
// lib/printer/escpos-utils.ts
import { ESCPOS } from './escpos-commands';

export function createLine(char: string = '-', width: number = 42): string {
  return char.repeat(width);
}

export function alignColumns(
  left: string,
  right: string,
  width: number = 42
): string {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

export function centerText(text: string, width: number = 42): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

export function formatCurrency(amount: number): string {
  return `Gs ${amount.toLocaleString('es-PY')}`;
}

export function wrapText(text: string, maxWidth: number = 42): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}
```

---

## 2. Receipt Templates

### Sales Receipt

```typescript
// lib/printer/templates/sales-receipt.ts
import { ESCPOS, createLine, alignColumns, formatCurrency, wrapText } from '../escpos-utils';

interface SalesReceiptData {
  clinic: {
    name: string;
    ruc: string;
    address: string;
    phone: string;
  };
  timbrado: {
    numero: string;
    validoDesde: string;
    validoHasta: string;
  };
  invoice: {
    number: string;
    date: string;
    time: string;
    cashier: string;
  };
  customer?: {
    name: string;
    ruc?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    iva10: number;
    iva5: number;
    exenta: number;
    total: number;
  };
  payment: {
    method: string;
    amount: number;
    change: number;
  };
}

export function generateSalesReceipt(data: SalesReceiptData): string {
  const WIDTH = 42;
  let receipt = '';

  // Initialize
  receipt += ESCPOS.INIT;
  receipt += ESCPOS.CHARSET_PC850;

  // Header - Clinic info
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += ESCPOS.DOUBLE_SIZE_ON;
  receipt += data.clinic.name + '\n';
  receipt += ESCPOS.NORMAL;
  receipt += `RUC: ${data.clinic.ruc}\n`;
  receipt += wrapText(data.clinic.address, WIDTH).join('\n') + '\n';
  receipt += `Tel: ${data.clinic.phone}\n`;
  receipt += '\n';

  // Timbrado info
  receipt += ESCPOS.ALIGN_LEFT;
  receipt += createLine('-', WIDTH) + '\n';
  receipt += `Timbrado: ${data.timbrado.numero}\n`;
  receipt += `Valido: ${data.timbrado.validoDesde} al ${data.timbrado.validoHasta}\n`;
  receipt += createLine('-', WIDTH) + '\n';

  // Invoice info
  receipt += ESCPOS.BOLD_ON;
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += `FACTURA ${data.invoice.number}\n`;
  receipt += ESCPOS.BOLD_OFF;
  receipt += ESCPOS.ALIGN_LEFT;
  receipt += `Fecha: ${data.invoice.date} ${data.invoice.time}\n`;
  receipt += `Cajero: ${data.invoice.cashier}\n`;

  // Customer info
  if (data.customer) {
    receipt += createLine('-', WIDTH) + '\n';
    receipt += `Cliente: ${data.customer.name}\n`;
    if (data.customer.ruc) {
      receipt += `RUC: ${data.customer.ruc}\n`;
    }
  }

  // Items header
  receipt += createLine('=', WIDTH) + '\n';
  receipt += alignColumns('DESCRIPCION', 'TOTAL', WIDTH) + '\n';
  receipt += createLine('-', WIDTH) + '\n';

  // Items
  for (const item of data.items) {
    // Description line (may wrap)
    const descLines = wrapText(item.description, WIDTH - 15);
    receipt += descLines[0] + '\n';
    for (let i = 1; i < descLines.length; i++) {
      receipt += '  ' + descLines[i] + '\n';
    }
    // Quantity x price = total
    receipt += alignColumns(
      `  ${item.quantity} x ${formatCurrency(item.unitPrice)}`,
      formatCurrency(item.total),
      WIDTH
    ) + '\n';
  }

  // Totals
  receipt += createLine('=', WIDTH) + '\n';
  receipt += ESCPOS.BOLD_ON;
  receipt += alignColumns('SUBTOTAL:', formatCurrency(data.totals.subtotal), WIDTH) + '\n';
  if (data.totals.iva10 > 0) {
    receipt += alignColumns('IVA 10%:', formatCurrency(data.totals.iva10), WIDTH) + '\n';
  }
  if (data.totals.iva5 > 0) {
    receipt += alignColumns('IVA 5%:', formatCurrency(data.totals.iva5), WIDTH) + '\n';
  }
  if (data.totals.exenta > 0) {
    receipt += alignColumns('EXENTA:', formatCurrency(data.totals.exenta), WIDTH) + '\n';
  }
  receipt += createLine('-', WIDTH) + '\n';
  receipt += ESCPOS.DOUBLE_SIZE_ON;
  receipt += alignColumns('TOTAL:', formatCurrency(data.totals.total), WIDTH) + '\n';
  receipt += ESCPOS.NORMAL;
  receipt += ESCPOS.BOLD_OFF;

  // Payment
  receipt += createLine('-', WIDTH) + '\n';
  receipt += alignColumns(`Pago: ${data.payment.method}`, formatCurrency(data.payment.amount), WIDTH) + '\n';
  if (data.payment.change > 0) {
    receipt += alignColumns('Vuelto:', formatCurrency(data.payment.change), WIDTH) + '\n';
  }

  // Footer
  receipt += '\n';
  receipt += createLine('-', WIDTH) + '\n';
  receipt += ESCPOS.ALIGN_CENTER;
  receipt += 'Gracias por su preferencia!\n';
  receipt += 'Vuelva pronto\n';
  receipt += '\n';

  // Legal text
  receipt += ESCPOS.ALIGN_LEFT;
  const legal = 'Emision autorizada por la SET. Este documento no tiene valor comercial ni fiscal si presenta tachaduras o enmiendas.';
  receipt += wrapText(legal, WIDTH).join('\n') + '\n';

  // Cut paper
  receipt += '\n\n\n';
  receipt += ESCPOS.FEED_AND_CUT;

  return receipt;
}
```

### Appointment Ticket

```typescript
// lib/printer/templates/appointment-ticket.ts
import { ESCPOS, createLine, centerText } from '../escpos-utils';

interface AppointmentTicketData {
  clinicName: string;
  ticketNumber: string;
  petName: string;
  ownerName: string;
  service: string;
  scheduledTime: string;
  estimatedWait: string;
  qrCode: string; // URL for QR
}

export function generateAppointmentTicket(data: AppointmentTicketData): string {
  const WIDTH = 42;
  let ticket = '';

  // Initialize
  ticket += ESCPOS.INIT;

  // Header
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += ESCPOS.DOUBLE_SIZE_ON;
  ticket += data.clinicName + '\n';
  ticket += ESCPOS.NORMAL;
  ticket += '\n';

  // Ticket number (big)
  ticket += ESCPOS.DOUBLE_SIZE_ON;
  ticket += `TURNO ${data.ticketNumber}\n`;
  ticket += ESCPOS.NORMAL;
  ticket += '\n';

  // QR Code for check-in
  ticket += ESCPOS.QR_SIZE(6);
  ticket += ESCPOS.QR_ERROR_CORRECTION;
  ticket += ESCPOS.QR_STORE(data.qrCode);
  ticket += ESCPOS.QR_PRINT;
  ticket += '\n';

  // Details
  ticket += createLine('-', WIDTH) + '\n';
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += ESCPOS.BOLD_ON;
  ticket += `Mascota: ${data.petName}\n`;
  ticket += ESCPOS.BOLD_OFF;
  ticket += `Dueño: ${data.ownerName}\n`;
  ticket += `Servicio: ${data.service}\n`;
  ticket += createLine('-', WIDTH) + '\n';

  // Time info
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += `Hora programada: ${data.scheduledTime}\n`;
  ticket += `Tiempo estimado: ${data.estimatedWait}\n`;
  ticket += '\n';

  // Instructions
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += 'Por favor espere a ser llamado.\n';
  ticket += 'Escanee el QR para seguir su turno.\n';

  // Cut
  ticket += '\n\n';
  ticket += ESCPOS.PARTIAL_CUT;

  return ticket;
}
```

---

## 3. Label Templates

### Pet ID Label (50mm x 30mm)

```typescript
// lib/printer/templates/pet-label.ts
import { ESCPOS } from '../escpos-utils';

interface PetLabelData {
  petName: string;
  petId: string;
  species: string;
  breed: string;
  ownerName: string;
  ownerPhone: string;
  qrCode: string; // QR tag URL
}

export function generatePetLabel(data: PetLabelData): string {
  let label = '';

  // Initialize for label mode
  label += ESCPOS.INIT;

  // Small margins for label
  label += '\x1B\x4C'; // Page mode

  // Pet name (large)
  label += ESCPOS.ALIGN_CENTER;
  label += ESCPOS.DOUBLE_SIZE_ON;
  label += data.petName + '\n';
  label += ESCPOS.NORMAL;

  // QR code (small size for label)
  label += ESCPOS.QR_SIZE(3);
  label += ESCPOS.QR_STORE(data.qrCode);
  label += ESCPOS.QR_PRINT;

  // Pet info
  label += ESCPOS.ALIGN_LEFT;
  label += `${data.species} - ${data.breed}\n`;
  label += `ID: ${data.petId}\n`;

  // Owner contact
  label += `Tel: ${data.ownerPhone}\n`;

  // Form feed for label
  label += '\x0C';

  return label;
}
```

### Prescription Label

```typescript
// lib/printer/templates/prescription-label.ts
import { ESCPOS, createLine, wrapText } from '../escpos-utils';

interface PrescriptionLabelData {
  clinicName: string;
  clinicPhone: string;
  prescriptionNumber: string;
  petName: string;
  ownerName: string;
  medication: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  };
  dispensedDate: string;
  expiryDate: string;
  vetName: string;
}

export function generatePrescriptionLabel(data: PrescriptionLabelData): string {
  const WIDTH = 42;
  let label = '';

  label += ESCPOS.INIT;

  // Header
  label += ESCPOS.ALIGN_CENTER;
  label += ESCPOS.BOLD_ON;
  label += data.clinicName + '\n';
  label += ESCPOS.BOLD_OFF;
  label += `Tel: ${data.clinicPhone}\n`;
  label += createLine('-', WIDTH) + '\n';

  // Rx symbol
  label += ESCPOS.DOUBLE_SIZE_ON;
  label += 'Rx\n';
  label += ESCPOS.NORMAL;

  // Patient info
  label += ESCPOS.ALIGN_LEFT;
  label += `Paciente: ${data.petName}\n`;
  label += `Propietario: ${data.ownerName}\n`;
  label += createLine('-', WIDTH) + '\n';

  // Medication
  label += ESCPOS.BOLD_ON;
  label += data.medication.name + '\n';
  label += ESCPOS.BOLD_OFF;
  label += `Dosis: ${data.medication.dosage}\n`;
  label += `Frecuencia: ${data.medication.frequency}\n`;
  label += `Duracion: ${data.medication.duration}\n`;

  // Instructions
  if (data.medication.instructions) {
    label += createLine('-', WIDTH) + '\n';
    label += 'Instrucciones:\n';
    label += wrapText(data.medication.instructions, WIDTH).join('\n') + '\n';
  }

  // Footer
  label += createLine('-', WIDTH) + '\n';
  label += `Dispensado: ${data.dispensedDate}\n`;
  label += `Vence: ${data.expiryDate}\n`;
  label += `Dr. ${data.vetName}\n`;

  // Warning
  label += '\n';
  label += ESCPOS.ALIGN_CENTER;
  label += ESCPOS.BOLD_ON;
  label += 'USO VETERINARIO\n';
  label += 'MANTENER FUERA DEL ALCANCE DE NINOS\n';
  label += ESCPOS.BOLD_OFF;

  label += '\n';
  label += ESCPOS.PARTIAL_CUT;

  return label;
}
```

---

## 4. Printer Communication

### USB Printer (Node.js)

```typescript
// lib/printer/usb-printer.ts
import * as usb from 'usb';

interface PrinterConfig {
  vendorId: number;
  productId: number;
}

// Common thermal printer IDs
export const PRINTER_IDS = {
  EPSON_TM_T20: { vendorId: 0x04b8, productId: 0x0e15 },
  EPSON_TM_T88: { vendorId: 0x04b8, productId: 0x0202 },
  STAR_TSP100: { vendorId: 0x0519, productId: 0x0003 },
  GENERIC_58MM: { vendorId: 0x0416, productId: 0x5011 },
  GENERIC_80MM: { vendorId: 0x0483, productId: 0x5740 },
};

export class USBPrinter {
  private device: usb.Device | null = null;
  private endpoint: usb.OutEndpoint | null = null;

  constructor(private config: PrinterConfig) {}

  async connect(): Promise<void> {
    const device = usb.findByIds(this.config.vendorId, this.config.productId);

    if (!device) {
      throw new Error('Printer not found');
    }

    device.open();

    const iface = device.interface(0);
    if (iface.isKernelDriverActive()) {
      iface.detachKernelDriver();
    }
    iface.claim();

    // Find OUT endpoint
    for (const endpoint of iface.endpoints) {
      if (endpoint.direction === 'out') {
        this.endpoint = endpoint as usb.OutEndpoint;
        break;
      }
    }

    if (!this.endpoint) {
      throw new Error('No OUT endpoint found');
    }

    this.device = device;
  }

  async print(data: string | Buffer): Promise<void> {
    if (!this.endpoint) {
      throw new Error('Printer not connected');
    }

    const buffer = typeof data === 'string' ? Buffer.from(data, 'binary') : data;

    return new Promise((resolve, reject) => {
      this.endpoint!.transfer(buffer, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  disconnect(): void {
    if (this.device) {
      this.device.close();
      this.device = null;
      this.endpoint = null;
    }
  }
}
```

### Network Printer

```typescript
// lib/printer/network-printer.ts
import * as net from 'net';

export class NetworkPrinter {
  private socket: net.Socket | null = null;

  constructor(
    private host: string,
    private port: number = 9100
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.connect(this.port, this.host, () => {
        resolve();
      });

      this.socket.on('error', (error) => {
        reject(error);
      });
    });
  }

  async print(data: string | Buffer): Promise<void> {
    if (!this.socket) {
      throw new Error('Printer not connected');
    }

    const buffer = typeof data === 'string' ? Buffer.from(data, 'binary') : data;

    return new Promise((resolve, reject) => {
      this.socket!.write(buffer, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}
```

### Browser Print (Web USB API)

```typescript
// lib/printer/web-usb-printer.ts
export class WebUSBPrinter {
  private device: USBDevice | null = null;
  private endpoint: number = 1;

  async requestDevice(): Promise<void> {
    this.device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0519 }, // Star
        { vendorId: 0x0416 }, // Generic
      ],
    });
  }

  async connect(): Promise<void> {
    if (!this.device) {
      await this.requestDevice();
    }

    await this.device!.open();
    await this.device!.selectConfiguration(1);
    await this.device!.claimInterface(0);

    // Find OUT endpoint
    const config = this.device!.configuration;
    if (config) {
      for (const iface of config.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'out') {
              this.endpoint = ep.endpointNumber;
              break;
            }
          }
        }
      }
    }
  }

  async print(data: string): Promise<void> {
    if (!this.device) {
      throw new Error('Printer not connected');
    }

    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);

    await this.device.transferOut(this.endpoint, buffer);
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      await this.device.close();
      this.device = null;
    }
  }
}
```

---

## 5. Print Service API

```typescript
// api/print/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSalesReceipt, generateAppointmentTicket, generatePrescriptionLabel } from '@/lib/printer/templates';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { type, data, printerId } = body;

  let printData: string;

  switch (type) {
    case 'sales_receipt':
      printData = generateSalesReceipt(data);
      break;
    case 'appointment_ticket':
      printData = generateAppointmentTicket(data);
      break;
    case 'prescription_label':
      printData = generatePrescriptionLabel(data);
      break;
    default:
      return NextResponse.json({ error: 'Tipo de impresion no valido' }, { status: 400 });
  }

  // Return base64 encoded data for client-side printing
  // Or send to server-side printer if configured
  return NextResponse.json({
    success: true,
    printData: Buffer.from(printData, 'binary').toString('base64'),
  });
}
```

---

## 6. Common Printer Models in Paraguay

| Model | Width | Connection | Price Range |
|-------|-------|------------|-------------|
| Epson TM-T20III | 80mm | USB/Network | ₲ 800.000 - 1.200.000 |
| Epson TM-T88VI | 80mm | USB/Network/BT | ₲ 1.500.000 - 2.000.000 |
| Star TSP143 | 80mm | USB/Network | ₲ 900.000 - 1.300.000 |
| Generic 58mm | 58mm | USB | ₲ 150.000 - 300.000 |
| Generic 80mm | 80mm | USB | ₲ 250.000 - 450.000 |

### Paper Sizes

| Width | Characters | Use Case |
|-------|------------|----------|
| 58mm | 32 chars | Small receipts, labels |
| 80mm | 42-48 chars | Full receipts, tickets |

---

*Reference: ESC/POS command manual, Epson documentation*
