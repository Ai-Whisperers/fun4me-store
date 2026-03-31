# Authentication Flow

Complete authentication process from login to session establishment.

```mermaid
sequenceDiagram
    participant User
    participant LoginForm
    participant NextJS as Next.js API
    participant SupabaseAuth
    participant Database
    participant RLS

    User->>LoginForm: Enter Email/Password
    LoginForm->>NextJS: POST /api/auth/login
    
    NextJS->>SupabaseAuth: signInWithPassword(email, password)
    
    alt Invalid Credentials
        SupabaseAuth-->>NextJS: Error: Invalid credentials
        NextJS-->>LoginForm: 401 Unauthorized
        LoginForm-->>User: Show Error Message
    else Valid Credentials
        SupabaseAuth->>SupabaseAuth: Validate Password
        SupabaseAuth->>SupabaseAuth: Generate JWT Token
        SupabaseAuth-->>NextJS: JWT Token + User ID
        
        NextJS->>Database: SELECT tenant_id, role FROM profiles WHERE id = user_id
        Database-->>NextJS: tenant_id, role
        
        NextJS->>NextJS: Set Cookie with JWT
        NextJS-->>LoginForm: 200 Success
        
        LoginForm->>LoginForm: Store Session
        LoginForm->>User: Redirect to Portal
        
        Note over RLS: All subsequent queries use<br/>JWT token for RLS context
        
        User->>NextJS: Request Protected Resource
        NextJS->>SupabaseAuth: getUser() from Cookie
        SupabaseAuth-->>NextJS: User + JWT
        NextJS->>RLS: Query with auth.uid() context
        RLS->>RLS: Apply RLS Policies
        RLS-->>NextJS: Filtered Results
        NextJS-->>User: Protected Data
    end
```

## Session Management

- **JWT Token**: Stored in HTTP-only cookie
- **Session Duration**: Configurable in Supabase
- **Auto-Refresh**: Token refreshed automatically
- **RLS Context**: `auth.uid()` available in all queries

