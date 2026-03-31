# Appointment Booking Flow

Complete flow from service selection to appointment confirmation.

```mermaid
flowchart TD
    START([User Visits Booking Page]) --> STEP1[Step 1: Select Service]
    STEP1 --> STEP2[Step 2: Select Pet]
    STEP2 --> STEP3[Step 3: Choose Date & Time]
    STEP3 --> STEP4[Step 4: Confirm Details]
    
    STEP4 --> SUBMIT{Submit Booking}
    
    SUBMIT -->|"POST /api/booking"| AUTH[Authenticate User]
    AUTH -->|Not Authenticated| ERROR1[Error: Login Required]
    AUTH -->|Authenticated| VALIDATE[Validate Input]
    
    VALIDATE -->|Invalid| ERROR2[Error: Validation Failed]
    VALIDATE -->|Valid| CHECK_OVERLAP[Check Time Slot Availability]
    
    CHECK_OVERLAP -->|Overlap Found| ERROR3[Error: Time Slot Occupied]
    CHECK_OVERLAP -->|Available| CREATE[Create Appointment]
    
    CREATE -->|Success| SUCCESS[Show Success Screen]
    CREATE -->|Database Error| ERROR4[Error: Failed to Create]
    
    ERROR1 --> STEP1
    ERROR2 --> STEP4
    ERROR3 --> STEP3
    ERROR4 --> STEP4
    
    SUCCESS --> END([Booking Complete])
    
    style START fill:#e1f5ff
    style SUCCESS fill:#4ade80
    style ERROR1 fill:#f87171
    style ERROR2 fill:#f87171
    style ERROR3 fill:#f87171
    style ERROR4 fill:#f87171
```

## Steps Detail

1. **Service Selection**: User picks from available services
2. **Pet Selection**: Choose pet (or register new one)
3. **Date/Time**: Calendar picker + time slot selection
4. **Confirmation**: Review details before submission
5. **Validation**: Auth check, input validation, overlap detection
6. **Creation**: Insert into `appointments` table
7. **Success**: Confirmation screen with appointment details

