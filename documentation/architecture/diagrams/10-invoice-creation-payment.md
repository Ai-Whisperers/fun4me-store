# Invoice Creation & Payment Flow

Complete invoicing workflow from creation to payment processing.

```mermaid
sequenceDiagram
    participant Staff
    participant InvoiceForm
    participant API
    participant DB as Database
    participant RPC as RPC Function

    Staff->>InvoiceForm: Create Invoice
    InvoiceForm->>InvoiceForm: Select Pet
    InvoiceForm->>InvoiceForm: Add Items (Services/Products)
    InvoiceForm->>InvoiceForm: Calculate Totals
    
    InvoiceForm->>API: POST /api/invoices
    
    API->>API: Authenticate & Check Role (vet/admin)
    API->>DB: Verify Pet Belongs to Clinic
    DB-->>API: Pet Data
    
    API->>RPC: generate_invoice_number(tenant_id)
    RPC-->>API: Invoice Number
    
    API->>API: Calculate Subtotal, Tax, Total
    
    API->>DB: INSERT invoices (status: 'draft')
    DB-->>API: Invoice ID
    
    API->>DB: INSERT invoice_items
    DB-->>API: Success
    
    API-->>InvoiceForm: 201 Created + Invoice Data
    InvoiceForm-->>Staff: Show Invoice Details
    
    Note over Staff,InvoiceForm: Payment Processing
    
    Staff->>InvoiceForm: Record Payment
    InvoiceForm->>API: POST /api/invoices/[id]/payments
    
    API->>RPC: record_invoice_payment()
    
    Note over RPC: BEGIN TRANSACTION<br/>Lock Invoice Row
    
    RPC->>RPC: Validate Amount
    RPC->>RPC: Check Amount Due
    
    alt Amount Valid
        RPC->>DB: INSERT payments
        RPC->>DB: UPDATE invoices<br/>(amount_paid, amount_due, status)
        RPC->>DB: COMMIT
        RPC-->>API: Success
        API-->>InvoiceForm: 200 Success
        InvoiceForm-->>Staff: Payment Recorded
    else Amount Invalid
        RPC->>DB: ROLLBACK
        RPC-->>API: Error
        API-->>InvoiceForm: 400 Error
        InvoiceForm-->>Staff: Show Error
    end
```

## Invoice States

- **draft**: Initial creation, can be edited
- **sent**: Sent to client, awaiting payment
- **partial**: Partially paid
- **paid**: Fully paid
- **overdue**: Past due date, unpaid
- **cancelled**: Cancelled invoice

## Payment Processing

- **Atomic Operation**: Uses RPC function with transaction
- **Row Locking**: Prevents concurrent payment issues
- **Status Updates**: Automatically updates invoice status
- **Audit Trail**: All payments logged

