# Hospitalization Admission Flow

Complete process from admission to discharge.

```mermaid
flowchart TD
    START([Patient Needs Hospitalization]) --> SELECT[Select Pet]
    SELECT --> ASSIGN[Assign Kennel]
    
    ASSIGN --> CHECK{Kennel Available?}
    CHECK -->|No| SELECT_KENNEL[Choose Different Kennel]
    SELECT_KENNEL --> ASSIGN
    CHECK -->|Yes| ADMIT[Admit Patient]
    
    ADMIT --> RECORD[Record Initial Vitals]
    RECORD --> SCHEDULE[Schedule Treatments]
    SCHEDULE --> LOG[Log Feeding Schedule]
    
    LOG --> MONITOR[Monitor Patient]
    
    MONITOR --> UPDATE_VITALS[Update Vitals Regularly]
    UPDATE_VITALS --> ADMINISTER[Administer Treatments]
    ADMINISTER --> LOG_FEEDING[Log Feedings]
    
    LOG_FEEDING --> ASSESS{Ready for Discharge?}
    
    ASSESS -->|No| MONITOR
    ASSESS -->|Yes| PREPARE[Prepare Discharge]
    
    PREPARE --> SUMMARY[Generate Discharge Summary]
    SUMMARY --> INVOICE[Create Hospitalization Invoice]
    INVOICE --> DISCHARGE[Discharge Patient]
    
    DISCHARGE --> RELEASE[Release Kennel]
    RELEASE --> END([Hospitalization Complete])
    
    style START fill:#e1f5ff
    style ADMIT fill:#fbbf24
    style MONITOR fill:#60a5fa
    style DISCHARGE fill:#4ade80
    style END fill:#4ade80
```

## Hospitalization Components

- **Kennel Assignment**: Track cage/kennel availability
- **Vitals Monitoring**: Regular temperature, HR, RR, pain scale
- **Treatment Schedule**: Medications and procedures
- **Feeding Logs**: Food type, amount, frequency
- **Discharge Summary**: Complete record of stay

