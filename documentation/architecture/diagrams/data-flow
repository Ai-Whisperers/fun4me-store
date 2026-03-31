# End-to-End Data Flow

Complete data journey from user input to database and back.

```mermaid
flowchart LR
    subgraph "Client Side"
        USER[User Input]
        FORM[Form Component]
        STATE[Component State]
        FETCH[Fetch API]
    end
    
    subgraph "Network"
        HTTP[HTTP Request]
        RESPONSE[HTTP Response]
    end
    
    subgraph "Server Side"
        MIDDLEWARE[Middleware]
        API[API Route]
        VALIDATE[Validation]
        AUTH[Auth Check]
        BUSINESS[Business Logic]
    end
    
    subgraph "Database"
        RLS[RLS Layer]
        QUERY[SQL Query]
        POSTGRES[(PostgreSQL)]
        RESULT[Query Result]
    end
    
    USER --> FORM
    FORM --> STATE
    STATE --> FETCH
    FETCH --> HTTP
    
    HTTP --> MIDDLEWARE
    MIDDLEWARE --> API
    API --> AUTH
    AUTH --> VALIDATE
    VALIDATE --> BUSINESS
    
    BUSINESS --> RLS
    RLS --> QUERY
    QUERY --> POSTGRES
    POSTGRES --> RESULT
    
    RESULT --> RLS
    RLS --> BUSINESS
    BUSINESS --> API
    API --> RESPONSE
    
    RESPONSE --> FETCH
    FETCH --> STATE
    STATE --> FORM
    FORM --> USER
    
    style USER fill:#e1f5ff
    style POSTGRES fill:#4ade80
    style RLS fill:#f87171
```

## Data Transformation Points

1. **Form Input**: User types → Component state
2. **API Request**: State → JSON → HTTP
3. **Validation**: JSON → Validated objects
4. **RLS Filtering**: Query → Tenant-filtered query
5. **Database**: Query → Results
6. **Response**: Results → JSON → HTTP
7. **Component Update**: Response → State → UI

