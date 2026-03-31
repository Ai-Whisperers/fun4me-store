# Row-Level Security (RLS) Isolation Flow

How RLS ensures multi-tenant data isolation.

```mermaid
flowchart TD
    START([User Makes Query]) --> GET_AUTH[Get auth.uid from JWT]
    GET_AUTH --> LOOKUP[Lookup Profile<br/>SELECT tenant_id FROM profiles<br/>WHERE id = auth.uid]
    
    LOOKUP -->|Profile Found| EXTRACT[Extract tenant_id]
    LOOKUP -->|No Profile| ERROR1[Error: Profile Not Found]
    
    EXTRACT --> APPLY_RLS[Apply RLS Policy]
    
    APPLY_RLS --> POLICY{Policy Type}
    
    POLICY -->|Owner Policy| FILTER1[WHERE owner_id = auth.uid<br/>AND tenant_id = user.tenant_id]
    POLICY -->|Staff Policy| FILTER2[WHERE tenant_id = user.tenant_id<br/>AND is_staff_of tenant_id]
    POLICY -->|Public Policy| FILTER3[WHERE tenant_id = user.tenant_id]
    
    FILTER1 --> EXECUTE[Execute Query with Filter]
    FILTER2 --> EXECUTE
    FILTER3 --> EXECUTE
    
    EXECUTE --> RETURN[Return Filtered Results]
    RETURN --> END([User Sees Only Their Tenant Data])
    
    ERROR1 --> END
    
    style START fill:#e1f5ff
    style EXTRACT fill:#fbbf24
    style APPLY_RLS fill:#f87171
    style EXECUTE fill:#4ade80
    style END fill:#4ade80
    style ERROR1 fill:#f87171
```

## RLS Policy Examples

### Owner Policy (Pets)
```sql
CREATE POLICY "Owners see own pets"
ON pets FOR SELECT
USING (
    owner_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
```

### Staff Policy (All Pets)
```sql
CREATE POLICY "Staff see tenant pets"
ON pets FOR SELECT
USING (is_staff_of(tenant_id));
```

## Protection Layers

1. **JWT Validation**: Supabase validates token
2. **Profile Lookup**: Get user's tenant_id
3. **RLS Policy**: Automatic WHERE clause injection
4. **Query Execution**: Database enforces isolation
5. **Result Filtering**: Only tenant data returned

