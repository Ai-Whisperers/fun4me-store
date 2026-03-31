# FEAT-024 Payment Processing Integration

## Priority: P0

## Category: Feature

## Status: Not Started

## Epic: [EPIC-15: Integration Expansion](../epics/EPIC-15-integration-expansion.md)

## Description

The store checkout creates invoices but **no actual payment is collected**. Orders are created with `status: pending` and stay that way indefinitely. For the store to be functional, we need to integrate payment processing.

### Current State

- Checkout creates invoice and order records
- No payment method selection
- No payment gateway integration
- Orders sit as "pending" forever
- No Stripe, Mercado Pago, or local payment integration

### Paraguay Market Payment Methods

| Method | Provider | Priority | Notes |
|--------|----------|----------|-------|
| Credit/Debit Cards | Bancard | P0 | Main card processor in Paraguay |
| Mobile Money | Tigo Money | P1 | Popular mobile payment |
| Bank Transfer | Manual | P1 | Already partially implemented |
| Cash on Delivery | N/A | P2 | For local delivery |

## Proposed Solution

### Phase 1: Stripe Integration (International)

```typescript
// web/app/api/store/checkout/payment-intent/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const { amount, currency, orderId } = await request.json()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),  // Convert to cents
    currency: currency.toLowerCase(),
    metadata: { orderId },
    automatic_payment_methods: { enabled: true },
  })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret
  })
}
```

### Phase 2: Bancard Integration (Paraguay)

```typescript
// web/lib/payments/bancard.ts
export async function createBancardPayment(params: {
  amount: number
  orderId: string
  returnUrl: string
}) {
  const response = await fetch('https://vpos.infonet.com.py/vpos/api/0.3/single_buy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BANCARD_API_KEY}`,
    },
    body: JSON.stringify({
      public_key: process.env.BANCARD_PUBLIC_KEY,
      operation: {
        token: crypto.randomUUID(),
        shop_process_id: params.orderId,
        amount: params.amount.toString(),
        currency: 'PYG',
        additional_data: '',
        description: `Pedido ${params.orderId}`,
        return_url: params.returnUrl,
        cancel_url: `${params.returnUrl}?cancelled=true`,
      }
    })
  })

  return response.json()
}
```

### Checkout Flow Changes

```typescript
// web/app/[clinic]/cart/checkout/client.tsx
const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'cash'>('card')

// After creating order, process payment
const handleCheckout = async () => {
  // 1. Create order (existing)
  const orderResult = await createOrder(items)

  // 2. Process payment based on method
  if (paymentMethod === 'card') {
    // Redirect to Stripe/Bancard
    const { clientSecret } = await createPaymentIntent(orderResult.orderId, total)
    // Use Stripe Elements to complete payment
  } else if (paymentMethod === 'transfer') {
    // Show bank details, mark as pending_transfer
  } else {
    // Cash on delivery - confirm order
  }
}
```

### Database Changes

```sql
-- Add payment tracking to store_orders
ALTER TABLE store_orders ADD COLUMN payment_provider TEXT;
ALTER TABLE store_orders ADD COLUMN payment_id TEXT;
ALTER TABLE store_orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE store_orders ADD COLUMN paid_at TIMESTAMPTZ;

-- Payment attempts log
CREATE TABLE store_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES store_orders(id),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Implementation Steps

1. [ ] Add Stripe SDK and environment variables
2. [ ] Create payment intent API endpoint
3. [ ] Add Stripe Elements to checkout page
4. [ ] Add payment method selector UI
5. [ ] Create webhook handler for payment confirmation
6. [ ] Update order status on successful payment
7. [ ] Add payment confirmation email
8. [ ] Create refund flow for cancelled orders
9. [ ] Add Bancard integration (Phase 2)
10. [ ] Add Tigo Money integration (Phase 3)

## Acceptance Criteria

- [ ] User can select payment method at checkout
- [ ] Card payments processed via Stripe/Bancard
- [ ] Order status updates to 'confirmed' on successful payment
- [ ] Failed payments show clear error message
- [ ] Payment attempts logged for audit
- [ ] Webhook handles async payment confirmations
- [ ] Email sent on successful payment
- [ ] Refund flow works for cancellations

## Related Files

- `web/app/[clinic]/cart/checkout/client.tsx`
- `web/app/api/store/checkout/route.ts`
- `web/app/api/webhooks/stripe/route.ts` (create)
- `web/lib/payments/` (create)

## Estimated Effort

40-60 hours (full implementation with testing)

## Dependencies

- Stripe account and API keys
- Bancard merchant account (for Paraguay)
- SSL certificate (required for payment processing)

## Security Considerations

- Never log full card numbers
- Use webhook signature verification
- Store only tokenized payment references
- PCI DSS compliance considerations
