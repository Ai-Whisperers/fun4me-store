# Security Architecture Layers

Multiple layers of security protecting the platform.

```mermaid
graph TB
    subgraph "Layer 1: Network Security"
        HTTPS[HTTPS Only]
        CORS[CORS Configuration]
        FIREWALL[Firewall Rules]
    end
    
    subgraph "Layer 2: Authentication"
        JWT[JWT Token Validation]
        SESSION[Session Management]
        REFRESH[Token Refresh]
    end
    
    subgraph "Layer 3: Authorization"
        PROFILE[Profile Lookup]
        TENANT[Tenant Validation]
        ROLE[Role Check]
    end
    
    subgraph "Layer 4: Application Security"
        RATE[Rate Limiting]
        VALIDATE[Input Validation]
        SANITIZE[Data Sanitization]
    end
    
    subgraph "Layer 5: Database Security"
        RLS[Row-Level Security]
        POLICIES[RLS Policies]
        FUNCTIONS[Security Functions]
    end
    
    subgraph "Layer 6: Audit & Monitoring"
        AUDIT[Audit Logging]
        MONITOR[Activity Monitoring]
        ALERTS[Security Alerts]
    end
    
    HTTPS --> JWT
    CORS --> JWT
    FIREWALL --> JWT
    
    JWT --> PROFILE
    SESSION --> PROFILE
    REFRESH --> PROFILE
    
    PROFILE --> RATE
    TENANT --> RATE
    ROLE --> RATE
    
    RATE --> RLS
    VALIDATE --> RLS
    SANITIZE --> RLS
    
    RLS --> AUDIT
    POLICIES --> AUDIT
    FUNCTIONS --> AUDIT
    
    AUDIT --> MONITOR
    MONITOR --> ALERTS
    
    style HTTPS fill:#4ade80
    style JWT fill:#60a5fa
    style RLS fill:#f87171
    style AUDIT fill:#fbbf24
```

## Security Principles

1. **Defense in Depth**: Multiple layers of protection
2. **Least Privilege**: Users only access what they need
3. **Tenant Isolation**: RLS ensures data separation
4. **Audit Trail**: All actions logged
5. **Input Validation**: All inputs validated and sanitized

