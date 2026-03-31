# Vaccine Schedule Tracking

How vaccine schedules are managed and due dates calculated.

```mermaid
flowchart TD
    START([Record Vaccination]) --> GET_TEMPLATE[Get Vaccine Template]
    
    GET_TEMPLATE --> TEMPLATE{Vemplate Found?}
    TEMPLATE -->|No| MANUAL[Manual Entry]
    TEMPLATE -->|Yes| AUTO[Auto-Calculate Next]
    
    AUTO --> CALC[Calculate Next Due Date<br/>Current Date + Interval]
    MANUAL --> ENTER[Enter Next Due Date]
    
    CALC --> CREATE[Create Next Vaccine Record]
    ENTER --> CREATE
    
    CREATE --> STATUS[Set Status: 'scheduled']
    STATUS --> STORE[Store in Database]
    
    STORE --> CHECK[Check All Vaccines]
    CHECK --> DUE{Any Due Soon?}
    
    DUE -->|Yes| ALERT[Generate Reminder]
    DUE -->|No| MONITOR[Continue Monitoring]
    
    ALERT --> NOTIFY[Send Notification]
    NOTIFY --> MONITOR
    
    MONITOR --> NEXT_VACCINE[Next Vaccine Due]
    NEXT_VACCINE --> RECORD[Record Vaccination]
    RECORD --> START
    
    style START fill:#e1f5ff
    style CALC fill:#fbbf24
    style ALERT fill:#f87171
    style STORE fill:#4ade80
```

## Vaccine Template Structure

```json
{
  "vaccine_type": "DHPP",
  "initial_age_weeks": 6,
  "interval_weeks": 3,
  "total_doses": 3,
  "booster_interval_months": 12
}
```

## Schedule Calculation

- **First Dose**: Based on pet age
- **Subsequent Doses**: Previous dose date + interval
- **Boosters**: Annual or as specified
- **Due Alerts**: Generated 1 week before due date

