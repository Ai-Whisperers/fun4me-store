# INT-005: Laboratory Equipment Integration

## Priority: P3
## Category: Integrations
## Status: Not Started
## Epic: [EPIC-15: Integration Expansion](../epics/EPIC-15-integration-expansion.md)

## Description
Integrate with common veterinary laboratory equipment to automatically import test results, reducing manual data entry and errors.

## Current State
- Lab results entered manually
- No equipment connectivity
- PDF results uploaded as attachments
- Time-consuming data entry

## Proposed Solution

### Lab Equipment Interface
```typescript
// lib/lab-integration/interface.ts
interface LabEquipment {
  name: string;
  manufacturer: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getResults(): Promise<LabResult[]>;
  getStatus(): Promise<EquipmentStatus>;
}

interface LabResult {
  sampleId: string;
  testCode: string;
  testName: string;
  value: number | string;
  unit: string;
  referenceRange?: { min: number; max: number };
  isAbnormal: boolean;
  timestamp: Date;
  rawData?: object;
}
```

### IDEXX Integration
```typescript
// lib/lab-integration/idexx.ts
export class IDEXXVetLab implements LabEquipment {
  name = 'IDEXX VetLab Station';
  manufacturer = 'IDEXX';

  private client: IDEXXClient;

  async connect() {
    this.client = new IDEXXClient({
      host: process.env.IDEXX_HOST,
      port: parseInt(process.env.IDEXX_PORT || '8080'),
      apiKey: process.env.IDEXX_API_KEY,
    });
    await this.client.authenticate();
  }

  async getResults(): Promise<LabResult[]> {
    const rawResults = await this.client.fetchPendingResults();

    return rawResults.map(r => ({
      sampleId: r.accession_number,
      testCode: r.test_code,
      testName: r.test_name,
      value: r.result_value,
      unit: r.unit,
      referenceRange: r.reference_range,
      isAbnormal: r.flag !== 'N',
      timestamp: new Date(r.result_time),
      rawData: r,
    }));
  }

  async markResultsProcessed(sampleIds: string[]) {
    await this.client.acknowledgeResults(sampleIds);
  }
}
```

### Generic HL7 Integration
```typescript
// lib/lab-integration/hl7.ts
import { Message } from 'hl7js';

export class HL7LabIntegration implements LabEquipment {
  name = 'HL7 Generic';
  manufacturer = 'Various';

  async parseHL7Message(rawMessage: string): Promise<LabResult[]> {
    const msg = new Message(rawMessage);

    // Parse OBX segments (Observation/Result)
    const results: LabResult[] = [];
    const obxSegments = msg.get('OBX');

    for (const obx of obxSegments) {
      results.push({
        sampleId: msg.get('OBR.3').toString(), // Filler Order Number
        testCode: obx.get('OBX.3.1').toString(),
        testName: obx.get('OBX.3.2').toString(),
        value: obx.get('OBX.5').toString(),
        unit: obx.get('OBX.6').toString(),
        referenceRange: this.parseRange(obx.get('OBX.7').toString()),
        isAbnormal: obx.get('OBX.8').toString() !== 'N',
        timestamp: this.parseHL7DateTime(obx.get('OBX.14').toString()),
      });
    }

    return results;
  }

  private parseRange(range: string): { min: number; max: number } | undefined {
    const match = range.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
    if (match) {
      return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
    }
    return undefined;
  }
}
```

### Result Import Workflow
```typescript
// lib/lab-integration/importer.ts
export async function importLabResults(tenantId: string) {
  const equipment = await getConnectedEquipment(tenantId);
  const importedCount = { total: 0, matched: 0, unmatched: 0 };

  for (const device of equipment) {
    await device.connect();
    const results = await device.getResults();

    for (const result of results) {
      // Match to existing lab order
      const labOrder = await findLabOrderBySample(tenantId, result.sampleId);

      if (labOrder) {
        await supabase.from('lab_results').insert({
          lab_order_id: labOrder.id,
          test_id: await mapTestCode(result.testCode),
          value: result.value.toString(),
          unit: result.unit,
          reference_min: result.referenceRange?.min,
          reference_max: result.referenceRange?.max,
          is_abnormal: result.isAbnormal,
          imported_at: new Date().toISOString(),
          source_device: device.name,
          raw_data: result.rawData,
        });

        importedCount.matched++;
      } else {
        // Store unmatched for manual review
        await supabase.from('lab_results_unmatched').insert({
          tenant_id: tenantId,
          sample_id: result.sampleId,
          result_data: result,
          device_name: device.name,
        });

        importedCount.unmatched++;
      }

      importedCount.total++;
    }

    await device.disconnect();
  }

  return importedCount;
}
```

### Equipment Management UI
```tsx
// app/[clinic]/dashboard/settings/lab-equipment/page.tsx
export default function LabEquipmentSettings() {
  const { equipment, isLoading } = useLabEquipment();

  return (
    <div>
      <h1>Equipos de Laboratorio</h1>

      <div className="space-y-4">
        {equipment.map((device) => (
          <EquipmentCard
            key={device.id}
            device={device}
            onTest={() => testConnection(device.id)}
            onSync={() => syncResults(device.id)}
          />
        ))}
      </div>

      <AddEquipmentButton />
    </div>
  );
}
```

## Implementation Steps
1. Research common vet lab equipment protocols
2. Create equipment abstraction layer
3. Implement IDEXX integration
4. Implement HL7 parser for generic equipment
5. Build result matching logic
6. Create equipment management UI
7. Add automated sync scheduling

## Acceptance Criteria
- [ ] IDEXX integration working
- [ ] HL7 parsing implemented
- [ ] Results matched to lab orders
- [ ] Unmatched results queued
- [ ] Equipment management UI
- [ ] Automated sync option

## Supported Equipment (Target)
| Equipment | Protocol | Priority |
|-----------|----------|----------|
| IDEXX VetLab | REST API | High |
| Abaxis VetScan | HL7 | Medium |
| Heska Element | HL7 | Medium |
| Generic analyzers | HL7 v2.x | Low |

## Related Files
- `lib/lab-integration/` - Integration providers
- `app/api/lab/` - Lab APIs
- `app/[clinic]/dashboard/settings/` - Settings

## Estimated Effort
- 20 hours
  - Protocol research: 3h
  - IDEXX integration: 6h
  - HL7 parser: 5h
  - Result matching: 3h
  - UI: 3h
