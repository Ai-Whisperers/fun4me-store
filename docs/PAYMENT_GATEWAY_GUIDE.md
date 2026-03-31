# Payment Gateway Integration Guide

## Overview

The Vete platform now supports multiple payment gateways with a provider-agnostic architecture. This guide covers configuration, usage, and troubleshooting for administrators and developers.

## Architecture

### Provider-Agnostic Design

The payment system uses an abstract provider pattern that allows:
- **Multiple Providers**: Stripe, Bancard, Tigo Money
- **Tenant Configuration**: Each clinic can select their preferred provider
- **Unified Interface**: Consistent API across all payment methods
- **Easy Extension**: New providers can be added without changing core code

### Core Components

1. **PaymentService** (`lib/payments/service.ts`)
   - Orchestrates payment operations
   - Handles provider selection based on tenant configuration
   - Provides unified interface for all payment operations

2. **PaymentProvider Interface** (`lib/payments/abstract-provider.ts`)
   - Abstract base class for all payment providers
   - Defines standard methods: `createPaymentIntent`, `refund`, `verifyWebhook`

3. **Provider Implementations**
   - `StripeProvider` - Credit/debit cards (international)
   - `BancardProvider` - Paraguayan cards
   - `TigoMoneyProvider` - Mobile money QR payments

## Admin Configuration

### Accessing Payment Gateway Settings

1. Navigate to `/dashboard/admin/payment-gateways`
2. Configure providers for your clinic:

#### Stripe Configuration
- **Publishable Key**: Your Stripe publishable key
- **Secret Key**: Your Stripe secret key
- **Webhook Secret**: Stripe webhook secret for verification
- **Status**: Enable/disable Stripe payments

#### Bancard Configuration
- **Public Key**: Bancard public key for your merchant account
- **Private Key**: Bancard private key
- **Environment**: Sandbox (testing) or Production
- **Status**: Enable/disable Bancard payments

#### Tigo Money Configuration
- **API Key**: Tigo Money API key
- **API Secret**: Tigo Money API secret
- **Environment**: Sandbox (testing) or Production
- **Status**: Enable/disable Tigo Money payments

### Tenant Provider Selection

Each clinic can set their preferred payment provider:
- Go to Settings → Payment Configuration
- Select default provider from dropdown
- Configure provider-specific settings
- Save to apply changes

## Developer Integration

### Using the PaymentWrapper Component

The new `PaymentWrapper` component provides a provider-agnostic interface:

```tsx
import { PaymentWrapper } from '@/components/payments/PaymentWrapper'

function CheckoutForm({ tenantId, amount, onSuccess, onCancel }) {
  return (
    <PaymentWrapper
      tenantId={tenantId}
      amount={amount}
      currency="PYG"
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}
```

### Payment Service Usage

For custom payment flows, use the payment service directly:

```tsx
import { getPaymentService } from '@/lib/payments/service'

async function handlePayment() {
  const paymentService = getPaymentService()
  
  const result = await paymentService.createPaymentIntent({
    amount: 50000, // Amount in smallest currency unit (cents for PYG)
    currency: 'PYG',
    tenantId: 'clinic-123',
    description: 'Payment for services'
  })
  
  if (result.success) {
    // Handle payment intent
    const { clientSecret, provider } = result.data
    console.log(`Payment created with ${provider}`)
  } else {
    // Handle error
    console.error('Payment failed:', result.error)
  }
}
```

### Checkout Integration

The checkout flow automatically uses the tenant's preferred provider:

1. **Cart Validation**: Items and stock checked
2. **Payment Intent**: Created using tenant's provider
3. **Provider UI**: Appropriate payment form displayed
4. **Confirmation**: Payment processed and webhook handled

## Provider-Specific Details

### Stripe
- **Supported Cards**: Visa, Mastercard, Amex, Discover
- **Currencies**: PYG, USD, and all Stripe-supported currencies
- **Webhook**: Handles all Stripe event types
- **3D Secure**: Supported when required by card

### Bancard
- **Supported Cards**: Visa, Mastercard, American Express (Paraguay)
- **Currency**: PYG (Guarani)
- **Processing**: Redirect-based payment flow
- **Verification**: Real-time card validation

### Tigo Money
- **Method**: QR code mobile payment
- **Currency**: PYG (Guarani)
- **Process**: User scans QR with Tigo Money app
- **Confirmation**: Automatic webhook confirmation

## Troubleshooting

### Common Issues

#### Payment Intent Creation Failed
**Symptoms**: Error creating payment intent
**Solutions**:
- Check provider API keys are correct
- Verify provider is enabled for the tenant
- Check network connectivity to provider endpoints
- Review tenant configuration in admin settings

#### Provider Not Available
**Symptoms**: "Payment method not configured" message
**Solutions**:
- Configure provider settings in `/dashboard/admin/payment-gateways`
- Ensure provider is enabled
- Save configuration changes
- Clear browser cache and retry

#### Stripe 3D Secure Issues
**Symptoms**: 3D Secure verification fails
**Solutions**:
- Verify Stripe 3D Secure settings in dashboard
- Check card supports 3D Secure
- Ensure return URLs are correctly configured
- Test with different browsers

#### Bancard Redirect Issues
**Symptoms**: Redirect to Bancard fails
**Solutions**:
- Verify Bancard account is active
- Check return URL configuration
- Ensure private/public key pair match
- Test in sandbox environment first

#### Tigo Money QR Not Loading
**Symptoms**: QR code doesn't display
**Solutions**:
- Verify Tigo Money API credentials
- Check currency is set to PYG
- Ensure amount is in correct format
- Check API rate limits and retry timing

### Webhook Issues

#### Stripe Webhook Not Firing
**Solutions**:
- Verify webhook endpoint URL: `/api/webhooks/payments/stripe`
- Check webhook secret matches Stripe configuration
- Ensure webhook is enabled in Stripe dashboard
- Test with Stripe CLI webhook tool

#### Bancard Webhook Errors
**Solutions**:
- Verify webhook URL: `/api/webhooks/payments/bancard`
- Check IP whitelist in Bancard settings
- Ensure webhook signature verification
- Review Bancard webhook documentation

#### Tigo Money Webhook Timeout
**Solutions**:
- Check webhook response is under 30 seconds
- Verify API credentials are current
- Implement retry logic for failed webhooks
- Monitor Tigo Money service status

### Testing Checklist

#### Before Going Live
- [ ] Test all enabled providers in sandbox mode
- [ ] Verify webhook endpoints receive events correctly
- [ ] Test successful payment flow end-to-end
- [ ] Test failed payment scenarios
- [ ] Verify currency conversion accuracy
- [ ] Check tenant isolation (clinics don't interfere)

#### Production Deployment
- [ ] Switch providers to production environment
- [ ] Update webhook URLs to production endpoints
- [ ] Verify SSL certificates are valid
- [ ] Monitor initial transactions for errors
- [ ] Test refund process if applicable

## API Reference

### Payment Endpoints

#### Create Payment Intent
```http
POST /api/store/checkout
Content-Type: application/json
Authorization: Bearer <user-token>

{
  "items": [...],
  "clinic": "clinic-slug"
}
```

#### Webhook Endpoints
- Stripe: `/api/webhooks/payments/stripe`
- Bancard: `/api/webhooks/payments/bancard`
- Tigo Money: `/api/webhooks/payments/tigo_money`

### Response Formats

#### Success Response
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_123...",
    "clientSecret": "pi_123_secret_...",
    "provider": "stripe",
    "amount": 50000,
    "currency": "PYG"
  },
  "invoice": {
    "id": "inv_123",
    "invoice_number": "INV-2024-001",
    "total": 50000
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Payment method not configured",
  "code": "PAYMENT_PROVIDER_ERROR"
}
```

## Security Considerations

### API Key Management
- Store provider keys securely in environment variables
- Never expose keys in client-side code
- Rotate keys regularly
- Use different keys for sandbox and production

### Webhook Security
- Verify webhook signatures for all providers
- Use HTTPS for webhook endpoints
- Implement rate limiting on webhook endpoints
- Log all webhook events for audit trails

### PCI Compliance
- Never store raw card data on your servers
- Use provider's hosted payment forms when possible
- Ensure SSL/TLS is properly configured
- Follow PCI DSS requirements for card handling

## Support

### Getting Help
For payment gateway issues:
1. Check the troubleshooting section above
2. Review provider-specific documentation
3. Check system logs for error details
4. Contact support with provider name and error details

### Provider Documentation
- [Stripe Documentation](https://stripe.com/docs)
- [Bancard Developer Portal](https://vpos.infonet.com.py)
- [Tigo Money API Docs](https://developer.tigo.com)

### Monitoring
Monitor these metrics:
- Payment success rates by provider
- Webhook processing times
- Error rates and common error types
- Revenue processing latency

## Future Enhancements

### Planned Features
- Support for additional local payment methods
- Advanced fraud detection
- Subscription management integration
- Multi-currency support optimization
- Advanced analytics dashboard

### Extension Points
The payment system is designed for easy extension:
1. Implement new provider class extending `AbstractPaymentProvider`
2. Add provider to factory in `lib/payments/factory.ts`
3. Add provider configuration to types
4. Update admin interface to support new provider

---

*Last updated: January 2026*