# Clinical Tools

Professional veterinary tools for clinical decision support and documentation.

## Available Tools

| Tool | Route | Purpose |
|------|-------|---------|
| [Prescriptions](#prescriptions) | `/[clinic]/prescriptions` | Digital prescription management |
| [Diagnosis Codes](#diagnosis-codes) | `/[clinic]/diagnosis_codes` | VeNom/SNOMED code search |
| [Drug Dosages](#drug-dosages) | `/[clinic]/drug_dosages` | Dosing calculator |
| [Growth Charts](#growth-charts) | `/[clinic]/growth_charts` | Weight tracking |
| [Vaccine Reactions](#vaccine-reactions) | `/[clinic]/vaccine_reactions` | Adverse reaction monitoring |
| [Reproductive Cycles](#reproductive-cycles) | `/[clinic]/reproductive_cycles` | Breeding management |
| [QoL Assessments](#quality-of-life-assessments) | `/[clinic]/euthanasia_assessments` | HHHHHMM scale |

---

## Prescriptions

Digital prescription system with PDF generation.

### Features

- Create prescriptions linked to medical records
- Multiple medications per prescription
- Dosing instructions and warnings
- Digital signature support
- PDF export with clinic branding
- Prescription status tracking

### Database Tables

- `prescriptions` - Prescription header
- `medical_records` - Linked consultation

### Components

- `components/clinical/prescription-pdf.tsx` - PDF template
- `components/clinical/prescription-download-button.tsx` - Download UI
- `components/clinical/digital-signature.tsx` - Signature capture

### Routes

- `GET /api/prescriptions` - List prescriptions
- `POST /api/prescriptions` - Create prescription
- `/[clinic]/portal/prescriptions/new` - Creation form

### Example Prescription Structure

```json
{
  "id": "uuid",
  "pet_id": "uuid",
  "medical_record_id": "uuid",
  "vet_id": "uuid",
  "medications": [
    {
      "name": "Amoxicillin",
      "dose": "250mg",
      "frequency": "Every 12 hours",
      "duration": "7 days",
      "route": "Oral",
      "instructions": "Give with food"
    }
  ],
  "instructions": "Complete full course. Return if symptoms worsen.",
  "valid_until": "2024-02-15",
  "signature_url": "https://storage.../signature.png"
}
```

---

## Diagnosis Codes

Searchable database of veterinary diagnosis codes.

### Features

- VeNom (Veterinary Nomenclature) codes
- SNOMED-CT compatible
- Species-specific filtering
- Category grouping
- Full-text search

### Database Tables

- `diagnosis_codes` - Code registry

### Components

- `components/clinical/diagnosis-search.tsx` - Search interface

### Routes

- `GET /api/diagnosis_codes?q=search` - Search codes
- `/[clinic]/diagnosis_codes` - Public search page

### Example Query

```typescript
// Search for skin conditions in dogs
const { data } = await supabase
  .from('diagnosis_codes')
  .select('*')
  .ilike('name', '%dermatitis%')
  .contains('species', ['dog'])
  .limit(20);
```

---

## Drug Dosages

Species-specific drug dosing calculator.

### Features

- Dosing by weight (mg/kg)
- Multiple species support
- Route of administration
- Frequency recommendations
- Maximum dose warnings
- Indication-based lookup

### Database Tables

- `drug_dosages` - Dosing reference data

### Components

- `components/clinical/drug-search.tsx` - Drug search
- `components/clinical/dosage-calculator.tsx` - Calculator

### Routes

- `GET /api/drug_dosages?drug=name&species=dog` - Get dosing
- `/[clinic]/drug_dosages` - Public calculator

### Example Calculation

```typescript
interface DoseCalculation {
  drug: string;
  species: string;
  weight_kg: number;
  dose_mg_per_kg: number;
  calculated_dose_mg: number;
  max_dose_mg?: number;
  frequency: string;
  route: string;
  warnings?: string[];
}
```

---

## Growth Charts

Pet weight tracking against breed standards.

### Features

- Weight percentile visualization
- Species and breed-specific curves
- Historical weight tracking
- Percentile calculations (P5, P25, P50, P75, P95)
- Trend analysis

### Database Tables

- `growth_standards` - Reference percentiles
- `pets.weight_kg` - Current weight
- `medical_records` - Historical weights

### Components

- `components/clinical/growth-chart.tsx` - Chart visualization

### Routes

- `GET /api/growth_charts?pet_id=uuid` - Get pet growth data
- `GET /api/growth_standards?species=dog&breed=medium` - Get standards
- `/[clinic]/growth_charts` - Interactive tool

### Chart Library

Uses `recharts` for visualization:

```tsx
<LineChart data={growthData}>
  <Line dataKey="p50" stroke="#666" name="50th Percentile" />
  <Line dataKey="weight" stroke="#2F5233" name="Pet Weight" />
</LineChart>
```

---

## Vaccine Reactions

Adverse event monitoring and reporting.

### Features

- Reaction severity classification
- Onset time tracking
- Resolution monitoring
- Vaccine correlation
- Reporting to owner

### Database Tables

- `vaccine_reactions` - Reaction records
- `vaccines` - Related vaccination

### Routes

- `GET /api/vaccine_reactions?pet_id=uuid` - Get reactions
- `POST /api/vaccine_reactions` - Report reaction
- `/[clinic]/vaccine_reactions` - Management page

### Severity Levels

| Level | Description |
|-------|-------------|
| `mild` | Localized swelling, lethargy |
| `moderate` | Vomiting, facial swelling, hives |
| `severe` | Anaphylaxis, collapse, death |

---

## Reproductive Cycles

Breeding and reproductive management.

### Features

- Heat cycle tracking
- Pregnancy monitoring
- Whelping/queening dates
- Breeding pair records
- Litter management

### Database Tables

- `reproductive_cycles` - Cycle records

### Routes

- `GET /api/reproductive_cycles?pet_id=uuid` - Get cycles
- `POST /api/reproductive_cycles` - Add cycle
- `/[clinic]/reproductive_cycles` - Management page

### Cycle Types

- `proestrus` - Pre-heat
- `estrus` - Heat (fertile period)
- `diestrus` - Post-heat
- `anestrus` - Resting period
- `pregnancy` - Confirmed pregnancy
- `whelping` - Birth event

---

## Quality of Life Assessments

HHHHHMM scale for end-of-life decisions.

### Features

- Standardized QoL scoring
- HHHHHMM criteria (Hurt, Hunger, Hydration, Hygiene, Happiness, Mobility, More good days)
- Score trends over time
- Printable reports
- Family discussion tool

### Database Tables

- `euthanasia_assessments` - Assessment records

### Components

- `components/clinical/qol-assessment.tsx` - Assessment form

### Routes

- `GET /api/euthanasia_assessments?pet_id=uuid` - Get assessments
- `POST /api/euthanasia_assessments` - Create assessment
- `/[clinic]/euthanasia_assessments` - Assessment tool

### HHHHHMM Scale

Each criterion scored 0-10:

| Criterion | Question |
|-----------|----------|
| **H**urt | Is pain adequately controlled? |
| **H**unger | Is the pet eating enough? |
| **H**ydration | Is the pet hydrated? |
| **H**ygiene | Can the pet keep clean? |
| **H**appiness | Does the pet express joy? |
| **M**obility | Can the pet move comfortably? |
| **M**ore Good Days | Are good days > bad days? |

**Score Interpretation:**
- 70-100: Good quality of life
- 35-69: Acceptable with intervention
- 0-34: Poor quality, consider euthanasia

---

## Integration with Medical Records

All clinical tools integrate with medical records:

```
Medical Record
├── Diagnosis Code (linked)
├── Prescription (created from)
├── Growth Measurement (recorded during)
└── Vaccine Reaction (associated with vaccine given)
```

### Example Flow

1. Patient presents with symptoms
2. Vet searches diagnosis codes
3. Selects appropriate code
4. Calculates drug dosage
5. Creates prescription
6. Links all to medical record

---

## Related Documentation

- [Pet Management](../pet-management/)
- [Medical Records](../pet-management/medical-records.md)
- [API Reference](../../api/overview.md)
- [Database Schema](../../database/schema-reference.md)
