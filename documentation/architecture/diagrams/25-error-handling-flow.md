# Error Handling Flow

How errors are caught, logged, and returned to clients.

```mermaid
flowchart TD
    START([Operation Starts]) --> TRY[Try Block]
    
    TRY --> OPERATION[Execute Operation]
    
    OPERATION --> ERROR{Error Occurs?}
    
    ERROR -->|No| SUCCESS[Return Success]
    ERROR -->|Yes| CATCH[Catch Error]
    
    CATCH --> TYPE{Error Type?}
    
    TYPE -->|Validation| VALID[Validation Error]
    TYPE -->|Auth| AUTH_ERR[Authentication Error]
    TYPE -->|Database| DB_ERR[Database Error]
    TYPE -->|Network| NET_ERR[Network Error]
    TYPE -->|Unknown| UNKNOWN[Unknown Error]
    
    VALID --> LOG1[Log Validation Error]
    AUTH_ERR --> LOG2[Log Auth Error]
    DB_ERR --> LOG3[Log DB Error + Stack]
    NET_ERR --> LOG4[Log Network Error]
    UNKNOWN --> LOG5[Log Full Error + Stack]
    
    LOG1 --> FORMAT1["Format: 400 Bad Request<br/>+ Field Errors"]
    LOG2 --> FORMAT2["Format: 401/403<br/>+ Error Message"]
    LOG3 --> FORMAT3["Format: 500<br/>+ Generic Message<br/>(Hide Details)"]
    LOG4 --> FORMAT4["Format: 503<br/>+ Retry Message"]
    LOG5 --> FORMAT3
    
    FORMAT1 --> AUDIT[Log to Audit Trail]
    FORMAT2 --> AUDIT
    FORMAT3 --> AUDIT
    FORMAT4 --> AUDIT
    
    AUDIT --> RETURN[Return to Client]
    SUCCESS --> RETURN
    
    RETURN --> END([Response Sent])
    
    style START fill:#e1f5ff
    style ERROR fill:#f87171
    style SUCCESS fill:#4ade80
    style AUDIT fill:#fbbf24
```

## Error Categories

- **Validation (400)**: Invalid input, missing fields
- **Authentication (401)**: Not logged in
- **Authorization (403)**: Wrong role/tenant
- **Not Found (404)**: Resource doesn't exist
- **Database (500)**: Query/transaction failed
- **Network (503)**: External service unavailable

## Error Response Format

```json
{
  "error": "User-friendly message",
  "code": "ERROR_CODE",
  "details": {},
  "fieldErrors": {}
}
```

