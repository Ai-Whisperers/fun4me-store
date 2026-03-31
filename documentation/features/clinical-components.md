# Clinical Components

React components for veterinary clinical decision support tools.

> **Location**: `web/components/clinical/`
> **Last Updated**: January 2026

---

## Overview

Clinical components provide decision support for veterinarians:

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| `DosageCalculator` | Drug dosage calculation | `drug_dosages` table |
| `DiagnosisSearch` | Diagnosis code lookup | `diagnosis_codes` table |
| `QoLAssessment` | Quality of life scoring (HHHHHMM) | In-memory |
| `DrugSearch` | Drug/medication search | `drug_dosages` table |
| `GrowthChart` | Growth tracking vs standards | `growth_standards` table |
| `DigitalSignature` | Capture signatures | Canvas API |
| `PrescriptionPdf` | Generate prescription PDFs | @react-pdf/renderer |
| `PrescriptionDownloadButton` | Download prescription | PDF generation |

---

## Component Architecture

```
components/clinical/
├── dosage-calculator.tsx      # Drug dosing with warnings
├── diagnosis-search.tsx       # Autocomplete diagnosis lookup
├── qol-assessment.tsx         # HHHHHMM quality of life scale
├── drug-search.tsx            # Drug/medication search
├── growth-chart.tsx           # Weight tracking charts
├── digital-signature.tsx      # Signature capture
├── prescription-pdf.tsx       # PDF generation
└── prescription-download-button.tsx
```

---

## Dosage Calculator

Calculates medication doses based on weight and drug parameters.

### Usage

```tsx
import { DosageCalculator } from '@/components/clinical'

<DosageCalculator
  initialWeightKg={25.5}
  species="dog"
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `initialWeightKg` | `number` | Pre-filled weight |
| `species` | `'dog' \| 'cat'` | Filter drugs by species |

### Features

- **Drug selection** from database (API: `/api/drug_dosages`)
- **Dose range calculation** (min/max mg/kg × weight)
- **Volume calculation** (mg ÷ concentration)
- **Absolute max dose** enforcement
- **Safety warnings**:
  - Very small volumes (< 0.1ml) - measurement difficulty
  - Max dose capped alert
  - Weight validation (< 0 or > 200kg)

### Drug Data Structure

```typescript
interface Drug {
  id: string
  name: string
  species: 'dog' | 'cat' | 'all'
  min_dose_mg_kg: number
  max_dose_mg_kg: number
  concentration_mg_ml: number
  notes: string
  max_absolute_mg?: number  // Cap regardless of weight
}
```

### Calculation Example

```
Dog weight: 25 kg
Drug: Amoxicillin (10-20 mg/kg, 50mg/ml)

Min dose: 10 × 25 = 250 mg → 5.0 ml
Max dose: 20 × 25 = 500 mg → 10.0 ml

Result: Administrar 5.0 - 10.0 ml (250 - 500 mg totales)
```

---

## Diagnosis Search

Autocomplete search for veterinary diagnosis codes (VeNom/SNOMED compatible).

### Usage

```tsx
import { DiagnosisSearch } from '@/components/clinical'

<DiagnosisSearch
  onSelect={(diagnosis) => {
    console.log(`Selected: ${diagnosis.term} (${diagnosis.code})`)
    setDiagnosisCode(diagnosis.code)
  }}
  placeholder="Buscar diagnóstico..."
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `onSelect` | `(diagnosis: Diagnosis) => void` | Callback when diagnosis selected |
| `placeholder` | `string` | Input placeholder text |

### Features

- **Debounced search** (300ms delay)
- **Minimum 2 characters** to trigger search
- **Displays term + code** in dropdown
- **Category grouping** in results
- **API**: `/api/diagnosis_codes?q={query}`

### Diagnosis Data Structure

```typescript
interface Diagnosis {
  id: string
  code: string     // e.g., "VeNom:123456"
  term: string     // e.g., "Otitis externa"
  category: string // e.g., "Dermatología"
}
```

---

## Quality of Life Assessment (HHHHHMM)

Implements the Dr. Alice Villalobos HHHHHMM Quality of Life Scale for end-of-life decisions.

### Usage

```tsx
import { QoLAssessment } from '@/components/clinical'

<QoLAssessment
  onComplete={(score, notes) => {
    console.log(`Total: ${score}/70`)
    console.log(`Notes: ${notes}`)
    addToMedicalRecord(notes)
  }}
/>
```

### Categories Scored (0-10 each)

| Category | Spanish | Critical | Description |
|----------|---------|----------|-------------|
| Hurt | Dolor | Yes | Pain level and control |
| Hunger | Hambre | Yes | Eating normally |
| Hydration | Hidratación | Yes | Fluid intake/status |
| Hygiene | Higiene | No | Cleanliness maintenance |
| Happiness | Felicidad | No | Mental state/response |
| Mobility | Movilidad | No | Movement ability |
| Good Days | Días Buenos | No | Ratio of good to bad days |

### Scoring Interpretation

| Total Score | Interpretation |
|-------------|----------------|
| > 35 | Calidad de vida aceptable |
| 25-35 | Calidad comprometida, evaluar opciones |
| < 25 | Calidad pobre, considerar cuidados paliativos |

### Critical Warnings

- Score ≤ 2 in any **critical** category (Hurt, Hunger, Hydration) triggers warning
- Visual alert with specific category and recommendation

### Output Notes

```
Evaluación HHHHHMM: Total 42/70. Calidad aceptable.
```

Or with critical warnings:
```
Evaluación HHHHHMM: Total 28/70. ALERTA: Dolor (Hurt): Puntuación crítica (2/10).
Calidad comprometida - evaluar opciones con el veterinario.
```

### Disclaimer

The component includes a prominent disclaimer that this tool is a **guide only** and does not substitute professional veterinary judgment for end-of-life decisions.

---

## Drug Search

Search and filter medications database.

### Usage

```tsx
import { DrugSearch } from '@/components/clinical'

<DrugSearch
  species="dog"
  onSelect={(drug) => setSelectedDrug(drug)}
/>
```

### Features

- Filter by species
- Search by name
- Display concentration and route
- Show dosing notes

---

## Growth Chart

Visualize pet weight against breed-specific growth standards.

### Usage

```tsx
import { GrowthChart } from '@/components/clinical'

<GrowthChart
  petId={petId}
  species="dog"
  breedCategory="large"
/>
```

### Features

- **Percentile curves** (P5, P25, P50, P75, P95)
- **Historical weight points** plotted
- **Age-appropriate** x-axis (weeks for puppies, months for adults)
- **Breed size categories**: toy, small, medium, large, giant
- **Interactive tooltips** with exact values

---

## Digital Signature

Capture handwritten signatures on canvas.

### Usage

```tsx
import { DigitalSignature } from '@/components/clinical'

<DigitalSignature
  onSave={async (signatureDataUrl) => {
    // Upload to Supabase Storage
    const { data } = await supabase.storage
      .from('signatures')
      .upload(`${prescriptionId}.png`, dataUrlToBlob(signatureDataUrl))
  }}
  width={400}
  height={200}
/>
```

### Features

- Touch and mouse support
- Clear button
- Smooth drawing
- PNG data URL output
- Customizable dimensions

---

## Prescription PDF

Generate printable prescription documents.

### Usage

```tsx
import { PrescriptionPdf, PrescriptionDownloadButton } from '@/components/clinical'

// For download button
<PrescriptionDownloadButton
  prescription={prescriptionData}
  clinic={clinicData}
  pet={petData}
/>

// Or render PDF directly
const blob = await pdf(<PrescriptionPdf prescription={...} clinic={...} pet={...} />).toBlob()
```

### PDF Contents

- Clinic header with logo and contact
- Patient information (pet name, species, breed, weight)
- Owner information
- Medication list with dosages
- Instructions and notes
- Veterinarian signature and license
- Date and validity period

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/drug_dosages` | GET | List drugs with dosing |
| `/api/drug_dosages?species=dog` | GET | Filter by species |
| `/api/diagnosis_codes?q=otitis` | GET | Search diagnoses |
| `/api/growth_standards` | GET | Growth percentiles |

---

## Database Tables

### Drug Dosages

```sql
CREATE TABLE drug_dosages (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT CHECK (species IN ('dog', 'cat', 'all')),
  min_dose_mg_kg NUMERIC NOT NULL,
  max_dose_mg_kg NUMERIC NOT NULL,
  concentration_mg_ml NUMERIC NOT NULL,
  route TEXT,  -- oral, IV, IM, SC
  frequency TEXT,  -- BID, TID, SID
  notes TEXT,
  max_absolute_mg NUMERIC,
  is_active BOOLEAN DEFAULT true
);
```

### Diagnosis Codes

```sql
CREATE TABLE diagnosis_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  term TEXT NOT NULL,
  description TEXT,
  category TEXT,
  species TEXT[],  -- Applicable species
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_diagnosis_term ON diagnosis_codes USING gin(to_tsvector('spanish', term));
```

### Growth Standards

```sql
CREATE TABLE growth_standards (
  id UUID PRIMARY KEY,
  species TEXT NOT NULL,
  breed_category TEXT NOT NULL,  -- toy, small, medium, large, giant
  age_weeks INTEGER NOT NULL,
  p5_weight NUMERIC,
  p25_weight NUMERIC,
  p50_weight NUMERIC,
  p75_weight NUMERIC,
  p95_weight NUMERIC
);
```

---

## Best Practices

### DO

- Use clinical tools as **decision support**, not replacements
- Include warnings for edge cases (extreme weights, small volumes)
- Validate drug dosages against current guidelines
- Store assessment results in medical records
- Display clear disclaimers for end-of-life tools

### DON'T

- Rely solely on calculated doses without clinical judgment
- Skip weight validation
- Use outdated drug dosing references
- Make end-of-life decisions based only on QoL scores

---

## Related Documentation

- [API Overview](../api/overview.md#clinical-tools)
- [Database Schema](../database/schema-reference.md)
- [PDF Generation](prescription-pdf.md)
