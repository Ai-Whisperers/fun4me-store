# Email Module

Email delivery system for the Vete veterinary platform using Resend API.

## Features

- **Resend Integration**: Production email delivery via Resend API
- **Graceful Fallback**: Console logging when API key is not configured
- **Professional Templates**: HTML and plain text versions for all emails
- **Type-Safe**: Full TypeScript support with proper interfaces
- **Multi-Purpose**: Invoice delivery, consent requests, appointment reminders

## Setup

### 1. Install Dependencies

Already installed via `package.json`:

```bash
npm install resend
```

### 2. Configure Environment Variables

Add to your `.env.local`:

```env
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Custom "From" address (must be verified in Resend)
EMAIL_FROM=noreply@yourveterinaryclinic.com

# Required: Base URL for email links
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Important Notes:**

- If `RESEND_API_KEY` is not set, emails will be logged to console instead of sent
- The `EMAIL_FROM` address must be verified in your Resend account
- Default `EMAIL_FROM` is `noreply@veterinaria.com` (update for production)

### 3. Verify Domain in Resend

Before sending production emails:

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain
3. Configure DNS records (SPF, DKIM, DMARC)
4. Verify the domain

## Usage

### Basic Email Sending

```typescript
import { sendEmail } from '@/lib/email/client'

const result = await sendEmail({
  to: 'owner@example.com',
  subject: 'Test Email',
  html: '<p>Hello from Vete!</p>',
  text: 'Hello from Vete!',
})

if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Email failed:', result.error)
}
```

### Using Templates

#### Invoice Email

```typescript
import { sendEmail } from '@/lib/email/client'
import { generateInvoiceEmail, generateInvoiceEmailText } from '@/lib/email/templates/invoice-email'

const emailData = {
  clinicName: 'Veterinaria Adris',
  ownerName: 'Juan Pérez',
  petName: 'Max',
  invoiceNumber: 'INV-2024-001',
  invoiceDate: '2024-01-15',
  dueDate: '2024-02-15',
  subtotal: 150000,
  taxRate: 10,
  taxAmount: 15000,
  total: 165000,
  amountPaid: 0,
  amountDue: 165000,
  items: [
    {
      description: 'Consulta general',
      quantity: 1,
      unitPrice: 100000,
      lineTotal: 100000,
    },
    {
      description: 'Vacuna Rabia',
      quantity: 1,
      unitPrice: 50000,
      lineTotal: 50000,
    },
  ],
  paymentInstructions: 'Efectivo, transferencia o tarjeta',
  viewUrl: 'https://yourdomain.com/terrapet/portal/invoices/123',
}

const html = generateInvoiceEmail(emailData)
const text = generateInvoiceEmailText(emailData)

await sendEmail({
  to: 'owner@example.com',
  subject: `Factura ${emailData.invoiceNumber} - ${emailData.clinicName}`,
  html,
  text,
})
```

#### Consent Request Email

```typescript
import { sendEmail } from '@/lib/email/client'
import {
  generateConsentRequestEmail,
  generateConsentRequestEmailText,
} from '@/lib/email/templates/consent-request'

const emailData = {
  clinicName: 'Veterinaria Adris',
  ownerName: 'María González',
  petName: 'Luna',
  consentType: 'Cirugía de Esterilización',
  consentCategory: 'surgery',
  signingLink: 'https://yourdomain.com/consent/abc123',
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  requestedBy: 'Dr. Alejandro',
  additionalMessage: 'Por favor revisa el documento antes de la cirugía programada.',
}

const html = generateConsentRequestEmail(emailData)
const text = generateConsentRequestEmailText(emailData)

await sendEmail({
  to: 'owner@example.com',
  subject: `Solicitud de Consentimiento - ${emailData.consentType}`,
  html,
  text,
})
```

#### Appointment Reminder Email

```typescript
import { sendEmail } from '@/lib/email/client'
import {
  generateAppointmentReminderEmail,
  generateAppointmentReminderEmailText,
} from '@/lib/email/templates/appointment-reminder'

const emailData = {
  clinicName: 'Veterinaria Adris',
  clinicAddress: 'Av. Principal 123, Asunción',
  clinicPhone: '+595 21 123456',
  clinicEmail: 'info@terrapet.com',
  ownerName: 'Carlos Ramírez',
  petName: 'Bobby',
  petSpecies: 'Perro',
  appointmentDate: '2024-01-20',
  appointmentTime: '14:30',
  serviceName: 'Control de Vacunación',
  duration: 30,
  vetName: 'Dra. Ana López',
  specialInstructions: 'Por favor trae la cartilla de vacunación.',
  confirmationUrl: 'https://yourdomain.com/appointments/confirm/123',
  rescheduleUrl: 'https://yourdomain.com/appointments/reschedule/123',
  cancellationUrl: 'https://yourdomain.com/appointments/cancel/123',
}

const html = generateAppointmentReminderEmail(emailData)
const text = generateAppointmentReminderEmailText(emailData)

await sendEmail({
  to: 'owner@example.com',
  subject: `Recordatorio de Cita - ${emailData.appointmentDate}`,
  html,
  text,
})
```

## API Reference

### `sendEmail(options: EmailOptions): Promise<EmailResult>`

Send an email via Resend or log to console if not configured.

**Options:**

```typescript
interface EmailOptions {
  to: string | string[] // Recipient email(s)
  subject: string // Email subject
  html: string // HTML content
  text?: string // Plain text version (optional but recommended)
  from?: string // From address (defaults to EMAIL_FROM env var)
  replyTo?: string // Reply-to address
  cc?: string | string[] // CC recipients
  bcc?: string | string[] // BCC recipients
}
```

**Returns:**

```typescript
interface EmailResult {
  success: boolean // Whether email was sent successfully
  error?: string // Error message if failed
  messageId?: string // Resend message ID if successful
}
```

### `isEmailConfigured(): boolean`

Check if Resend API key is configured.

```typescript
import { isEmailConfigured } from '@/lib/email/client'

if (isEmailConfigured()) {
  console.log('Email service is ready')
} else {
  console.log('Email service not configured - will use console fallback')
}
```

### `getDefaultFrom(): string`

Get the configured default "from" address.

```typescript
import { getDefaultFrom } from '@/lib/email/client'

console.log('Emails will be sent from:', getDefaultFrom())
```

## Email Templates

All templates generate both HTML and plain text versions.

### Invoice Email Template

**Data Interface:**

```typescript
interface InvoiceEmailData {
  clinicName: string
  clinicLogo?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  ownerName: string
  petName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  amountPaid?: number
  amountDue: number
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    discountPercent?: number
    lineTotal: number
  }>
  notes?: string
  paymentInstructions?: string
  viewUrl?: string
}
```

**Functions:**

- `generateInvoiceEmail(data)` - Returns HTML
- `generateInvoiceEmailText(data)` - Returns plain text

### Consent Request Template

**Data Interface:**

```typescript
interface ConsentRequestEmailData {
  clinicName: string
  clinicLogo?: string
  clinicPhone?: string
  clinicEmail?: string
  ownerName: string
  petName: string
  consentType: string
  consentCategory?: string // 'surgery', 'anesthesia', 'euthanasia', 'treatment'
  signingLink: string
  expiresAt: string
  requestedBy?: string
  additionalMessage?: string
}
```

**Functions:**

- `generateConsentRequestEmail(data)` - Returns HTML
- `generateConsentRequestEmailText(data)` - Returns plain text

### Appointment Reminder Template

**Data Interface:**

```typescript
interface AppointmentReminderEmailData {
  clinicName: string
  clinicLogo?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  ownerName: string
  petName: string
  petSpecies?: string
  petPhotoUrl?: string
  appointmentDate: string
  appointmentTime: string
  serviceName: string
  serviceDescription?: string
  duration?: number
  vetName?: string
  specialInstructions?: string
  confirmationUrl?: string
  cancellationUrl?: string
  rescheduleUrl?: string
}
```

**Functions:**

- `generateAppointmentReminderEmail(data)` - Returns HTML
- `generateAppointmentReminderEmailText(data)` - Returns plain text

## Development Mode

When `RESEND_API_KEY` is not set, emails are logged to console with full details:

```
📧 [Email] FALLBACK MODE - Email not sent (missing RESEND_API_KEY)
═══════════════════════════════════════════════════════════
From: noreply@veterinaria.com
To: owner@example.com
Subject: Factura INV-2024-001
───────────────────────────────────────────────────────────
HTML Content:
<!DOCTYPE html>...
───────────────────────────────────────────────────────────
Text Content:
Veterinaria Adris
...
═══════════════════════════════════════════════════════════
```

This allows development without needing API keys.

## Production Checklist

- [ ] Set `RESEND_API_KEY` in production environment
- [ ] Configure `EMAIL_FROM` with verified domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Verify domain in Resend dashboard
- [ ] Configure SPF, DKIM, and DMARC DNS records
- [ ] Test email delivery to various providers (Gmail, Outlook, etc.)
- [ ] Monitor Resend dashboard for delivery issues

## Troubleshooting

### Emails not sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify the API key in Resend dashboard
3. Check console logs for error messages
4. Ensure `EMAIL_FROM` domain is verified

### Emails going to spam

1. Configure DMARC, SPF, and DKIM records
2. Verify domain in Resend
3. Avoid spam trigger words in subject/content
4. Include plain text version
5. Use a verified sending domain (not free email providers)

### API rate limits

Resend has rate limits based on your plan:

- Free: 100 emails/day
- Pro: 50,000 emails/month

Check [Resend Pricing](https://resend.com/pricing) for details.

## Examples in Codebase

See these files for real-world usage:

- `web/app/actions/invoices.ts` - Invoice email sending
- `web/app/api/consents/requests/route.ts` - Consent request emails
- Future: Appointment reminder cronjob

## Links

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Dashboard](https://resend.com/overview)
