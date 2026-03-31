# Server Action vs REST API Decision Tree

When to use Server Actions vs REST API endpoints.

```mermaid
flowchart TD
    START([Need to Perform Action]) --> FORM{Is it a Form Submission?}
    
    FORM -->|Yes| SERVER_ACTION[Use Server Action]
    FORM -->|No| CLIENT{Is it Client-Side?}
    
    CLIENT -->|Yes| REST_API[Use REST API]
    CLIENT -->|No| SERVER_COMP{Is it Server Component?}
    
    SERVER_COMP -->|Yes| SERVER_ACTION
    SERVER_COMP -->|No| REALTIME{Need Real-time Updates?}
    
    REALTIME -->|Yes| REST_API
    REALTIME -->|No| MUTATION{Is it a Mutation?}
    
    MUTATION -->|Yes| SERVER_ACTION
    MUTATION -->|No| QUERY[Use REST API]
    
    SERVER_ACTION --> PROS1["Pros:<br/>- Progressive Enhancement<br/>- No API Route Needed<br/>- Type-Safe<br/>- Automatic Revalidation"]
    
    REST_API --> PROS2["Pros:<br/>- Client-Side Control<br/>- Error Handling<br/>- Loading States<br/>- Real-time Updates"]
    
    style SERVER_ACTION fill:#4ade80
    style REST_API fill:#60a5fa
    style START fill:#e1f5ff
```

## Use Cases

### Server Actions
- Form submissions
- Mutations from Server Components
- Actions that need automatic revalidation
- Progressive enhancement scenarios

### REST API
- Client-side data fetching
- Real-time updates
- Complex error handling
- External API integrations

