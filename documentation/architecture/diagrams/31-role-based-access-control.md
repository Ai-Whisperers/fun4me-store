# Role-Based Access Control (RBAC)

How different user roles determine access permissions.

```mermaid
graph TB
    subgraph "Pet Owner Role"
        OWNER[Pet Owner]
        OWNER --> OWN_PETS[Own Pets Only]
        OWNER --> OWN_APPT[Own Appointments]
        OWNER --> OWN_INV[Own Invoices]
        OWNER --> OWN_MSG[Own Messages]
        OWNER --> STORE[Store Shopping]
        OWNER --> PORTAL[Portal Access]
    end
    
    subgraph "Veterinarian Role"
        VET[Veterinarian]
        VET --> ALL_PETS[All Tenant Pets]
        VET --> MED_REC[Medical Records]
        VET --> PRESCRIPT[Prescriptions]
        VET --> CLINICAL[Clinical Tools]
        VET --> APPT_MGMT[Appointment Management]
        VET --> LAB[Lab Orders]
        VET --> HOSP[Hospitalization]
        VET --> DASHBOARD[Dashboard Access]
    end
    
    subgraph "Administrator Role"
        ADMIN[Administrator]
        ADMIN --> ALL_VET[All Vet Features]
        ADMIN --> TEAM[Team Management]
        ADMIN --> INVENTORY[Inventory Management]
        ADMIN --> FINANCE[Financial Management]
        ADMIN --> SETTINGS[Clinic Settings]
        ADMIN --> AUDIT[Audit Logs]
        ADMIN --> REPORTS[Reports & Analytics]
    end
    
    style OWNER fill:#e1f5ff
    style VET fill:#fff4e1
    style ADMIN fill:#ffe1f5
```

## Permission Matrix

| Feature | Owner | Vet | Admin |
|---------|-------|-----|-------|
| View Own Pets | ✅ | ✅ | ✅ |
| View All Pets | ❌ | ✅ | ✅ |
| Create Medical Records | ❌ | ✅ | ✅ |
| Create Prescriptions | ❌ | ✅ | ✅ |
| Manage Appointments | Own Only | All | All |
| Create Invoices | ❌ | ✅ | ✅ |
| Manage Inventory | ❌ | ❌ | ✅ |
| Invite Staff | ❌ | ❌ | ✅ |
| Clinic Settings | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ❌ | ✅ |

## Access Control Implementation

- **Database Level**: RLS policies enforce tenant isolation
- **Application Level**: Role checks in API routes
- **UI Level**: Conditional rendering based on role
- **Function Level**: `is_staff_of()` helper function

