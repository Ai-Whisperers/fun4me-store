# Store Checkout Flow

E-commerce checkout process with stock validation and transaction safety.

```mermaid
sequenceDiagram
    participant User
    participant Cart
    participant CheckoutPage
    participant API
    participant DB as Database Function
    participant Inventory

    User->>Cart: Add Products
    Cart->>Cart: Store in LocalStorage
    
    User->>CheckoutPage: Click "Confirmar Pedido"
    CheckoutPage->>API: POST /api/store/checkout
    
    API->>API: Authenticate User
    API->>API: Validate Tenant
    
    API->>DB: process_checkout(items)
    
    Note over DB: BEGIN TRANSACTION
    
    DB->>Inventory: SELECT FOR UPDATE (Lock Rows)
    Inventory-->>DB: Current Stock
    
    DB->>DB: Validate Stock Availability
    
    alt Stock Insufficient
        DB-->>API: Stock Error
        API-->>CheckoutPage: 400 + Error Details
        CheckoutPage-->>User: Show Stock Errors
    else Stock Available
        DB->>DB: Calculate Totals
        DB->>DB: INSERT invoices
        DB->>DB: INSERT invoice_items
        DB->>Inventory: UPDATE stock_quantity
        DB->>DB: INSERT inventory_transactions
        
        Note over DB: COMMIT TRANSACTION
        
        DB-->>API: Success + Invoice ID
        API-->>CheckoutPage: 201 Success
        CheckoutPage->>Cart: Clear Cart
        CheckoutPage-->>User: Show Invoice + WhatsApp Link
    end
```

## Key Features

- **Stock Locking**: `SELECT FOR UPDATE` prevents race conditions
- **Atomic Transaction**: All operations in single transaction
- **Error Handling**: Clear error messages for stock issues
- **Audit Trail**: All inventory changes logged

