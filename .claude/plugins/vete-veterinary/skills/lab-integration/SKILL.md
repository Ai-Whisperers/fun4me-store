---
name: lab-integration
description: Laboratory equipment integration patterns for veterinary clinics including IDEXX, HL7/FHIR message parsing, lab result normalization, and reference range handling. Use when building lab integration features.
---

# Laboratory Equipment Integration Guide

## Overview

This skill covers integration patterns for veterinary laboratory equipment, including analyzers from IDEXX, Abaxis, Heska, and generic HL7-compliant devices.

---

## 1. Common Lab Equipment Protocols

### Protocol Comparison

| Protocol | Used By | Format | Connection |
|----------|---------|--------|------------|
| IDEXX VetConnect | IDEXX analyzers | Proprietary JSON | REST API |
| HL7 v2.x | Legacy analyzers | Pipe-delimited | Serial/TCP |
| ASTM E1381/E1394 | Clinical analyzers | Frame-based | Serial |
| FHIR R4 | Modern systems | JSON/XML | REST API |
| POCT1-A | Point-of-care | XML | USB/Network |

---

## 2. IDEXX VetConnect Integration

### API Client

```typescript
// lib/lab/idexx/client.ts
interface IDEXXConfig {
  baseUrl: string;
  apiKey: string;
  practiceId: string;
}

interface IDEXXPatient {
  patientId: string;
  patientName: string;
  species: 'Canine' | 'Feline' | 'Equine' | 'Other';
  breed?: string;
  sex?: 'Male' | 'Female' | 'Unknown';
  dateOfBirth?: string;
  weight?: number;
  weightUnit?: 'kg' | 'lb';
}

interface IDEXXOrderRequest {
  patient: IDEXXPatient;
  owner: {
    lastName: string;
    firstName: string;
  };
  tests: string[]; // Test codes
  clinician?: string;
  notes?: string;
}

interface IDEXXResult {
  orderId: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  results: Array<{
    testCode: string;
    testName: string;
    value: string;
    unit: string;
    referenceRange: {
      low: number;
      high: number;
    };
    flag: 'Normal' | 'Low' | 'High' | 'Critical';
    timestamp: string;
  }>;
}

export class IDEXXClient {
  private config: IDEXXConfig;
  private accessToken: string | null = null;

  constructor(config: IDEXXConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.apiKey,
        scope: 'vetconnect',
      }),
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  async createOrder(request: IDEXXOrderRequest): Promise<string> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Practice-Id': this.config.practiceId,
      },
      body: JSON.stringify({
        patient: request.patient,
        owner: request.owner,
        orderedTests: request.tests.map(code => ({ testCode: code })),
        orderingClinician: request.clinician,
        clinicalNotes: request.notes,
      }),
    });

    const data = await response.json();
    return data.orderId;
  }

  async getResults(orderId: string): Promise<IDEXXResult> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}/v1/orders/${orderId}/results`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Practice-Id': this.config.practiceId,
      },
    });

    return response.json();
  }

  async getAvailableTests(): Promise<Array<{ code: string; name: string; category: string }>> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}/v1/tests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Practice-Id': this.config.practiceId,
      },
    });

    return response.json();
  }
}
```

### IDEXX Test Code Mapping

```typescript
// lib/lab/idexx/test-codes.ts
export const IDEXX_TEST_CODES = {
  // Chemistry
  CHEM17: { name: 'Chemistry Panel 17', category: 'Chemistry' },
  CHEM10: { name: 'Chemistry Panel 10', category: 'Chemistry' },
  LIPA: { name: 'Lipase', category: 'Chemistry' },
  SPEC_CPL: { name: 'Spec cPL (Canine Pancreas-Specific Lipase)', category: 'Chemistry' },
  SPEC_FPL: { name: 'Spec fPL (Feline Pancreas-Specific Lipase)', category: 'Chemistry' },
  SDMA: { name: 'SDMA (Kidney Function)', category: 'Chemistry' },

  // Hematology
  CBC: { name: 'Complete Blood Count', category: 'Hematology' },
  DIFF: { name: 'Differential', category: 'Hematology' },
  RETIC: { name: 'Reticulocyte Count', category: 'Hematology' },

  // Endocrine
  T4: { name: 'Total T4', category: 'Endocrine' },
  FT4: { name: 'Free T4', category: 'Endocrine' },
  TSH: { name: 'TSH', category: 'Endocrine' },
  CORTISOL: { name: 'Cortisol', category: 'Endocrine' },

  // Infectious Disease
  SNAP_4DX: { name: '4Dx Plus (Heartworm, Lyme, Ehrlichia, Anaplasma)', category: 'Infectious' },
  SNAP_FELV_FIV: { name: 'FeLV/FIV Combo', category: 'Infectious' },
  SNAP_PARVO: { name: 'Parvo', category: 'Infectious' },
  SNAP_GIARDIA: { name: 'Giardia', category: 'Infectious' },

  // Urinalysis
  UA: { name: 'Urinalysis', category: 'Urinalysis' },
  UPC: { name: 'Urine Protein:Creatinine Ratio', category: 'Urinalysis' },
  URINE_CULTURE: { name: 'Urine Culture', category: 'Urinalysis' },

  // Coagulation
  PT_PTT: { name: 'PT/PTT', category: 'Coagulation' },
};
```

---

## 3. HL7 v2.x Message Parsing

### HL7 Parser

```typescript
// lib/lab/hl7/parser.ts
interface HL7Message {
  type: string;
  version: string;
  timestamp: Date;
  sendingApp: string;
  sendingFacility: string;
  segments: HL7Segment[];
}

interface HL7Segment {
  type: string;
  fields: string[];
}

interface HL7LabResult {
  patientId: string;
  patientName: string;
  species: string;
  orderId: string;
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  abnormalFlag: string;
  resultStatus: string;
  observationTime: Date;
}

export class HL7Parser {
  private fieldSeparator = '|';
  private componentSeparator = '^';
  private repetitionSeparator = '~';
  private escapeCharacter = '\\';
  private subcomponentSeparator = '&';

  parse(message: string): HL7Message {
    const lines = message.split(/\r?\n/).filter(line => line.trim());
    const segments: HL7Segment[] = [];

    for (const line of lines) {
      const fields = line.split(this.fieldSeparator);
      segments.push({
        type: fields[0],
        fields: fields.slice(1),
      });
    }

    // Parse MSH segment for metadata
    const msh = segments.find(s => s.type === 'MSH');
    if (!msh) throw new Error('Invalid HL7: Missing MSH segment');

    // Update separators from MSH.1
    if (msh.fields[0]) {
      this.componentSeparator = msh.fields[0][0] || '^';
      this.repetitionSeparator = msh.fields[0][1] || '~';
      this.escapeCharacter = msh.fields[0][2] || '\\';
      this.subcomponentSeparator = msh.fields[0][3] || '&';
    }

    return {
      type: msh.fields[7] || 'Unknown', // MSH-9
      version: msh.fields[10] || '2.5', // MSH-12
      timestamp: this.parseDateTime(msh.fields[5]), // MSH-7
      sendingApp: msh.fields[1] || '', // MSH-3
      sendingFacility: msh.fields[2] || '', // MSH-4
      segments,
    };
  }

  parseLabResults(message: HL7Message): HL7LabResult[] {
    const results: HL7LabResult[] = [];

    // Find PID segment for patient info
    const pid = message.segments.find(s => s.type === 'PID');
    const patientId = pid?.fields[2] || ''; // PID-3
    const patientName = this.parsePatientName(pid?.fields[4] || ''); // PID-5

    // Find OBR segments (one per test order)
    const obrSegments = message.segments.filter(s => s.type === 'OBR');

    // Find OBX segments (one per result)
    const obxSegments = message.segments.filter(s => s.type === 'OBX');

    for (const obx of obxSegments) {
      const testId = this.parseComponent(obx.fields[2], 0); // OBX-3.1
      const testName = this.parseComponent(obx.fields[2], 1); // OBX-3.2

      results.push({
        patientId,
        patientName,
        species: '', // Would come from PID-35 in veterinary HL7
        orderId: obrSegments[0]?.fields[1] || '', // OBR-2
        testCode: testId,
        testName: testName,
        value: obx.fields[4] || '', // OBX-5
        unit: obx.fields[5] || '', // OBX-6
        referenceRange: obx.fields[6] || '', // OBX-7
        abnormalFlag: obx.fields[7] || '', // OBX-8
        resultStatus: obx.fields[10] || '', // OBX-11
        observationTime: this.parseDateTime(obx.fields[13] || ''), // OBX-14
      });
    }

    return results;
  }

  private parseComponent(field: string, index: number): string {
    const components = field.split(this.componentSeparator);
    return components[index] || '';
  }

  private parsePatientName(field: string): string {
    const components = field.split(this.componentSeparator);
    // Format: LastName^FirstName^MiddleName
    return [components[1], components[0]].filter(Boolean).join(' ');
  }

  private parseDateTime(value: string): Date {
    if (!value) return new Date();

    // HL7 format: YYYYMMDDHHMMSS
    const year = parseInt(value.slice(0, 4));
    const month = parseInt(value.slice(4, 6)) - 1;
    const day = parseInt(value.slice(6, 8));
    const hour = parseInt(value.slice(8, 10)) || 0;
    const minute = parseInt(value.slice(10, 12)) || 0;
    const second = parseInt(value.slice(12, 14)) || 0;

    return new Date(year, month, day, hour, minute, second);
  }
}
```

### Sample HL7 Message

```
MSH|^~\&|IDEXX|VetLab|VETE|Clinic|20240115120000||ORU^R01|12345|P|2.5
PID|||12345^^^VETE||Rover^Dog||20200101|M|||||||||||||||Canine^DOG
OBR|1|12345|12345|CHEM17^Chemistry Panel 17|||20240115110000
OBX|1|NM|BUN^Blood Urea Nitrogen||15|mg/dL|7-27||||F|||20240115115000
OBX|2|NM|CREA^Creatinine||1.2|mg/dL|0.5-1.8||||F|||20240115115000
OBX|3|NM|GLU^Glucose||95|mg/dL|74-143||||F|||20240115115000
OBX|4|NM|ALT^Alanine Aminotransferase||45|U/L|10-125||||F|||20240115115000
OBX|5|NM|ALP^Alkaline Phosphatase||89|U/L|23-212||||F|||20240115115000
```

---

## 4. Result Normalization

### Unified Result Format

```typescript
// lib/lab/normalize.ts
interface NormalizedLabResult {
  id: string;
  orderId: string;
  petId: string;
  testCode: string;
  testName: string;
  category: LabTestCategory;
  value: number | string;
  valueType: 'numeric' | 'text' | 'coded';
  unit: string;
  referenceRange: {
    low?: number;
    high?: number;
    text?: string;
  };
  interpretation: 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high' | 'abnormal';
  species: 'dog' | 'cat' | 'other';
  observedAt: Date;
  source: 'idexx' | 'hl7' | 'manual';
  rawData?: any;
}

type LabTestCategory =
  | 'chemistry'
  | 'hematology'
  | 'endocrine'
  | 'urinalysis'
  | 'coagulation'
  | 'infectious'
  | 'cytology'
  | 'other';

// Reference ranges by species
const REFERENCE_RANGES: Record<string, Record<string, { dog: [number, number]; cat: [number, number] }>> = {
  BUN: { unit: 'mg/dL', dog: [7, 27], cat: [16, 36] },
  CREA: { unit: 'mg/dL', dog: [0.5, 1.8], cat: [0.8, 2.4] },
  GLU: { unit: 'mg/dL', dog: [74, 143], cat: [74, 159] },
  ALT: { unit: 'U/L', dog: [10, 125], cat: [12, 130] },
  ALP: { unit: 'U/L', dog: [23, 212], cat: [14, 111] },
  TP: { unit: 'g/dL', dog: [5.2, 8.2], cat: [5.7, 8.9] },
  ALB: { unit: 'g/dL', dog: [2.3, 4.0], cat: [2.1, 3.3] },
  // ... more tests
};

export function normalizeResult(
  raw: any,
  source: 'idexx' | 'hl7' | 'manual',
  petId: string,
  species: 'dog' | 'cat' | 'other'
): NormalizedLabResult {
  const testCode = raw.testCode || raw.code;
  const numericValue = parseFloat(raw.value);
  const isNumeric = !isNaN(numericValue);

  // Get reference range for species
  const refRange = REFERENCE_RANGES[testCode];
  const speciesRange = refRange?.[species === 'other' ? 'dog' : species];

  // Determine interpretation
  let interpretation: NormalizedLabResult['interpretation'] = 'normal';
  if (isNumeric && speciesRange) {
    const [low, high] = speciesRange;
    const criticalLow = low * 0.5;
    const criticalHigh = high * 1.5;

    if (numericValue < criticalLow) interpretation = 'critical_low';
    else if (numericValue > criticalHigh) interpretation = 'critical_high';
    else if (numericValue < low) interpretation = 'low';
    else if (numericValue > high) interpretation = 'high';
  } else if (raw.flag === 'H' || raw.abnormalFlag === 'H') {
    interpretation = 'high';
  } else if (raw.flag === 'L' || raw.abnormalFlag === 'L') {
    interpretation = 'low';
  } else if (raw.flag === 'A' || raw.abnormalFlag === 'A') {
    interpretation = 'abnormal';
  }

  return {
    id: `${source}-${raw.orderId || ''}-${testCode}-${Date.now()}`,
    orderId: raw.orderId,
    petId,
    testCode,
    testName: raw.testName || raw.name || testCode,
    category: categorizeTest(testCode),
    value: isNumeric ? numericValue : raw.value,
    valueType: isNumeric ? 'numeric' : 'text',
    unit: raw.unit || refRange?.unit || '',
    referenceRange: {
      low: speciesRange?.[0],
      high: speciesRange?.[1],
      text: raw.referenceRange,
    },
    interpretation,
    species,
    observedAt: new Date(raw.observationTime || raw.timestamp || Date.now()),
    source,
    rawData: raw,
  };
}

function categorizeTest(testCode: string): LabTestCategory {
  const categories: Record<string, LabTestCategory> = {
    BUN: 'chemistry',
    CREA: 'chemistry',
    GLU: 'chemistry',
    ALT: 'chemistry',
    ALP: 'chemistry',
    // Hematology
    WBC: 'hematology',
    RBC: 'hematology',
    HGB: 'hematology',
    HCT: 'hematology',
    PLT: 'hematology',
    // Endocrine
    T4: 'endocrine',
    TSH: 'endocrine',
    CORTISOL: 'endocrine',
    // Urinalysis
    UA: 'urinalysis',
    UPC: 'urinalysis',
  };

  return categories[testCode] || 'other';
}
```

---

## 5. Lab Order Workflow

```typescript
// lib/lab/workflow.ts
import { createClient } from '@/lib/supabase/server';
import { IDEXXClient } from './idexx/client';
import { normalizeResult } from './normalize';

interface CreateLabOrderRequest {
  petId: string;
  tests: string[];
  clinician: string;
  notes?: string;
  priority?: 'routine' | 'urgent';
}

export async function createLabOrder(request: CreateLabOrderRequest) {
  const supabase = await createClient();

  // Get pet and owner info
  const { data: pet } = await supabase
    .from('pets')
    .select(`
      id, name, species, breed, date_of_birth, weight,
      owner:profiles!pets_owner_id_fkey (full_name)
    `)
    .eq('id', request.petId)
    .single();

  if (!pet) throw new Error('Mascota no encontrada');

  // Create order in database
  const { data: order, error } = await supabase
    .from('lab_orders')
    .insert({
      pet_id: request.petId,
      ordered_by: request.clinician,
      status: 'pending',
      priority: request.priority || 'routine',
      notes: request.notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Create order items
  await supabase.from('lab_order_items').insert(
    request.tests.map(testCode => ({
      lab_order_id: order.id,
      test_code: testCode,
      status: 'pending',
    }))
  );

  // Send to IDEXX if configured
  if (process.env.IDEXX_API_KEY) {
    const idexx = new IDEXXClient({
      baseUrl: process.env.IDEXX_BASE_URL!,
      apiKey: process.env.IDEXX_API_KEY,
      practiceId: process.env.IDEXX_PRACTICE_ID!,
    });

    const externalOrderId = await idexx.createOrder({
      patient: {
        patientId: pet.id,
        patientName: pet.name,
        species: mapSpecies(pet.species),
        breed: pet.breed,
        dateOfBirth: pet.date_of_birth,
        weight: pet.weight,
        weightUnit: 'kg',
      },
      owner: {
        lastName: pet.owner.full_name.split(' ').pop() || '',
        firstName: pet.owner.full_name.split(' ')[0] || '',
      },
      tests: request.tests,
      clinician: request.clinician,
      notes: request.notes,
    });

    // Update order with external ID
    await supabase
      .from('lab_orders')
      .update({
        external_order_id: externalOrderId,
        external_system: 'idexx',
      })
      .eq('id', order.id);
  }

  return order;
}

export async function processLabResults(
  orderId: string,
  results: any[],
  source: 'idexx' | 'hl7' | 'manual'
) {
  const supabase = await createClient();

  // Get order with pet info
  const { data: order } = await supabase
    .from('lab_orders')
    .select('pet_id, pets (species)')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Orden no encontrada');

  const species = order.pets.species === 'dog' ? 'dog' : order.pets.species === 'cat' ? 'cat' : 'other';

  // Normalize and store results
  for (const rawResult of results) {
    const normalized = normalizeResult(rawResult, source, order.pet_id, species);

    await supabase.from('lab_results').insert({
      lab_order_id: orderId,
      test_code: normalized.testCode,
      test_name: normalized.testName,
      value: normalized.value.toString(),
      value_type: normalized.valueType,
      unit: normalized.unit,
      reference_low: normalized.referenceRange.low,
      reference_high: normalized.referenceRange.high,
      interpretation: normalized.interpretation,
      is_abnormal: normalized.interpretation !== 'normal',
      observed_at: normalized.observedAt.toISOString(),
      raw_data: normalized.rawData,
    });
  }

  // Update order status
  await supabase
    .from('lab_orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', orderId);

  // Update order items
  for (const result of results) {
    await supabase
      .from('lab_order_items')
      .update({ status: 'completed' })
      .eq('lab_order_id', orderId)
      .eq('test_code', result.testCode);
  }
}

function mapSpecies(species: string): 'Canine' | 'Feline' | 'Other' {
  switch (species.toLowerCase()) {
    case 'dog':
    case 'perro':
      return 'Canine';
    case 'cat':
    case 'gato':
      return 'Feline';
    default:
      return 'Other';
  }
}
```

---

## 6. Webhook Handler for External Results

```typescript
// api/webhooks/lab-results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processLabResults } from '@/lib/lab/workflow';
import { HL7Parser } from '@/lib/lab/hl7/parser';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  // Verify webhook signature
  const signature = request.headers.get('x-webhook-signature');
  if (!verifySignature(signature, await request.clone().text())) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    if (contentType.includes('application/json')) {
      // IDEXX JSON format
      const body = await request.json();
      await handleIDEXXWebhook(body);
    } else if (contentType.includes('text/plain') || contentType.includes('x-hl7')) {
      // HL7 format
      const body = await request.text();
      await handleHL7Message(body);
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lab webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleIDEXXWebhook(body: any) {
  const { orderId, results, status } = body;

  if (status === 'Completed' && results?.length > 0) {
    // Find our order by external ID
    const { data: order } = await supabase
      .from('lab_orders')
      .select('id')
      .eq('external_order_id', orderId)
      .single();

    if (order) {
      await processLabResults(order.id, results, 'idexx');
    }
  }
}

async function handleHL7Message(message: string) {
  const parser = new HL7Parser();
  const parsed = parser.parse(message);

  if (parsed.type === 'ORU^R01') {
    // Result message
    const results = parser.parseLabResults(parsed);

    // Find order by patient ID or order number
    const orderId = results[0]?.orderId;
    if (orderId) {
      await processLabResults(orderId, results, 'hl7');
    }
  }
}
```

---

*Reference: IDEXX VetConnect API, HL7 v2.5 specification, veterinary lab standards*
