# Payment Gateway Admin Interface

## Overview

The Payment Gateway Admin interface provides a comprehensive dashboard for configuring payment providers per clinic. Access it at `/dashboard/admin/payment-gateways`.

## Features

### Multi-Provider Support
- **Stripe**: International card payments with 3D Secure
- **Bancard**: Paraguayan local card processing
- **Tigo Money**: Mobile money QR code payments
- **Mock**: Test provider for development and testing

### Tenant Configuration
Each clinic can configure their preferred payment provider independently:
- Set default provider per clinic
- Configure provider-specific credentials
- Enable/disable providers as needed
- Test configuration before going live

### Provider Settings

#### General Settings
- **Default Provider**: Choose which provider to use by default
- **Currency Selection**: Set default currency (PYG, USD, etc.)
- **Test Mode**: Enable sandbox/testing mode

#### Stripe Configuration
- **Publishable Key**: Client-side Stripe key for Elements
- **Secret Key**: Server-side Stripe key for API calls
- **Webhook Secret**: Secret for verifying Stripe webhooks
- **3D Secure**: Enable/disable 3D Secure verification

#### Bancard Configuration
- **Public Key**: Bancard public key for merchant
- **Private Key**: Bancard private key for API authentication
- **Environment**: Sandbox or Production mode
- **Merchant ID**: Unique merchant identifier

#### Tigo Money Configuration
- **API Key**: Tigo Money API authentication
- **API Secret**: Tigo Money API secret
- **Environment**: Sandbox or Production mode
- **Merchant Code**: Tigo Money merchant identifier

## Using the Interface

### Accessing Settings

1. **Navigate**: Go to `/dashboard/admin/payment-gateways`
2. **Select Provider**: Click on the provider tab you want to configure
3. **Fill Configuration**: Enter your provider credentials and settings
4. **Test Connection**: Use "Test Connection" to verify credentials
5. **Save**: Click "Save Changes" to apply configuration
6. **Set Default**: Choose which provider should be the default

### Configuration Tabs

#### General Tab
- Set the default payment provider for your clinic
- Configure currency preferences
- Enable/disable test mode for development
- View current provider status

#### Provider Tabs
Each payment provider has its own configuration tab:
- **Stripe**: Configure Stripe keys and webhook settings
- **Bancard**: Set up Bancard merchant credentials
- **Tigo Money**: Configure Tigo Money API access
- **Mock**: Development and testing options

### Status Indicators

The interface shows real-time status for each provider:
- **Connected**: Provider is properly configured and accessible
- **Error**: Configuration issues or connectivity problems
- **Disabled**: Provider is turned off
- **Testing**: Provider is in sandbox/test mode

## Security Features

### Credential Storage
- All API keys and secrets are encrypted in the database
- Environment variables used for production deployments
- Audit logging tracks configuration changes

### Access Control
- Only users with `admin` role can access payment settings
- Configuration changes are logged with user attribution
- API endpoints require authentication and tenant validation

### Testing Tools

#### Connection Testing
- **Test Button**: Verify provider API connectivity
- **Test Payment**: Create a small test transaction
- **Webhook Testing**: Verify webhook endpoint accessibility
- **Status Display**: Real-time connection status

#### Sandbox Mode
- **Stripe Test**: Uses Stripe test keys and endpoints
- **Bancard Sandbox**: Uses Bancard testing environment
- **Tigo Money Test**: Uses Tigo Money sandbox APIs
- **No Real Charges**: Test mode doesn't process real payments

## Troubleshooting

### Connection Issues
**Problem**: "Connection failed" error
**Solutions**:
- Verify API keys are correct and current
- Check network connectivity to provider endpoints
- Ensure provider account is active and in good standing
- Try disabling and re-enabling the provider

### Credential Errors
**Problem**: "Invalid credentials" message
**Solutions**:
- Copy keys directly from provider dashboard
- Remove any extra spaces or characters
- Check if keys are for correct environment (sandbox vs production)
- Verify provider account permissions

### Webhook Issues
**Problem**: Webhook verification failures
**Solutions**:
- Copy webhook secret exactly from provider dashboard
- Ensure webhook URL is publicly accessible
- Check that server clock is synchronized
- Test webhook using provider's testing tools

## Best Practices

### Provider Selection
- **Stripe**: Best for international customers and online sales
- **Bancard**: Ideal for Paraguayan market and local cards
- **Tigo Money**: Perfect for mobile-first customers
- **Mock**: Only for development and testing environments

### Configuration Management
- **Document Changes**: Keep records of configuration updates
- **Backup Settings**: Export configuration before major changes
- **Test First**: Always test in sandbox before production
- **Monitor Logs**: Regularly check error logs and webhook events

### Security Practices
- **Rotate Keys**: Regularly update provider API keys
- **Limit Access**: Only authorized administrators should configure payments
- **Audit Regularly**: Review configuration changes and access logs
- **Use HTTPS**: Ensure all webhook endpoints use SSL/TLS

## Integration with Other Systems

### POS Integration
The payment gateway integrates with:
- **Store Checkout**: E-commerce cart and product checkout
- **Invoice System**: Pay outstanding invoices directly
- **Subscription Billing**: Recurring payment processing
- **Point of Sale**: In-clinic payment terminals

### Reporting
Payment transaction data is available through:
- **Transaction History**: All payment attempts and results
- **Provider Performance**: Success rates and processing times
- **Revenue Analytics**: Payment volume and trends by provider
- **Error Tracking**: Detailed error logs and failure reasons

## Support and Resources

### Documentation Links
- [Admin Guide](./PAYMENT_GATEWAY_GUIDE.md) - Comprehensive integration guide
- [API Reference](./API_REFERENCE.md) - Technical API documentation
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

### Provider Support
- **Stripe**: https://support.stripe.com
- **Bancard**: https://soporte.bancard.com.py
- **Tigo Money**: https://ayuda.tigo.com.py

### Getting Help
For admin interface issues:
1. Check browser console for JavaScript errors
2. Verify user has admin permissions
3. Test with different browsers if needed
4. Contact platform support with screenshots and error details

---

*Last updated: January 2026*