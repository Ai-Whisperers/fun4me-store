# System Architecture Diagram

High-level overview of the Vete platform architecture.

```mermaid
graph TB
    subgraph "Clients"
        PO[Pet Owner Browser]
        VB[Vet Browser]
        AB[Admin Browser]
    end

    subgraph "Next.js 15 Application"
        AR["App Router<br/>[clinic] routes"]
        API["API Routes<br/>/api endpoints"]
        SA["Server Actions<br/>/actions"]
        MW["Middleware<br/>Auth & Routing"]
    end

    subgraph "Content Layer"
        CMS["JSON-CMS<br/>.content_data"]
        TH["Theme Provider<br/>Dynamic CSS Vars"]
    end

    subgraph "Supabase Platform"
        PG[(PostgreSQL<br/>+ RLS)]
        AUTH[Supabase Auth<br/>JWT Tokens]
        STOR[Supabase Storage<br/>Pet Photos]
    end

    PO --> AR
    VB --> AR
    AB --> AR
    PO --> API
    VB --> API
    AB --> API

    AR --> CMS
    AR --> TH
    AR --> SA
    API --> MW
    SA --> MW

    MW --> AUTH
    MW --> PG
    API --> PG
    SA --> PG
    API --> STOR
    SA --> STOR

    style PO fill:#e1f5ff
    style VB fill:#fff4e1
    style AB fill:#ffe1f5
    style PG fill:#4ade80
    style AUTH fill:#60a5fa
    style STOR fill:#a78bfa
```

## Components

- **Clients**: Three user types accessing the platform
- **Next.js Application**: App Router, API routes, Server Actions, Middleware
- **Content Layer**: JSON-CMS for clinic content, dynamic theming
- **Supabase Platform**: Database with RLS, authentication, file storage

