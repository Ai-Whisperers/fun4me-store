# Core Entity Relationship Diagram

Main database entities and their relationships.

```mermaid
erDiagram
    TENANTS ||--o{ PROFILES : "has"
    PROFILES ||--o{ PETS : "owns"
    PETS ||--o{ APPOINTMENTS : "has"
    PETS ||--o{ MEDICAL_RECORDS : "has"
    PETS ||--o{ VACCINES : "has"
    PETS ||--o{ PRESCRIPTIONS : "has"
    APPOINTMENTS }o--|| SERVICES : "uses"
    INVOICES ||--o{ INVOICE_ITEMS : "contains"
    INVOICES ||--o{ PAYMENTS : "receives"
    STORE_PRODUCTS ||--o{ STORE_INVENTORY : "tracks"
    STORE_INVENTORY ||--o{ INVENTORY_TRANSACTIONS : "logs"
    HOSPITALIZATIONS }o--|| KENNELS : "assigned_to"
    PETS ||--o{ HOSPITALIZATIONS : "admitted_to"
    HOSPITALIZATIONS ||--o{ VITALS : "monitored_by"
    HOSPITALIZATIONS ||--o{ TREATMENTS : "receives"
    LAB_ORDERS }o--|| PETS : "for"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    PROFILES ||--o{ CONVERSATIONS : "participates_in"

    TENANTS {
        text id PK
        text name
        text slug
    }
    
    PROFILES {
        uuid id PK
        text tenant_id FK
        text email
        text role
    }
    
    PETS {
        uuid id PK
        text tenant_id FK
        uuid owner_id FK
        text name
        text species
    }
    
    APPOINTMENTS {
        uuid id PK
        text tenant_id FK
        uuid pet_id FK
        uuid service_id FK
        date appointment_date
        time start_time
        text status
    }
    
    INVOICES {
        uuid id PK
        text tenant_id FK
        uuid user_id FK
        text invoice_number
        decimal total
        text status
    }
```

## Key Relationships

- **Tenants → Profiles**: One tenant has many users
- **Profiles → Pets**: One owner has many pets
- **Pets → Appointments**: One pet has many appointments
- **Pets → Medical Records**: One pet has many medical records
- **Invoices → Invoice Items**: One invoice has many line items
- **Store Products → Inventory**: One product has inventory tracking

## Multi-Tenancy

All tables include `tenant_id` for isolation:
- `pets.tenant_id` → `tenants.id`
- `appointments.tenant_id` → `tenants.id`
- `invoices.tenant_id` → `tenants.id`

