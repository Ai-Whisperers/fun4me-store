# Prescription Workflow

Complete flow from prescription creation to PDF generation and signing.

```mermaid
flowchart TD
    START([Vet Opens Prescription Form]) --> SELECT[Select Pet]
    SELECT --> ADD_DRUGS[Add Medications]
    
    ADD_DRUGS --> CALC[Calculate Dosages<br/>Using Drug Dosage Calculator]
    CALC --> REVIEW[Review Prescription]
    
    REVIEW --> SIGN{Sign Prescription?}
    SIGN -->|No| REVIEW
    SIGN -->|Yes| CAPTURE[Capture Digital Signature]
    
    CAPTURE --> VALIDATE[Validate Signature]
    VALIDATE -->|Invalid| CAPTURE
    VALIDATE -->|Valid| SAVE[Save Prescription]
    
    SAVE -->|POST /api/prescriptions| AUTH[Authenticate & Check Role]
    AUTH -->|Not Vet/Admin| ERROR1[Error: Unauthorized]
    AUTH -->|Authorized| VERIFY[Verify Pet Belongs to Clinic]
    
    VERIFY -->|Invalid| ERROR2[Error: Pet Not Found]
    VERIFY -->|Valid| CREATE[Create Prescription Record]
    
    CREATE --> GENERATE[Generate QR Code]
    GENERATE --> HASH[Create Signature Hash]
    HASH --> STORE[Store in Database]
    
    STORE --> PDF[Generate PDF]
    PDF --> SUCCESS[Show Success + PDF Download]
    
    ERROR1 --> START
    ERROR2 --> SELECT
    
    SUCCESS --> END([Prescription Complete])
    
    style START fill:#e1f5ff
    style SUCCESS fill:#4ade80
    style ERROR1 fill:#f87171
    style ERROR2 fill:#f87171
    style SIGN fill:#fbbf24
```

## Key Steps

1. **Pet Selection**: Choose patient from clinic pets
2. **Add Medications**: Enter drugs with dosage, frequency, route
3. **Dosage Calculation**: System calculates based on weight/species
4. **Digital Signature**: Vet signs prescription digitally
5. **Validation**: Verify signature and pet ownership
6. **Storage**: Save with QR code and signature hash
7. **PDF Generation**: Create printable prescription document

