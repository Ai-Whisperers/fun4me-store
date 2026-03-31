# Lab Order Workflow

From order creation to result entry and review.

```mermaid
sequenceDiagram
    participant Vet
    participant LabForm
    participant API
    participant DB as Database
    participant Lab as Lab System

    Vet->>LabForm: Create Lab Order
    LabForm->>LabForm: Select Pet
    LabForm->>LabForm: Select Tests
    LabForm->>LabForm: Add Notes
    
    LabForm->>API: POST /api/lab-orders
    
    API->>DB: Verify Pet
    API->>DB: Validate Tests
    API->>DB: INSERT lab_orders (status: 'pending')
    DB-->>API: Order ID
    
    API-->>LabForm: 201 Created
    LabForm-->>Vet: Order Created
    
    Note over Lab,DB: Sample Collection & Processing
    
    Lab->>DB: Update Status: 'in_progress'
    
    Note over Lab,DB: Results Available
    
    Vet->>LabForm: Enter Results
    LabForm->>API: POST /api/lab-orders/[id]/results
    
    API->>DB: Validate Results
    API->>DB: INSERT lab_results
    API->>DB: UPDATE lab_orders (status: 'completed')
    
    API-->>LabForm: Success
    LabForm-->>Vet: Results Saved
    
    Vet->>LabForm: Attach PDF Results
    LabForm->>API: Upload PDF
    API->>DB: Store PDF URL
    
    Vet->>LabForm: Add Comments
    LabForm->>API: POST /api/lab-orders/[id]/comments
    API->>DB: INSERT lab_comments
```

## Lab Order States

- **pending**: Order created, awaiting sample
- **in_progress**: Sample collected, processing
- **completed**: Results entered
- **cancelled**: Order cancelled

## Result Entry

- **Manual Entry**: Vet enters values directly
- **PDF Upload**: Attach lab report PDF
- **Abnormal Flagging**: System flags out-of-range values
- **Comments**: Internal notes and discussion

