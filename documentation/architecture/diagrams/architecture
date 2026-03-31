# Multi-Tenant Isolation Architecture

How multiple clinics are isolated in a single codebase.

```mermaid
graph LR
    subgraph "Single Codebase"
        CODE[Next.js Application<br/>Shared Code]
    end

    subgraph "Tenant: adris"
        A_ROUTE["Route: adris routes"]
        A_CONTENT["Content: adris folder<br/>config.json, theme.json"]
        A_DATA[(Database<br/>tenant_id='adris')]
        A_THEME[Theme: Green]
    end

    subgraph "Tenant: petlife"
        P_ROUTE["Route: petlife routes"]
        P_CONTENT["Content: petlife folder<br/>config.json, theme.json"]
        P_DATA[(Database<br/>tenant_id='petlife')]
        P_THEME[Theme: Blue]
    end

    CODE --> A_ROUTE
    CODE --> P_ROUTE

    A_ROUTE --> A_CONTENT
    A_ROUTE --> A_THEME
    A_CONTENT --> A_DATA

    P_ROUTE --> P_CONTENT
    P_ROUTE --> P_THEME
    P_CONTENT --> P_DATA

    A_DATA -.RLS Policy.-> A_DATA
    P_DATA -.RLS Policy.-> P_DATA

    style A_THEME fill:#2F5233,color:#fff
    style P_THEME fill:#1e40af,color:#fff
    style A_DATA fill:#4ade80
    style P_DATA fill:#60a5fa
```

## Isolation Mechanisms

1. **Routing**: Dynamic `[clinic]` parameter routes to correct content
2. **Content**: Separate JSON files per tenant in `.content_data/`
3. **Database**: `tenant_id` column + RLS policies filter data
4. **Theme**: CSS variables injected per tenant
5. **Shared**: Application code, database schema, infrastructure

