# QR Tag Assignment Flow

How QR tags are assigned to pets and scanned for identification.

```mermaid
flowchart TD
    START([QR Tag Scanned]) --> LOOKUP[Lookup Tag by Code]
    
    LOOKUP --> STATUS{Tag Status?}
    
    STATUS -->|Not Found| NOT_FOUND[Show: Tag Not Registered]
    STATUS -->|Unassigned| UNASSIGNED[Show Assignment UI]
    STATUS -->|Assigned| ASSIGNED[Show Pet Profile]
    
    UNASSIGNED --> AUTH{User Authenticated?}
    
    AUTH -->|No| LOGIN[Redirect to Login<br/>with redirect=/tag/code]
    AUTH -->|Yes| FETCH[Fetch User's Pets]
    
    LOGIN --> AUTH
    
    FETCH --> SELECT[User Selects Pet]
    SELECT --> VERIFY[Verify Pet Ownership]
    
    VERIFY -->|Not Owner| ERROR[Error: Not Authorized]
    VERIFY -->|Owner| ASSIGN[Assign Tag to Pet]
    
    ASSIGN --> UPDATE[UPDATE qr_tags<br/>pet_id, assigned_at, is_registered]
    UPDATE --> LOG[Log Assignment Event]
    LOG --> SUCCESS[Show Success + Pet Profile]
    
    ASSIGNED --> DISPLAY[Display Public Pet Profile]
    DISPLAY --> INFO[Show Pet Info, Owner Contact, Clinic Info]
    
    INFO --> LOST{Is Pet Lost?}
    LOST -->|Yes| ALERT[Show Lost Pet Alert]
    LOST -->|No| SCAN_LOG[Log Scan Event]
    
    ALERT --> SCAN_LOG
    SCAN_LOG --> END([Scan Complete])
    SUCCESS --> END
    ERROR --> END
    NOT_FOUND --> END
    
    style START fill:#e1f5ff
    style ASSIGN fill:#fbbf24
    style SUCCESS fill:#4ade80
    style ERROR fill:#f87171
    style ASSIGNED fill:#60a5fa
```

## Tag States

- **unassigned**: Tag exists but not linked to pet
- **assigned**: Tag linked to pet, active
- **inactive**: Tag deactivated
- **reassigned**: Tag moved to different pet

## Public Profile Information

- Pet name, species, breed
- Pet photo
- Owner contact (if authorized)
- Clinic contact information
- Lost pet status (if applicable)

