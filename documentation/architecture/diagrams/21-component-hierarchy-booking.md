# Booking Wizard Component Hierarchy

React component structure for the appointment booking flow.

```mermaid
graph TD
    BOOKING[BookingWizard]
    
    BOOKING --> PROGRESS[ProgressStepper]
    BOOKING --> STEPS[StepContainer]
    
    STEPS --> SERVICE[ServiceSelectionStep]
    STEPS --> PET[PetSelectionStep]
    STEPS --> DATETIME[DateTimeSelectionStep]
    STEPS --> CONFIRM[ConfirmationStep]
    STEPS --> SUCCESS[SuccessScreen]
    
    SERVICE --> SERVICECARD[ServiceCard]
    PET --> PETCARD[PetCard]
    PET --> REGISTER[RegisterPetButton]
    
    DATETIME --> CALENDAR[CalendarPicker]
    DATETIME --> TIMESLOTS[TimeSlotGrid]
    
    CONFIRM --> SUMMARY[AppointmentSummary]
    CONFIRM --> SUBMIT[SubmitButton]
    
    SUCCESS --> DETAILS[AppointmentDetails]
    SUCCESS --> ACTIONS[ActionButtons]
    
    style BOOKING fill:#60a5fa
    style STEPS fill:#4ade80
    style SUCCESS fill:#fbbf24
```

## Component Responsibilities

- **BookingWizard**: Main orchestrator, manages state
- **ProgressStepper**: Visual progress indicator
- **StepContainer**: Renders current step
- **ServiceSelectionStep**: Service selection UI
- **PetSelectionStep**: Pet selection UI
- **DateTimeSelectionStep**: Date/time picker
- **ConfirmationStep**: Review before submission
- **SuccessScreen**: Confirmation after booking

