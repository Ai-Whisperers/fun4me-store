# FEAT-025 Shipping Address and Delivery Flow

## Priority: P0

## Category: Feature

## Status: Not Started

## Epic: [EPIC-09: Feature Expansion](../epics/EPIC-09-feature-expansion.md)

## Description

The store checkout does not collect shipping addresses or delivery method selection. Physical products cannot be fulfilled because there's no way to know where to ship them. The "free delivery" messaging is misleading since shipping isn't implemented.

### Current State

- No shipping address collection
- No delivery method selection
- No shipping cost calculation
- Orders have no delivery information
- "Free delivery" banner exists but is non-functional

### Required Capabilities

1. **Address Collection**: Street, city, neighborhood, reference points
2. **Delivery Methods**: Pickup, standard delivery, express delivery
3. **Shipping Costs**: Per-zone pricing, free shipping thresholds
4. **Delivery Zones**: Define serviceable areas per clinic

## Proposed Solution

### Database Schema

```sql
-- User addresses
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  label TEXT NOT NULL DEFAULT 'Casa',  -- Casa, Trabajo, Otro
  street_address TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT NOT NULL DEFAULT 'Asunción',
  department TEXT DEFAULT 'Central',
  reference TEXT,  -- "Frente al supermercado"
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery zones per tenant
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,  -- "Centro", "Zona Norte"
  neighborhoods TEXT[],  -- List of covered neighborhoods
  base_cost NUMERIC DEFAULT 0,
  free_shipping_threshold NUMERIC,  -- Free shipping above this amount
  estimated_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- Add to store_orders
ALTER TABLE store_orders ADD COLUMN shipping_address_id UUID REFERENCES user_addresses(id);
ALTER TABLE store_orders ADD COLUMN delivery_method TEXT;  -- 'pickup', 'standard', 'express'
ALTER TABLE store_orders ADD COLUMN shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE store_orders ADD COLUMN delivery_zone_id UUID REFERENCES delivery_zones(id);
ALTER TABLE store_orders ADD COLUMN estimated_delivery_date DATE;
```

### Checkout Flow Changes

```typescript
// Step 1: Show saved addresses or add new
const AddressSelector = ({ onSelect }) => {
  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => fetch('/api/user/addresses').then(r => r.json())
  })

  return (
    <div>
      {addresses?.map(addr => (
        <AddressCard key={addr.id} address={addr} onSelect={onSelect} />
      ))}
      <AddNewAddressButton />
    </div>
  )
}

// Step 2: Show delivery options based on address
const DeliveryOptions = ({ address, subtotal }) => {
  const { data: options } = useQuery({
    queryKey: ['delivery-options', address.neighborhood],
    queryFn: () => fetch(`/api/store/delivery-options?neighborhood=${address.neighborhood}`).then(r => r.json())
  })

  return (
    <RadioGroup>
      {options?.map(opt => (
        <DeliveryOption
          key={opt.id}
          name={opt.name}
          cost={subtotal >= opt.freeThreshold ? 0 : opt.baseCost}
          estimatedDays={opt.estimatedDays}
        />
      ))}
      <PickupOption clinic={clinic} />
    </RadioGroup>
  )
}
```

### Address Form Component

```typescript
// web/components/checkout/address-form.tsx
const addressSchema = z.object({
  label: z.enum(['Casa', 'Trabajo', 'Otro']),
  street_address: z.string().min(5, 'Dirección muy corta'),
  neighborhood: z.string().min(2),
  city: z.string().default('Asunción'),
  department: z.string().default('Central'),
  reference: z.string().optional(),
  phone: z.string().regex(/^09\d{8}$/, 'Formato: 09XXXXXXXX'),
})

export function AddressForm({ onSubmit, initialValues }) {
  // Form implementation with Paraguay-specific validations
}
```

## Implementation Steps

1. [ ] Create `user_addresses` table with migration
2. [ ] Create `delivery_zones` table with migration
3. [ ] Add shipping columns to `store_orders`
4. [ ] Create address CRUD API endpoints
5. [ ] Create delivery options API endpoint
6. [ ] Build AddressSelector component
7. [ ] Build AddressForm component
8. [ ] Build DeliveryOptions component
9. [ ] Integrate into checkout flow
10. [ ] Add shipping cost to order total calculation
11. [ ] Update order confirmation to show delivery info
12. [ ] Add delivery tracking fields

## Acceptance Criteria

- [ ] User can save multiple addresses
- [ ] User can select saved address at checkout
- [ ] User can add new address during checkout
- [ ] Delivery options shown based on address
- [ ] Shipping cost calculated correctly
- [ ] Free shipping applied when threshold met
- [ ] Pickup option available for local orders
- [ ] Order confirmation shows delivery address
- [ ] Order shows estimated delivery date

## Related Files

- `web/app/[clinic]/cart/checkout/client.tsx`
- `web/app/api/user/addresses/route.ts` (create)
- `web/app/api/store/delivery-options/route.ts` (create)
- `web/components/checkout/` (create)

## Estimated Effort

24-32 hours

## Paraguay-Specific Considerations

- Most addresses use barrio (neighborhood) as primary locator
- Reference points are crucial ("frente a..." patterns)
- Phone format: 09XXXXXXXX (10 digits, starts with 09)
- Main cities: Asunción, Fernando de la Mora, San Lorenzo, Luque
- Department system (Central, Alto Paraná, etc.)
