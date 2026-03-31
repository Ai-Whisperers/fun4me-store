---
name: veterinary-clinical
description: Comprehensive veterinary medicine knowledge for clinical tools including drug dosages, diagnosis codes, vaccine schedules, lab reference ranges, and species-specific guidance. Use when building or improving clinical features like dosage calculators, diagnosis search, vaccine tracking, or lab result interpretation.
---

# Veterinary Clinical Reference Guide

## Overview

This skill provides veterinary medicine knowledge for building clinical tools in the Vete platform. It covers drug dosages, diagnosis codes (VeNom), vaccine schedules, lab reference ranges, and species-specific vital signs.

**Target species**: Dogs (Canis familiaris), Cats (Felis catus), with notes for exotic species.

---

## 1. Drug Dosage Calculator

### Common Drug Dosages - Dogs

| Drug | Indication | Dose (mg/kg) | Route | Frequency | Max Duration | Notes |
|------|-----------|--------------|-------|-----------|--------------|-------|
| Amoxicillin | Bacterial infections | 10-20 | PO | q12h | 7-14 days | With or without food |
| Amoxicillin-Clavulanate | Skin, UTI, respiratory | 12.5-25 | PO | q12h | 7-14 days | Preferred for resistant bacteria |
| Metronidazole | Anaerobic infections, Giardia | 10-15 | PO | q12h | 5-7 days | Give with food, avoid prolonged use |
| Enrofloxacin | UTI, skin, respiratory | 5-20 | PO/SC | q24h | 7-30 days | Not in growing dogs <12mo |
| Cephalexin | Skin infections | 15-30 | PO | q8-12h | 14-28 days | First-gen cephalosporin |
| Doxycycline | Tick-borne, respiratory | 5-10 | PO | q12-24h | 14-28 days | Give with food, avoid dairy |
| Prednisolone | Anti-inflammatory | 0.5-1 | PO | q12-24h | Varies | Taper off, don't stop abruptly |
| Prednisone | Immunosuppression | 2-4 | PO | q12-24h | Varies | Higher dose for autoimmune |
| Meloxicam | Pain, arthritis | 0.1-0.2 | PO | q24h | Long-term | Loading dose 0.2, maintenance 0.1 |
| Carprofen | Pain, arthritis | 2-4 | PO | q12-24h | Long-term | Monitor liver enzymes |
| Gabapentin | Neuropathic pain | 5-10 | PO | q8-12h | Varies | Can cause sedation |
| Tramadol | Moderate pain | 2-5 | PO | q8-12h | Short-term | Controlled substance some regions |
| Omeprazole | Gastric ulcers | 0.5-1 | PO | q24h | 2-8 weeks | Give before meals |
| Famotidine | Gastric acid | 0.5-1 | PO/IV | q12-24h | As needed | H2 blocker |
| Maropitant | Antiemetic | 1 | PO/SC | q24h | 5 days | For motion sickness: 8 mg/kg |
| Ondansetron | Antiemetic | 0.5-1 | PO/IV | q8-12h | As needed | For chemotherapy-induced |
| Diphenhydramine | Allergies, sedation | 2-4 | PO/IM | q8h | As needed | May cause drowsiness |
| Cetirizine | Allergies | 1-2 | PO | q24h | Long-term | Less sedating |
| Furosemide | Diuretic, CHF | 1-4 | PO/IV/IM | q8-12h | Varies | Monitor electrolytes |
| Enalapril | Heart failure | 0.5 | PO | q12-24h | Long-term | ACE inhibitor |
| Pimobendan | Dilated cardiomyopathy | 0.25-0.3 | PO | q12h | Long-term | Give 1hr before food |
| Phenobarbital | Seizures | 2-5 | PO | q12h | Long-term | Monitor serum levels |
| Potassium Bromide | Seizures (adjunct) | 20-40 | PO | q24h | Long-term | Takes 3mo for steady state |
| Metoclopramide | Prokinetic | 0.2-0.5 | PO/SC/IV | q6-8h | Short-term | Avoid with GI obstruction |
| Sucralfate | GI ulcers | 0.5-1g/dog | PO | q8h | 2-8 weeks | Give 1hr before other meds |

### Common Drug Dosages - Cats

| Drug | Indication | Dose (mg/kg) | Route | Frequency | Max Duration | Notes |
|------|-----------|--------------|-------|-----------|--------------|-------|
| Amoxicillin | Bacterial infections | 10-20 | PO | q12h | 7-14 days | Palatability issues |
| Amoxicillin-Clavulanate | Skin, UTI, respiratory | 12.5-25 | PO | q12h | 7-14 days | Liquid form easier |
| Metronidazole | Anaerobic, IBD | 10-15 | PO | q12h | 5-7 days | Bitter taste, use capsules |
| Enrofloxacin | UTI, skin | 5 | PO | q24h | 7-14 days | **MAX 5 mg/kg** - retinal toxicity |
| Marbofloxacin | UTI, skin | 2 | PO | q24h | 7-14 days | Safer fluoroquinolone for cats |
| Doxycycline | Upper respiratory, Bartonella | 5-10 | PO | q12-24h | 14-28 days | Give with food, esophageal stricture risk |
| Clindamycin | Dental, toxoplasmosis | 5.5-11 | PO | q12h | 14-28 days | Anaerobic coverage |
| Prednisolone | Anti-inflammatory | 0.5-2 | PO | q12-24h | Varies | Cats need prednisolONE, not prednisone |
| Meloxicam | Pain (acute) | 0.1-0.2 | PO/SC | Once | 1-3 days max | **Renal risk with repeated dosing** |
| Buprenorphine | Pain | 0.01-0.03 | SL/IM | q6-12h | Short-term | Sublingual route in cats |
| Gabapentin | Pain, anxiety | 5-10 | PO | q8-12h | Varies | Pre-vet visit: 50-100mg 2hr before |
| Mirtazapine | Appetite stimulant | 1.88 | PO | q48h | As needed | Or 2mg transdermal q24h |
| Omeprazole | Gastric | 1 | PO | q24h | 2-4 weeks | Compounded liquid |
| Famotidine | Gastric | 0.5-1 | PO | q12-24h | As needed | - |
| Maropitant | Antiemetic | 1 | SC | q24h | 5 days | Injectable preferred |
| Furosemide | CHF, pleural effusion | 1-2 | PO/IV/IM | q8-12h | Varies | Start low |
| Amlodipine | Hypertension | 0.625-1.25mg/cat | PO | q24h | Long-term | Start 0.625mg for small cats |
| Atenolol | Hypertrophic cardiomyopathy | 6.25-12.5mg/cat | PO | q12-24h | Long-term | - |
| Methimazole | Hyperthyroidism | 1.25-2.5mg/cat | PO | q12h | Long-term | Monitor T4 at 3 weeks |
| Phenobarbital | Seizures | 2-3 | PO | q12h | Long-term | Lower doses than dogs |

### Dosage Calculation Formula

```
Dose (mg) = Weight (kg) × Dose rate (mg/kg)
Volume (mL) = Dose (mg) ÷ Concentration (mg/mL)
```

**Example**: Dog 15kg, Amoxicillin 20 mg/kg, suspension 50 mg/mL
- Dose = 15 × 20 = 300 mg
- Volume = 300 ÷ 50 = 6 mL per dose

### Drug Interactions - Critical

| Drug A | Drug B | Interaction | Severity |
|--------|--------|-------------|----------|
| NSAIDs | Corticosteroids | GI ulceration risk | **HIGH** |
| NSAIDs | Furosemide | Reduced diuretic effect | Medium |
| Metronidazole | Phenobarbital | Reduced metronidazole effect | Medium |
| Enrofloxacin | Antacids | Reduced absorption | Medium |
| Doxycycline | Calcium/Dairy | Reduced absorption | Medium |
| ACE Inhibitors | NSAIDs | Reduced ACE effect, renal risk | Medium |
| Cisapride | Ketoconazole | Cardiac arrhythmias | **HIGH** |
| Tramadol | SSRIs | Serotonin syndrome | **HIGH** |

---

## 2. Diagnosis Codes (VeNom)

### Common Diagnoses by System

#### Dermatology
| Code | Name (Spanish) | Name (English) |
|------|----------------|----------------|
| DERM-001 | Dermatitis alérgica | Allergic dermatitis |
| DERM-002 | Dermatitis atópica | Atopic dermatitis |
| DERM-003 | Dermatitis por pulgas | Flea allergy dermatitis |
| DERM-004 | Pioderma superficial | Superficial pyoderma |
| DERM-005 | Pioderma profundo | Deep pyoderma |
| DERM-006 | Sarna demodécica | Demodectic mange |
| DERM-007 | Sarna sarcóptica | Sarcoptic mange |
| DERM-008 | Dermatofitosis (tiña) | Dermatophytosis (ringworm) |
| DERM-009 | Otitis externa | Otitis externa |
| DERM-010 | Otitis media | Otitis media |
| DERM-011 | Hot spot (dermatitis húmeda) | Acute moist dermatitis |
| DERM-012 | Alopecia | Alopecia |

#### Gastroenterology
| Code | Name (Spanish) | Name (English) |
|------|----------------|----------------|
| GI-001 | Gastroenteritis aguda | Acute gastroenteritis |
| GI-002 | Gastritis | Gastritis |
| GI-003 | Enteritis | Enteritis |
| GI-004 | Colitis | Colitis |
| GI-005 | Pancreatitis aguda | Acute pancreatitis |
| GI-006 | Pancreatitis crónica | Chronic pancreatitis |
| GI-007 | Enfermedad inflamatoria intestinal | Inflammatory bowel disease |
| GI-008 | Obstrucción intestinal | Intestinal obstruction |
| GI-009 | Cuerpo extraño GI | GI foreign body |
| GI-010 | Dilatación-torsión gástrica | Gastric dilatation-volvulus |
| GI-011 | Megaesófago | Megaesophagus |
| GI-012 | Parasitosis intestinal | Intestinal parasitism |

#### Cardiology
| Code | Name (Spanish) | Name (English) |
|------|----------------|----------------|
| CARD-001 | Insuficiencia cardíaca congestiva | Congestive heart failure |
| CARD-002 | Enfermedad valvular degenerativa | Degenerative valve disease |
| CARD-003 | Cardiomiopatía dilatada | Dilated cardiomyopathy |
| CARD-004 | Cardiomiopatía hipertrófica | Hypertrophic cardiomyopathy |
| CARD-005 | Efusión pericárdica | Pericardial effusion |
| CARD-006 | Arritmia | Arrhythmia |
| CARD-007 | Soplo cardíaco | Heart murmur |
| CARD-008 | Dirofilariasis | Heartworm disease |

#### Nephrology/Urology
| Code | Name (Spanish) | Name (English) |
|------|----------------|----------------|
| RENAL-001 | Enfermedad renal crónica | Chronic kidney disease |
| RENAL-002 | Insuficiencia renal aguda | Acute kidney injury |
| RENAL-003 | Infección urinaria | Urinary tract infection |
| RENAL-004 | Urolitiasis | Urolithiasis |
| RENAL-005 | Cistitis | Cystitis |
| RENAL-006 | Obstrucción uretral | Urethral obstruction |
| RENAL-007 | Incontinencia urinaria | Urinary incontinence |

#### Orthopedics
| Code | Name (Spanish) | Name (English) |
|------|----------------|----------------|
| ORTHO-001 | Displasia de cadera | Hip dysplasia |
| ORTHO-002 | Luxación de rótula | Patellar luxation |
| ORTHO-003 | Rotura de ligamento cruzado | Cruciate ligament rupture |
| ORTHO-004 | Osteoartritis | Osteoarthritis |
| ORTHO-005 | Fractura | Fracture |
| ORTHO-006 | Luxación | Luxation/Dislocation |
| ORTHO-007 | Enfermedad discal intervertebral | Intervertebral disc disease |

#### Infectious Diseases
| Code | Name (Spanish) | Name (English) |
|------|----------------|----------------|
| INF-001 | Parvovirus canino | Canine parvovirus |
| INF-002 | Moquillo canino | Canine distemper |
| INF-003 | Leptospirosis | Leptospirosis |
| INF-004 | Ehrlichiosis | Ehrlichiosis |
| INF-005 | Babesiosis | Babesiosis |
| INF-006 | Leishmaniasis | Leishmaniasis |
| INF-007 | Panleucopenia felina | Feline panleukopenia |
| INF-008 | Leucemia felina (FeLV) | Feline leukemia virus |
| INF-009 | Inmunodeficiencia felina (FIV) | Feline immunodeficiency virus |
| INF-010 | Rinotraqueitis felina | Feline viral rhinotracheitis |
| INF-011 | Calicivirus felino | Feline calicivirus |
| INF-012 | Rabia | Rabies |

---

## 3. Vaccine Schedules

### Dogs - Paraguay Protocol

| Age | Core Vaccines | Non-Core (Based on Risk) |
|-----|---------------|-------------------------|
| 6-8 weeks | DHPPi (1st dose) | - |
| 10-12 weeks | DHPPi (2nd dose) | Leptospirosis (1st), Bordetella |
| 14-16 weeks | DHPPi (3rd dose), Rabies | Leptospirosis (2nd), Giardia |
| 1 year | DHPPi, Rabies | Leptospirosis, Bordetella |
| Adult (annual) | Rabies (required by law) | Leptospirosis |
| Adult (every 3 years) | DHPPi | - |

**DHPPi**: Distemper, Hepatitis, Parvovirus, Parainfluenza

### Cats - Paraguay Protocol

| Age | Core Vaccines | Non-Core (Based on Risk) |
|-----|---------------|-------------------------|
| 8-9 weeks | FVRCP (1st dose) | FeLV (1st) if outdoor |
| 12 weeks | FVRCP (2nd dose) | FeLV (2nd) |
| 16 weeks | FVRCP (3rd dose), Rabies | - |
| 1 year | FVRCP, Rabies | FeLV |
| Adult (every 1-3 years) | FVRCP, Rabies | FeLV for at-risk cats |

**FVRCP**: Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia

### Vaccine Reaction Severity Scale

| Grade | Signs | Action |
|-------|-------|--------|
| 1 - Mild | Lethargy, mild fever, local swelling | Monitor, symptomatic care |
| 2 - Moderate | Vomiting, diarrhea, urticaria, facial swelling | Antihistamines, observation |
| 3 - Severe | Anaphylaxis, collapse, severe dyspnea | Emergency treatment, epinephrine |

---

## 4. Laboratory Reference Ranges

### Complete Blood Count (CBC) - Dogs

| Parameter | Units | Reference Range | Critical Low | Critical High |
|-----------|-------|-----------------|--------------|---------------|
| RBC | x10¹²/L | 5.5-8.5 | <4.0 | >10.0 |
| Hemoglobin | g/dL | 12-18 | <8 | >22 |
| Hematocrit | % | 37-55 | <25 | >60 |
| MCV | fL | 60-74 | - | - |
| MCH | pg | 19.5-24.5 | - | - |
| MCHC | g/dL | 32-36 | - | - |
| Platelets | x10⁹/L | 175-500 | <50 | >800 |
| WBC | x10⁹/L | 6.0-17.0 | <3.0 | >30.0 |
| Neutrophils | x10⁹/L | 3.0-11.5 | <1.5 | >25.0 |
| Lymphocytes | x10⁹/L | 1.0-4.8 | <0.5 | - |
| Monocytes | x10⁹/L | 0.1-1.4 | - | - |
| Eosinophils | x10⁹/L | 0.1-1.2 | - | >2.0 |
| Basophils | x10⁹/L | 0-0.1 | - | - |

### Complete Blood Count (CBC) - Cats

| Parameter | Units | Reference Range | Critical Low | Critical High |
|-----------|-------|-----------------|--------------|---------------|
| RBC | x10¹²/L | 5.0-10.0 | <4.0 | >12.0 |
| Hemoglobin | g/dL | 8-15 | <6 | >18 |
| Hematocrit | % | 24-45 | <18 | >55 |
| MCV | fL | 39-55 | - | - |
| MCH | pg | 13-17 | - | - |
| MCHC | g/dL | 30-36 | - | - |
| Platelets | x10⁹/L | 175-500 | <50 | >800 |
| WBC | x10⁹/L | 5.5-19.5 | <2.5 | >30.0 |
| Neutrophils | x10⁹/L | 2.5-12.5 | <1.5 | >25.0 |
| Lymphocytes | x10⁹/L | 1.5-7.0 | <0.5 | - |
| Monocytes | x10⁹/L | 0-0.9 | - | - |
| Eosinophils | x10⁹/L | 0-1.5 | - | >2.0 |

### Chemistry Panel - Dogs

| Parameter | Units | Reference Range | Critical Low | Critical High |
|-----------|-------|-----------------|--------------|---------------|
| BUN | mg/dL | 7-27 | - | >80 |
| Creatinine | mg/dL | 0.5-1.8 | - | >5.0 |
| SDMA | μg/dL | 0-14 | - | >18 |
| Glucose | mg/dL | 74-143 | <50 | >300 |
| ALT | U/L | 10-125 | - | >500 |
| AST | U/L | 0-50 | - | >200 |
| ALP | U/L | 23-212 | - | >1000 |
| GGT | U/L | 0-11 | - | >50 |
| Total Bilirubin | mg/dL | 0.0-0.9 | - | >3.0 |
| Total Protein | g/dL | 5.2-8.2 | <4.5 | >9.0 |
| Albumin | g/dL | 2.3-4.0 | <1.8 | - |
| Globulin | g/dL | 2.5-4.5 | - | >5.5 |
| Cholesterol | mg/dL | 110-320 | - | >500 |
| Triglycerides | mg/dL | 50-150 | - | >500 |
| Amylase | U/L | 500-1500 | - | >2500 |
| Lipase | U/L | 100-750 | - | >1500 |
| Calcium | mg/dL | 7.9-12.0 | <6.5 | >14.0 |
| Phosphorus | mg/dL | 2.5-6.8 | <2.0 | >10.0 |
| Sodium | mEq/L | 144-160 | <135 | >165 |
| Potassium | mEq/L | 3.5-5.8 | <2.8 | >7.0 |
| Chloride | mEq/L | 109-122 | <100 | >130 |

### Chemistry Panel - Cats

| Parameter | Units | Reference Range | Critical Low | Critical High |
|-----------|-------|-----------------|--------------|---------------|
| BUN | mg/dL | 16-36 | - | >80 |
| Creatinine | mg/dL | 0.8-2.4 | - | >5.0 |
| SDMA | μg/dL | 0-14 | - | >18 |
| Glucose | mg/dL | 74-159 | <50 | >350 |
| ALT | U/L | 12-130 | - | >500 |
| AST | U/L | 0-48 | - | >200 |
| ALP | U/L | 14-111 | - | >200 |
| GGT | U/L | 0-4 | - | >15 |
| Total Bilirubin | mg/dL | 0.0-0.9 | - | >3.0 |
| Total Protein | g/dL | 5.7-8.9 | <4.5 | >10.0 |
| Albumin | g/dL | 2.1-3.3 | <1.8 | - |
| T4 | μg/dL | 1.0-4.0 | <0.5 | >6.0 |

### Urinalysis Reference - Dogs & Cats

| Parameter | Dogs | Cats |
|-----------|------|------|
| Specific Gravity | 1.015-1.045 | 1.035-1.060 |
| pH | 6.0-7.5 | 6.0-7.0 |
| Protein | Negative-Trace | Negative-Trace |
| Glucose | Negative | Negative |
| Ketones | Negative | Negative |
| Bilirubin | Negative-1+ (dogs) | Negative |
| Blood | Negative | Negative |
| WBC | 0-5/hpf | 0-5/hpf |
| RBC | 0-5/hpf | 0-5/hpf |
| Bacteria | Negative | Negative |
| Crystals | Varies | Varies |
| Casts | 0-2/lpf hyaline | 0-2/lpf hyaline |

---

## 5. Vital Signs Reference

### Dogs by Size

| Parameter | Small (<10kg) | Medium (10-25kg) | Large (>25kg) |
|-----------|---------------|------------------|---------------|
| Heart Rate (bpm) | 100-160 | 80-120 | 60-100 |
| Respiratory Rate (/min) | 15-40 | 15-30 | 10-30 |
| Temperature (°C) | 38.0-39.2 | 38.0-39.2 | 38.0-39.2 |
| Capillary Refill Time | <2 sec | <2 sec | <2 sec |
| Blood Pressure (mmHg) | 110-160/60-90 | 110-160/60-90 | 110-160/60-90 |

### Cats

| Parameter | Adult | Kitten |
|-----------|-------|--------|
| Heart Rate (bpm) | 140-220 | 180-260 |
| Respiratory Rate (/min) | 20-42 | 20-40 |
| Temperature (°C) | 37.8-39.2 | 37.8-39.2 |
| Capillary Refill Time | <2 sec | <2 sec |
| Blood Pressure (mmHg) | 120-170/80-100 | - |

### Pain Scoring Scale (0-10)

| Score | Description (Spanish) | Signs |
|-------|----------------------|-------|
| 0 | Sin dolor | Normal behavior, eating, sleeping |
| 1-3 | Dolor leve | Slight behavior change, mild guarding |
| 4-6 | Dolor moderado | Reluctant to move, vocalizing, appetite decreased |
| 7-9 | Dolor severo | Crying, aggressive when touched, not eating |
| 10 | Dolor máximo | Unresponsive, shock-like state |

---

## 6. Quality of Life Assessment (HHHHHMM Scale)

### Scoring Guide (0-10 each, total 70)

| Factor | Spanish | Description | Score Guide |
|--------|---------|-------------|-------------|
| **H**urt | Dolor | Pain level and management | 0=severe uncontrolled, 10=no pain |
| **H**unger | Hambre | Eating adequately | 0=refusing food, 10=eating normally |
| **H**ydration | Hidratación | Fluid intake | 0=severe dehydration, 10=well hydrated |
| **H**ygiene | Higiene | Cleanliness, skin condition | 0=severe soiling, 10=clean/well-groomed |
| **H**appiness | Felicidad | Mental state, interaction | 0=unresponsive, 10=bright/engaged |
| **M**obility | Movilidad | Ability to move | 0=cannot stand, 10=walks/runs normally |
| **M**ore good days than bad | Más días buenos | Overall quality | 0=no good days, 10=mostly good days |

### Interpretation

| Total Score | Interpretation | Recommendation |
|-------------|----------------|----------------|
| 0-17 | Very poor quality of life | Discuss euthanasia |
| 18-34 | Poor quality of life | Intensive palliation or euthanasia |
| 35-52 | Acceptable quality of life | Continue treatment, reassess weekly |
| 53-70 | Good quality of life | Continue current care |

---

## 7. Emergency Reference

### Critical Values Requiring Immediate Action

| Finding | Action |
|---------|--------|
| SpO2 < 90% | Oxygen supplementation |
| Temperature > 40.5°C | Active cooling |
| Temperature < 36°C | Active warming |
| Heart rate < 60 (dog) / < 100 (cat) | Atropine, consider pacing |
| Glucose < 50 mg/dL | Dextrose 50% diluted |
| Potassium > 7 mEq/L | Calcium gluconate, insulin/dextrose |
| Blood pressure < 80 mmHg systolic | Fluid resuscitation, pressors |
| PCV < 15% | Blood transfusion |
| Platelet count < 30,000 | Transfusion, investigate cause |

### Emergency Drug Doses

| Drug | Dose | Route | Indication |
|------|------|-------|------------|
| Epinephrine | 0.01-0.02 mg/kg | IV/IO | Anaphylaxis, cardiac arrest |
| Atropine | 0.02-0.04 mg/kg | IV | Bradycardia |
| Dexamethasone | 0.5-1 mg/kg | IV | Anaphylaxis, shock |
| Diphenhydramine | 2 mg/kg | IM/IV slow | Anaphylaxis |
| Diazepam | 0.5-1 mg/kg | IV | Seizures |
| Calcium gluconate 10% | 0.5-1 mL/kg | IV slow | Hypocalcemia, hyperkalemia |
| Furosemide | 2-4 mg/kg | IV | Pulmonary edema |

### CPR Reference (Dogs & Cats)

| Parameter | Small (<10kg) | Medium/Large Dogs | Cats |
|-----------|---------------|-------------------|------|
| Compression rate | 100-120/min | 100-120/min | 100-120/min |
| Compression depth | 1/3-1/2 chest width | 1/3-1/2 chest width | 1/3-1/2 chest width |
| Hand position | Lateral chest | Lateral or dorsoventral | Lateral chest |
| Ventilation ratio | 30:2 | 30:2 | 30:2 |

---

## 8. Common Conversion Formulas

```
Temperature: °F = (°C × 9/5) + 32
Weight: 1 kg = 2.205 lbs
Volume: 1 mL = 1 cc = 20 drops
Fluid rate: mL/hr = (mL/day) ÷ 24

Body Surface Area (dogs): BSA (m²) = (kg^0.75) × 0.1
Body Surface Area (cats): BSA (m²) = (kg^0.75) × 0.1

Maintenance fluids: 60 mL/kg/day (dogs), 45-60 mL/kg/day (cats)
Dehydration correction: mL = weight(kg) × % dehydration × 10
```

---

## Usage in Vete Platform

### For Dosage Calculator
```typescript
// Use drug tables to power the calculator
const dosage = calculateDose(
  weight: number,     // kg
  drug: string,       // from drug table
  species: 'dog' | 'cat'
)
// Returns: { doseMin, doseMax, unit, route, frequency, warnings }
```

### For Lab Result Interpretation
```typescript
// Compare against reference ranges
const interpretation = interpretLabValue(
  parameter: string,  // e.g., "BUN"
  value: number,
  species: 'dog' | 'cat'
)
// Returns: { status: 'normal' | 'low' | 'high' | 'critical', range, advice }
```

### For Vaccine Scheduling
```typescript
// Generate vaccine schedule
const schedule = generateVaccineSchedule(
  species: 'dog' | 'cat',
  birthDate: Date,
  riskFactors: string[]
)
// Returns: array of { vaccine, dueDate, notes }
```

---

*This reference is based on standard veterinary medicine practices. Always consult current literature and local regulations for specific cases.*
