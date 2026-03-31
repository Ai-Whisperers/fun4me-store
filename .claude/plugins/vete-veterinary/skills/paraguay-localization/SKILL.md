---
name: paraguay-localization
description: Paraguay-specific business patterns including local payment methods, tax regulations, phone formats, address handling, and cultural considerations. Use when building features for the Paraguayan market.
---

# Paraguay Localization Guide

## Overview

This skill covers Paraguay-specific business patterns for the Vete veterinary platform, including payment methods, tax regulations, phone number formats, address handling, and cultural/linguistic considerations.

---

## 1. Payment Methods

### Popular Payment Methods in Paraguay

| Method | Type | Market Share | Integration |
|--------|------|--------------|-------------|
| **Bancard** | Cards (debit/credit) | ~40% | vPOS API |
| **Tigo Money** | Mobile wallet | ~25% | Tigo Money API |
| **Personal Pay** | Mobile wallet | ~10% | Personal API |
| **Billetera Personal** | Mobile wallet | ~8% | Personal API |
| **PagoExpress** | Payment network | ~10% | PagoExpress API |
| **Efectivo** | Cash | ~7% | N/A |

### Bancard vPOS Integration

```typescript
// lib/payments/bancard.ts
interface BancardConfig {
  publicKey: string;
  privateKey: string;
  environment: 'sandbox' | 'production';
}

const BANCARD_URLS = {
  sandbox: 'https://vpos.infonet.com.py:8888',
  production: 'https://vpos.infonet.com.py',
};

interface SingleBuyRequest {
  public_key: string;
  operation: {
    token: string;
    shop_process_id: number;
    amount: string; // "150000.00" (Guaraníes, 2 decimals)
    currency: 'PYG';
    additional_data: string;
    description: string;
    return_url: string;
    cancel_url: string;
  };
}

export async function createBancardPayment(
  config: BancardConfig,
  data: {
    orderId: string;
    amount: number; // In Guaraníes
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }
) {
  const token = generateToken(config.privateKey, data.orderId, data.amount);

  const request: SingleBuyRequest = {
    public_key: config.publicKey,
    operation: {
      token,
      shop_process_id: parseInt(data.orderId.replace(/\D/g, '').slice(-8)),
      amount: data.amount.toFixed(2),
      currency: 'PYG',
      additional_data: '',
      description: data.description,
      return_url: data.returnUrl,
      cancel_url: data.cancelUrl,
    },
  };

  const response = await fetch(
    `${BANCARD_URLS[config.environment]}/vpos/api/0.3/single_buy`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );

  const result = await response.json();

  if (result.status === 'success') {
    return {
      processId: result.process_id,
      redirectUrl: `${BANCARD_URLS[config.environment]}/vpos/api/0.3/external-commerce/purchase?process_id=${result.process_id}`,
    };
  }

  throw new Error(result.messages?.[0]?.description || 'Bancard error');
}

function generateToken(
  privateKey: string,
  orderId: string,
  amount: number
): string {
  const crypto = require('crypto');
  const data = `${privateKey}${orderId}${amount.toFixed(2)}PYG`;
  return crypto.createHash('md5').update(data).digest('hex');
}
```

### Tigo Money Integration

```typescript
// lib/payments/tigo-money.ts
interface TigoMoneyConfig {
  clientId: string;
  clientSecret: string;
  merchantAccount: string;
  environment: 'sandbox' | 'production';
}

const TIGO_URLS = {
  sandbox: 'https://securesandbox.tigo.com.py',
  production: 'https://secure.tigo.com.py',
};

export async function createTigoMoneyPayment(
  config: TigoMoneyConfig,
  data: {
    msisdn: string; // Customer phone (09xx format)
    amount: number; // In Guaraníes
    orderId: string;
    description: string;
  }
) {
  // Get OAuth token
  const token = await getTigoToken(config);

  const response = await fetch(
    `${TIGO_URLS[config.environment]}/v1/tigo/mfs/payments/authorizations`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        MasterMerchant: {
          account: config.merchantAccount,
          pin: '1234', // Configured PIN
        },
        Subscriber: {
          account: formatTigoPhone(data.msisdn),
        },
        Transaction: {
          amount: data.amount.toString(),
          currency: 'PYG',
          type: 'PAYMENT',
          id: data.orderId,
          fee: '0',
        },
      }),
    }
  );

  return response.json();
}

function formatTigoPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('595')) return digits;
  if (digits.startsWith('0')) return `595${digits.slice(1)}`;
  return `595${digits}`;
}
```

---

## 2. Tax Regulations (IVA & Timbrado)

### IVA (Impuesto al Valor Agregado)

```typescript
// lib/tax/paraguay-tax.ts
export const PARAGUAY_TAX = {
  IVA_RATE: 0.10, // 10% standard rate
  IVA_REDUCED: 0.05, // 5% reduced rate (some services)
  IVA_EXEMPT: 0, // Exempt items
};

// IVA categories for veterinary services
export const VET_SERVICE_TAX_RATES: Record<string, number> = {
  consulta_general: 0.10, // Standard IVA
  cirugia: 0.10,
  vacunacion: 0.10,
  peluqueria: 0.10,
  medicamentos: 0.10, // Vet medicines are taxed
  alimentos_mascotas: 0.10,
  accesorios: 0.10,
};

export function calculateIVA(subtotal: number, rate: number = 0.10) {
  const ivaAmount = subtotal * rate;
  const total = subtotal + ivaAmount;

  return {
    subtotal,
    ivaRate: rate,
    ivaAmount: Math.round(ivaAmount), // Round to whole Guaraníes
    total: Math.round(total),
  };
}

// For invoices showing IVA included (common in Paraguay)
export function extractIVA(totalWithIVA: number, rate: number = 0.10) {
  const subtotal = totalWithIVA / (1 + rate);
  const ivaAmount = totalWithIVA - subtotal;

  return {
    subtotal: Math.round(subtotal),
    ivaRate: rate,
    ivaAmount: Math.round(ivaAmount),
    total: totalWithIVA,
  };
}
```

### Timbrado (Invoice Authorization)

```typescript
// lib/invoicing/timbrado.ts
interface Timbrado {
  numero: string; // e.g., "15234567"
  fechaInicio: Date;
  fechaVencimiento: Date;
  rangoDesde: string; // "001-001-0000001"
  rangoHasta: string; // "001-001-9999999"
  ruc: string; // e.g., "80012345-6"
}

interface InvoiceNumber {
  establecimiento: string; // 3 digits
  puntoExpedicion: string; // 3 digits
  numero: string; // 7 digits
  full: string; // "001-001-0000001"
}

export function generateInvoiceNumber(
  timbrado: Timbrado,
  lastNumber: number
): InvoiceNumber {
  const nextNumber = lastNumber + 1;

  // Parse range to get establecimiento and punto
  const [est, punto] = timbrado.rangoDesde.split('-');

  const numero = nextNumber.toString().padStart(7, '0');
  const full = `${est}-${punto}-${numero}`;

  // Validate within range
  if (full > timbrado.rangoHasta) {
    throw new Error('Timbrado range exhausted - need new timbrado');
  }

  // Check timbrado validity
  if (new Date() > timbrado.fechaVencimiento) {
    throw new Error('Timbrado expired - need new timbrado');
  }

  return {
    establecimiento: est,
    puntoExpedicion: punto,
    numero,
    full,
  };
}

// Invoice types in Paraguay
export const INVOICE_TYPES = {
  FACTURA: 'Factura', // For registered businesses (with RUC)
  BOLETA: 'Boleta de Venta', // For end consumers (without RUC)
  NOTA_CREDITO: 'Nota de Crédito', // Credit notes
  NOTA_DEBITO: 'Nota de Débito', // Debit notes
  AUTOFACTURA: 'Autofactura', // Self-billing
};

// RUC validation
export function validateRUC(ruc: string): boolean {
  // Format: XXXXXXXX-X (8 digits, dash, 1 check digit)
  const pattern = /^\d{8}-\d$/;
  if (!pattern.test(ruc)) return false;

  const [base, checkDigit] = ruc.split('-');
  const calculated = calculateRUCCheckDigit(base);

  return calculated === parseInt(checkDigit);
}

function calculateRUCCheckDigit(base: string): number {
  const weights = [2, 3, 4, 5, 6, 7, 2, 3];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += parseInt(base[7 - i]) * weights[i];
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
```

### Invoice PDF Requirements

```typescript
// Required fields for Paraguayan invoices
interface ParaguayanInvoice {
  // Timbrado info (header)
  timbrado: string;
  validoDesde: string;
  validoHasta: string;

  // Business info
  razonSocial: string;
  nombreFantasia: string;
  ruc: string;
  direccion: string;
  telefono: string;

  // Invoice info
  tipoComprobante: string;
  numeroComprobante: string; // "001-001-0000001"
  fecha: string;
  condicionVenta: 'Contado' | 'Crédito';

  // Customer info
  clienteNombre: string;
  clienteRuc?: string; // Optional for Boleta
  clienteDireccion?: string;

  // Items
  items: Array<{
    cantidad: number;
    descripcion: string;
    precioUnitario: number;
    exenta: number;
    iva5: number;
    iva10: number;
  }>;

  // Totals
  subtotalExenta: number;
  subtotalIva5: number;
  subtotalIva10: number;
  totalIva5: number;
  totalIva10: number;
  totalGeneral: number;

  // Footer (legal text)
  leyenda: string; // Required legal disclaimer
}
```

---

## 3. Phone Number Formats

```typescript
// lib/utils/phone-paraguay.ts
export const PARAGUAY_PHONE = {
  COUNTRY_CODE: '595',
  MOBILE_PREFIXES: ['9'],
  LANDLINE_PREFIXES: ['21', '31', '32', '33', '41', '42', '43', '44', '45', '46', '47', '48', '71', '72', '73', '81', '82', '83'],
};

// Carrier detection
export const MOBILE_CARRIERS: Record<string, string> = {
  '981': 'Tigo',
  '982': 'Tigo',
  '983': 'Tigo',
  '984': 'Tigo',
  '985': 'Tigo',
  '971': 'Personal',
  '972': 'Personal',
  '973': 'Personal',
  '974': 'Personal',
  '975': 'Personal',
  '991': 'Claro',
  '992': 'Claro',
  '993': 'Claro',
  '994': 'Claro',
  '961': 'VOX',
  '962': 'VOX',
};

export function formatPhone(phone: string, format: 'local' | 'international' | 'display' = 'international'): string {
  const digits = phone.replace(/\D/g, '');

  // Normalize to local format (without country code, with leading 0)
  let local: string;
  if (digits.startsWith('595')) {
    local = '0' + digits.slice(3);
  } else if (!digits.startsWith('0')) {
    local = '0' + digits;
  } else {
    local = digits;
  }

  switch (format) {
    case 'local':
      return local; // 0981123456
    case 'international':
      return '+595' + local.slice(1); // +595981123456
    case 'display':
      // Format: 0981 123 456
      if (local.length === 10 && local.startsWith('09')) {
        return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
      }
      // Landline: 021 123 4567
      return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
}

export function detectCarrier(phone: string): string | null {
  const formatted = formatPhone(phone, 'local');
  const prefix = formatted.slice(1, 4); // e.g., "981"
  return MOBILE_CARRIERS[prefix] || null;
}

export function validatePhone(phone: string): { valid: boolean; type: 'mobile' | 'landline' | 'unknown'; carrier?: string } {
  const formatted = formatPhone(phone, 'local');

  // Mobile: 09XX XXX XXX (10 digits)
  if (/^09\d{8}$/.test(formatted)) {
    return {
      valid: true,
      type: 'mobile',
      carrier: detectCarrier(phone) || undefined,
    };
  }

  // Landline: 0XX XXX XXXX (10 digits) or 0XXX XXXX (8 digits for some areas)
  if (/^0(21|31|32|33|41|42|43|44|45|46|47|48|71|72|73|81|82|83)\d{6,7}$/.test(formatted)) {
    return {
      valid: true,
      type: 'landline',
    };
  }

  return { valid: false, type: 'unknown' };
}
```

---

## 4. Address Formatting

```typescript
// lib/utils/address-paraguay.ts
export interface ParaguayAddress {
  calle: string;
  numero?: string;
  barrio: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  referencias?: string; // "Frente a la plaza", "Entre X y Y"
}

// Departments of Paraguay
export const DEPARTAMENTOS = [
  { code: 'ASU', name: 'Asunción', capital: 'Asunción' },
  { code: 'CON', name: 'Concepción', capital: 'Concepción' },
  { code: 'SAN', name: 'San Pedro', capital: 'San Pedro del Ycuamandiyú' },
  { code: 'COR', name: 'Cordillera', capital: 'Caacupé' },
  { code: 'GUA', name: 'Guairá', capital: 'Villarrica' },
  { code: 'CAA', name: 'Caaguazú', capital: 'Coronel Oviedo' },
  { code: 'CAZ', name: 'Caazapá', capital: 'Caazapá' },
  { code: 'ITA', name: 'Itapúa', capital: 'Encarnación' },
  { code: 'MIS', name: 'Misiones', capital: 'San Juan Bautista' },
  { code: 'PAR', name: 'Paraguarí', capital: 'Paraguarí' },
  { code: 'APG', name: 'Alto Paraná', capital: 'Ciudad del Este' },
  { code: 'CEN', name: 'Central', capital: 'Areguá' },
  { code: 'NEE', name: 'Ñeembucú', capital: 'Pilar' },
  { code: 'AMA', name: 'Amambay', capital: 'Pedro Juan Caballero' },
  { code: 'CAN', name: 'Canindeyú', capital: 'Salto del Guairá' },
  { code: 'PHA', name: 'Presidente Hayes', capital: 'Villa Hayes' },
  { code: 'BOQ', name: 'Boquerón', capital: 'Filadelfia' },
  { code: 'APS', name: 'Alto Paraguay', capital: 'Fuerte Olimpo' },
];

// Gran Asunción cities (most common)
export const GRAN_ASUNCION = [
  'Asunción',
  'Fernando de la Mora',
  'Lambaré',
  'Luque',
  'San Lorenzo',
  'Mariano Roque Alonso',
  'Capiatá',
  'Limpio',
  'Ñemby',
  'Villa Elisa',
  'San Antonio',
  'Itauguá',
];

export function formatAddress(address: ParaguayAddress): string {
  const parts: string[] = [];

  if (address.calle) {
    parts.push(address.numero ? `${address.calle} ${address.numero}` : address.calle);
  }

  if (address.barrio) {
    parts.push(`Barrio ${address.barrio}`);
  }

  if (address.referencias) {
    parts.push(`(${address.referencias})`);
  }

  if (address.ciudad) {
    parts.push(address.ciudad);
  }

  if (address.departamento && address.departamento !== address.ciudad) {
    parts.push(address.departamento);
  }

  return parts.join(', ');
}

export function formatAddressShort(address: ParaguayAddress): string {
  const street = address.numero ? `${address.calle} ${address.numero}` : address.calle;
  return `${street}, ${address.ciudad}`;
}
```

---

## 5. Currency Formatting

```typescript
// lib/utils/currency-paraguay.ts
export const GUARANI = {
  code: 'PYG',
  symbol: '₲',
  name: 'Guaraní',
  decimals: 0, // Guaraníes don't use decimals in practice
};

export function formatGuarani(amount: number, options?: {
  showSymbol?: boolean;
  showCode?: boolean;
}): string {
  const { showSymbol = true, showCode = false } = options || {};

  // Round to whole number
  const rounded = Math.round(amount);

  // Format with thousands separator (Paraguay uses . for thousands)
  const formatted = rounded.toLocaleString('es-PY');

  if (showCode) {
    return `${formatted} PYG`;
  }

  if (showSymbol) {
    return `₲ ${formatted}`;
  }

  return formatted;
}

// Parse Guaraní input (handles both . and , as thousands separator)
export function parseGuarani(input: string): number {
  // Remove currency symbol and spaces
  let cleaned = input.replace(/[₲\s]/g, '');

  // Remove thousands separators (. or ,)
  cleaned = cleaned.replace(/[.,]/g, '');

  return parseInt(cleaned, 10) || 0;
}

// Common price points in Guaraníes
export const COMMON_PRICES = {
  consultaGeneral: 150000,
  vacunaBasica: 80000,
  vacunaPremium: 120000,
  peluqueriaBasica: 60000,
  peluqueriaPremium: 100000,
  cirugiaEsterilizacion: 350000,
};
```

---

## 6. Calendar & Holidays

```typescript
// lib/utils/calendar-paraguay.ts
export const PARAGUAY_TIMEZONE = 'America/Asuncion';

// Official holidays (feriados)
export const HOLIDAYS_2024: Array<{ date: string; name: string; type: 'nacional' | 'religioso' }> = [
  { date: '2024-01-01', name: 'Año Nuevo', type: 'nacional' },
  { date: '2024-03-01', name: 'Día de los Héroes', type: 'nacional' },
  { date: '2024-03-28', name: 'Jueves Santo', type: 'religioso' },
  { date: '2024-03-29', name: 'Viernes Santo', type: 'religioso' },
  { date: '2024-05-01', name: 'Día del Trabajador', type: 'nacional' },
  { date: '2024-05-14', name: 'Día de la Independencia (observado)', type: 'nacional' },
  { date: '2024-05-15', name: 'Día de la Independencia', type: 'nacional' },
  { date: '2024-06-12', name: 'Paz del Chaco', type: 'nacional' },
  { date: '2024-08-15', name: 'Fundación de Asunción', type: 'nacional' },
  { date: '2024-09-29', name: 'Victoria de Boquerón', type: 'nacional' },
  { date: '2024-12-08', name: 'Virgen de Caacupé', type: 'religioso' },
  { date: '2024-12-25', name: 'Navidad', type: 'religioso' },
];

export function isHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const dateStr = date.toISOString().slice(0, 10);
  const holiday = HOLIDAYS_2024.find(h => h.date === dateStr);

  return {
    isHoliday: !!holiday,
    name: holiday?.name,
  };
}

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();

  // Saturday (6) = half day, Sunday (0) = closed
  if (day === 0) return false;

  // Check if holiday
  if (isHoliday(date).isHoliday) return false;

  return true;
}

// Typical business hours in Paraguay
export const BUSINESS_HOURS = {
  weekday: { open: '08:00', close: '18:00', lunchBreak: { start: '12:00', end: '14:00' } },
  saturday: { open: '08:00', close: '12:00', lunchBreak: null },
  sunday: null,
};
```

---

## 7. Spanish (Paraguay) Considerations

### Paraguayan Spanish Phrases

```typescript
// lib/i18n/paraguay-spanish.ts
export const PARAGUAY_PHRASES = {
  // Greetings
  hello: '¡Hola!', // Standard
  helloInformal: '¡Hola, qué tal!',
  goodbye: '¡Hasta luego!',
  goodbyeInformal: '¡Chau!', // Very common in Paraguay

  // Common expressions
  yes: 'Sí',
  no: 'No',
  please: 'Por favor',
  thanks: 'Gracias',
  thanksInformal: '¡Gracias, che!', // "che" is very Paraguayan
  yourWelcome: 'De nada',

  // Customer service
  howCanIHelp: '¿En qué puedo ayudarte?',
  anythingElse: '¿Algo más?',
  haveAGoodDay: '¡Que te vaya bien!',

  // Veterinary specific
  petOwner: 'dueño/a', // Owner
  appointmentConfirmed: 'Tu cita está confirmada',
  appointmentReminder: 'Te recordamos tu cita',
  vaccineDue: 'Vacuna pendiente',
  prescriptionReady: 'Receta lista',

  // Payment
  total: 'Total',
  subtotal: 'Subtotal',
  tax: 'IVA',
  cash: 'Efectivo',
  card: 'Tarjeta',
  mobilePayment: 'Pago móvil',
};

// Guaraní influences (common in Paraguay)
export const GUARANI_LOANWORDS = {
  che: 'friend/buddy', // Used like "dude" in English
  piko: 'right?/isn't it?', // Question particle
  nde: 'you', // Informal
  mbaé: 'what/thing',
  mbaeichapa: 'how are you?',
  iporã: 'good/fine',
};

// Date formatting in Paraguayan Spanish
export function formatDateParaguay(date: Date): string {
  return date.toLocaleDateString('es-PY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Example: "viernes, 15 de enero de 2024"
```

### Common Veterinary Terms in Spanish

```typescript
export const VET_TERMS_ES = {
  // Animals
  dog: 'perro',
  cat: 'gato',
  puppy: 'cachorro',
  kitten: 'gatito',
  pet: 'mascota',

  // Medical
  consultation: 'consulta',
  vaccine: 'vacuna',
  vaccination: 'vacunación',
  surgery: 'cirugía',
  prescription: 'receta',
  medication: 'medicamento',
  treatment: 'tratamiento',
  diagnosis: 'diagnóstico',
  exam: 'examen',
  labResults: 'resultados de laboratorio',

  // Conditions
  healthy: 'sano/a',
  sick: 'enfermo/a',
  injured: 'herido/a',
  emergency: 'emergencia',

  // Actions
  schedule: 'agendar',
  confirm: 'confirmar',
  cancel: 'cancelar',
  reschedule: 'reprogramar',

  // Status
  pending: 'pendiente',
  confirmed: 'confirmado',
  completed: 'completado',
  cancelled: 'cancelado',
};
```

---

## 8. Legal Requirements

### Required Business Information on Invoices

```typescript
export const INVOICE_LEGAL_REQUIREMENTS = {
  // Must appear on all invoices
  required: [
    'Razón Social',
    'RUC',
    'Timbrado (número y validez)',
    'Número de comprobante',
    'Fecha de emisión',
    'Condición de venta (Contado/Crédito)',
    'Descripción de bienes/servicios',
    'Valor de venta',
    'IVA discriminado',
  ],

  // Legal disclaimer (required on all invoices)
  leyendaObligatoria: 'Emisión autorizada por la SET. Este documento no tiene valor comercial ni fiscal si presenta tachaduras o enmiendas.',
};

// Data protection (based on Paraguay Law 1682/01)
export const DATA_PROTECTION = {
  consentRequired: true,
  retentionPeriod: '5 years', // Tax records
  customerRights: [
    'Acceso a sus datos',
    'Rectificación de datos incorrectos',
    'Eliminación de datos (salvo obligaciones legales)',
    'Oposición al uso de datos para marketing',
  ],
};
```

---

*Reference: SET (Subsecretaría de Estado de Tributación), Bancard documentation, local carrier APIs*
