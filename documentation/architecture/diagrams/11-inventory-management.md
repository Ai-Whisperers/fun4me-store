# Inventory Management with WAC

Stock management using Weighted Average Cost (WAC) method.

```mermaid
flowchart TD
    START([Inventory Transaction]) --> TYPE{Transaction Type}
    
    TYPE -->|Purchase| PURCHASE[Purchase Stock]
    TYPE -->|Sale| SALE[Sale Stock]
    TYPE -->|Adjustment| ADJUST[Stock Adjustment]
    TYPE -->|Return| RETURN[Return Stock]
    
    PURCHASE --> GET_CURRENT[Get Current Stock & WAC]
    SALE --> GET_CURRENT
    ADJUST --> GET_CURRENT
    RETURN --> GET_CURRENT
    
    GET_CURRENT --> CALC_QTY[Calculate New Quantity]
    
    CALC_QTY --> CALC_WAC{Is Purchase?}
    CALC_WAC -->|Yes| WAC_FORMULA["WAC = (Current Qty × Current WAC + New Qty × New Cost) / Total Qty"]
    CALC_WAC -->|No| KEEP_WAC[Keep Current WAC]
    
    WAC_FORMULA --> UPDATE[Update Inventory]
    KEEP_WAC --> UPDATE
    
    UPDATE --> LOG[Log Transaction]
    LOG --> CHECK[Check Stock Levels]
    
    CHECK --> ALERT{Below Min Stock?}
    ALERT -->|Yes| NOTIFY[Generate Alert]
    ALERT -->|No| END([Transaction Complete])
    
    NOTIFY --> END
    
    style START fill:#e1f5ff
    style WAC_FORMULA fill:#fbbf24
    style UPDATE fill:#4ade80
    style ALERT fill:#f87171
    style END fill:#4ade80
```

## WAC Calculation Example

```
Initial State:
- Stock: 100 units
- WAC: $10.00 per unit

Purchase:
- New Stock: 50 units at $12.00 per unit

Calculation:
WAC = (100 × $10.00 + 50 × $12.00) / 150
WAC = ($1,000 + $600) / 150
WAC = $1,600 / 150
WAC = $10.67 per unit

Result:
- Stock: 150 units
- WAC: $10.67 per unit
```

## Transaction Types

- **purchase**: Stock in, updates WAC
- **sale**: Stock out, keeps WAC
- **adjustment**: Manual correction
- **return**: Stock back in, keeps WAC

