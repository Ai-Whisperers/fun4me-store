# Invoice State Machine

Invoice payment lifecycle and status transitions.

```mermaid
stateDiagram-v2
    [*] --> draft: Create Invoice
    
    draft --> sent: Send to Client
    draft --> cancelled: Cancel Draft
    
    sent --> partial: Record Partial Payment
    sent --> paid: Record Full Payment
    sent --> overdue: Past Due Date
    sent --> cancelled: Cancel Sent Invoice
    
    partial --> paid: Complete Payment
    partial --> overdue: Past Due Date
    partial --> cancelled: Cancel Partial
    
    overdue --> partial: Record Payment
    overdue --> paid: Record Full Payment
    overdue --> cancelled: Cancel Overdue
    
    paid --> [*]: Invoice Complete
    cancelled --> [*]: Invoice Cancelled
    
    note right of draft
        Can be edited
        before sending
    end note
    
    note right of partial
        Some payment
        received
    end note
    
    note right of overdue
        Past due date
        and unpaid
    end note
```

## State Transitions

- **draft → sent**: Invoice finalized and sent
- **sent → partial**: First payment received
- **sent → paid**: Full payment received immediately
- **sent → overdue**: Due date passed without payment
- **partial → paid**: Remaining balance paid
- **overdue → paid**: Late payment received

## Automatic Transitions

- **overdue**: Automatically set when due_date passes
- **paid**: Automatically set when amount_due reaches 0

