# Vete Veterinary Skills Plugin

Custom skills for the Vete multi-tenant veterinary platform.

## Skills Included

### veterinary-clinical

Comprehensive veterinary medicine reference for building clinical tools.

**Covers:**
- **Drug Dosages**: 50+ drugs for dogs and cats with dosing, routes, frequencies, and interactions
- **Diagnosis Codes**: VeNom-style codes organized by body system (dermatology, GI, cardiology, etc.)
- **Vaccine Schedules**: Paraguay-specific protocols for dogs and cats
- **Lab Reference Ranges**: CBC, chemistry, urinalysis with species-specific values and critical thresholds
- **Vital Signs**: Heart rate, respiratory rate, temperature by species and size
- **Quality of Life**: HHHHHMM scale with scoring guide
- **Emergency Reference**: Critical values, emergency drug doses, CPR protocols

## Usage

When working on clinical features in Vete, Claude will automatically reference this skill for:

1. **Dosage Calculator** (`/[clinic]/tools/dosage-calculator`)
   - Use drug tables for accurate dosing
   - Include drug interaction warnings

2. **Lab Results Interpretation**
   - Compare values against reference ranges
   - Flag critical values automatically

3. **Vaccine Tracking**
   - Generate age-appropriate schedules
   - Consider Paraguay-specific requirements

4. **Medical Records**
   - Suggest appropriate diagnosis codes
   - Use proper Spanish medical terminology

## Updating

To update drug dosages or reference values, edit:
- `skills/veterinary-clinical/SKILL.md`

## License

Proprietary - Vete Platform
