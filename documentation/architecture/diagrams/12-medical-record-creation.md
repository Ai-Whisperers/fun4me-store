# Medical Record Creation Flow

Flow for creating medical records during consultations.

```mermaid
sequenceDiagram
    participant Vet
    participant RecordForm
    participant API
    participant DB as Database
    participant Pet as Pet Profile

    Vet->>RecordForm: Open New Record Form
    RecordForm->>RecordForm: Select Pet
    RecordForm->>RecordForm: Enter Diagnosis Codes
    RecordForm->>RecordForm: Add Clinical Notes
    RecordForm->>RecordForm: Attach Files (Optional)
    
    RecordForm->>API: POST /api/pets/[id]/medical-records
    
    API->>API: Authenticate & Check Role
    API->>Pet: Verify Pet Exists
    Pet-->>API: Pet Data
    
    API->>API: Validate Diagnosis Codes
    API->>DB: Verify Codes Exist
    
    alt Valid Codes
        API->>DB: INSERT medical_records
        DB-->>API: Record ID
        
        API->>DB: Update Pet Last Visit Date
        API->>DB: Create Timeline Entry
        
        API-->>RecordForm: 201 Created
        RecordForm-->>Vet: Show Success + Record ID
    else Invalid Codes
        API-->>RecordForm: 400 Validation Error
        RecordForm-->>Vet: Show Error Message
    end
```

## Record Components

- **Diagnosis**: VeNom/SNOMED codes
- **Clinical Notes**: Free-text observations
- **Examination**: Physical exam findings
- **Treatment**: Procedures performed
- **Attachments**: Images, documents
- **Timeline**: Automatic entry in pet history

