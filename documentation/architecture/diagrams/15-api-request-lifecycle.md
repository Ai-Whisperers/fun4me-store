# API Request Lifecycle

Complete flow of an API request from client to database and back.

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant API as API Route
    participant Auth as Auth Check
    participant RateLimit
    participant Validator
    participant BusinessLogic
    participant RLS as RLS Layer
    participant DB as Database
    participant Response

    Client->>Middleware: HTTP Request
    
    Middleware->>Middleware: Extract Clinic from URL
    Middleware->>API: Route to Handler
    
    API->>Auth: Check Authentication
    Auth->>Auth: Validate JWT Token
    
    alt Not Authenticated
        Auth-->>API: 401 Unauthorized
        API-->>Client: 401 Error
    else Authenticated
        Auth-->>API: User + Profile
        
        API->>RateLimit: Check Rate Limit
        
        alt Rate Limited
            RateLimit-->>API: 429 Too Many Requests
            API-->>Client: 429 Error
        else Within Limit
            RateLimit-->>API: Continue
            
            API->>Validator: Validate Input (Zod)
            
            alt Invalid Input
                Validator-->>API: Validation Errors
                API-->>Client: 400 Bad Request
            else Valid Input
                Validator-->>API: Validated Data
                
                API->>BusinessLogic: Process Request
                BusinessLogic->>RLS: Query with auth.uid()
                
                RLS->>RLS: Apply RLS Policies
                RLS->>DB: Execute Query
                DB-->>RLS: Filtered Results
                RLS-->>BusinessLogic: Data
                
                BusinessLogic->>BusinessLogic: Transform Data
                BusinessLogic-->>API: Result
                
                API->>Response: Format Response
                Response-->>Client: 200 Success + Data
            end
        end
    end
```

## Layers

1. **Middleware**: URL parsing, routing
2. **Authentication**: JWT validation
3. **Rate Limiting**: Prevent abuse
4. **Validation**: Input sanitization
5. **Business Logic**: Core functionality
6. **RLS**: Automatic tenant filtering
7. **Database**: Data storage
8. **Response**: Format and return

