# INT-001: Additional Payment Gateway Integration

## Priority: P2
## Category: Integrations
## Status: Not Started
## Epic: [EPIC-15: Integration Expansion](../epics/EPIC-15-integration-expansion.md)

## Description
Integrate additional payment gateways beyond Stripe to support local payment methods popular in Paraguay and Latin America.

## Current State
- Stripe integration exists for cards
- No local payment methods (Paraguay)
- Bank transfers tracked manually
- No PIX/QR payment support

## Proposed Solution

### Payment Provider Abstraction
```typescript
// lib/payments/provider.ts
interface PaymentProvider {
  name: string;
  createPayment(amount: number, currency: string, metadata: object): Promise<PaymentIntent>;
  confirmPayment(paymentId: string): Promise<PaymentResult>;
  refund(paymentId: string, amount?: number): Promise<RefundResult>;
  webhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// Factory for multi-provider support
export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case 'card':
      return new StripeProvider();
    case 'bancard':
      return new BancardProvider();
    case 'tigo_money':
      return new TigoMoneyProvider();
    default:
      throw new Error(`Unknown payment method: ${method}`);
  }
}
```

### Bancard (Paraguay) Integration
```typescript
// lib/payments/bancard.ts
export class BancardProvider implements PaymentProvider {
  private apiUrl = 'https://vpos.infonet.com.py';

  async createPayment(amount: number, currency: string, metadata: object) {
    const response = await fetch(`${this.apiUrl}/single_buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_key: process.env.BANCARD_PUBLIC_KEY,
        operation: {
          token: generateToken(),
          shop_process_id: metadata.orderId,
          amount: formatAmount(amount, currency),
          currency,
          additional_data: '',
          description: metadata.description,
          return_url: `${process.env.NEXT_PUBLIC_URL}/api/payments/bancard/callback`,
          cancel_url: `${process.env.NEXT_PUBLIC_URL}/payments/cancelled`,
        },
      }),
    });

    return response.json();
  }
}
```

### Tigo Money (Mobile Money)
```typescript
// lib/payments/tigo-money.ts
export class TigoMoneyProvider implements PaymentProvider {
  async createPayment(amount: number, currency: string, metadata: object) {
    // Tigo Money QR payment flow
    const qrData = await this.generateQR({
      amount,
      merchantId: process.env.TIGO_MERCHANT_ID,
      reference: metadata.orderId,
    });

    return {
      id: qrData.transactionId,
      qrCode: qrData.qrImage,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    };
  }
}
```

### Payment Method Selector UI
```tsx
// components/checkout/payment-selector.tsx
export function PaymentMethodSelector({ onSelect }: Props) {
  const methods = [
    { id: 'card', name: 'Tarjeta de Crédito/Débito', icon: CreditCard },
    { id: 'bancard', name: 'Bancard', icon: Bank },
    { id: 'tigo_money', name: 'Tigo Money', icon: Phone },
    { id: 'transfer', name: 'Transferencia Bancaria', icon: Building },
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Método de Pago</h3>
      {methods.map((method) => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          className="flex items-center gap-3 w-full p-4 border rounded-lg hover:border-primary"
        >
          <method.icon className="w-6 h-6" />
          <span>{method.name}</span>
        </button>
      ))}
    </div>
  );
}
```

## Implementation Steps
1. Create payment provider abstraction layer
2. Integrate Bancard (Paraguay cards)
3. Integrate Tigo Money (mobile payments)
4. Add bank transfer tracking
5. Update checkout flow UI
6. Implement webhook handlers
7. Add payment reconciliation reports

## Acceptance Criteria
- [ ] Bancard integration working
- [ ] Tigo Money QR payments working
- [ ] Bank transfer tracking improved
- [ ] Payment method selector UI
- [ ] Webhooks for all providers
- [ ] Reconciliation reports available

## Payment Methods Priority
1. Bancard (high volume, Paraguay standard)
2. Tigo Money (mobile-first market)
3. Personal Pay (emerging)
4. Bank transfers (already manual)

## Related Files
- `lib/payments/` - Payment providers
- `app/api/payments/` - Payment APIs
- `components/checkout/` - Checkout UI
- `app/[clinic]/cart/checkout/` - Checkout flow

## Estimated Effort
- 16 hours
  - Provider abstraction: 2h
  - Bancard integration: 5h
  - Tigo Money: 5h
  - UI updates: 2h
  - Testing: 2h
