# Appointment State Machine

Complete lifecycle of appointment states and transitions.

```mermaid
stateDiagram-v2
    [*] --> scheduled: Create Appointment
    
    scheduled --> confirmed: Send Confirmation
    scheduled --> cancelled: Cancel Before Confirmation
    scheduled --> rescheduled: Reschedule
    
    confirmed --> checked_in: Patient Arrives
    confirmed --> no_show: Patient Doesn't Arrive
    confirmed --> cancelled: Cancel After Confirmation
    
    checked_in --> in_progress: Start Consultation
    checked_in --> cancelled: Cancel After Check-in
    
    in_progress --> completed: Finish Consultation
    in_progress --> cancelled: Cancel During Consultation
    
    completed --> [*]: Appointment Done
    cancelled --> [*]: Appointment Cancelled
    no_show --> [*]: Marked as No-Show
    rescheduled --> scheduled: New Time Slot
    
    note right of scheduled
        Initial state when
        appointment is created
    end note
    
    note right of in_progress
        Vet is actively
        seeing the patient
    end note
    
    note right of completed
        Consultation finished,
        may create invoice
    end note
```

## State Descriptions

- **scheduled**: Appointment created, awaiting confirmation
- **confirmed**: Client confirmed attendance
- **checked_in**: Patient arrived at clinic
- **in_progress**: Consultation actively happening
- **completed**: Consultation finished successfully
- **cancelled**: Appointment cancelled (any stage)
- **no_show**: Patient didn't arrive
- **rescheduled**: Moved to different time

## Business Rules

- Cannot cancel completed appointments
- No-show can only occur from confirmed state
- Rescheduling creates new scheduled appointment
- Completed appointments may trigger invoice creation

