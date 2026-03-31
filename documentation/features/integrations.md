# External Integrations

WhatsApp messaging via Twilio and email notification systems.

> **WhatsApp**: `web/lib/whatsapp/`, `web/components/whatsapp/`
> **Email**: `web/lib/email-templates.ts`
> **Last Updated**: January 2026

---

## Overview

| Integration | Provider | Use Cases |
|-------------|----------|-----------|
| WhatsApp | Twilio | Client messaging, reminders, templates |
| Email | Supabase Auth | Appointment confirmations, notifications |

---

## WhatsApp Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard UI                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ ConversationList │ MessageThread  │ TemplateManager  │  │
│  │              │  │              │  │                   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
│  ├── /api/whatsapp                GET conversations          │
│  ├── /api/whatsapp/send           POST send message          │
│  ├── /api/whatsapp/templates      GET/POST templates         │
│  └── /api/whatsapp/webhook        POST receive (Twilio)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Twilio WhatsApp API                        │
│  sendWhatsAppMessage() → Twilio Messages API                 │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886  # Sandbox or registered number
```

### Client Library

```typescript
import { sendWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsapp/client'

// Check if configured
if (!isWhatsAppConfigured()) {
  console.log('WhatsApp not configured')
}

// Send message
const result = await sendWhatsAppMessage({
  to: '0981123456',       // Paraguay format, auto-converted
  body: 'Hola! Tu cita es mañana a las 10:00',
  mediaUrl: 'https://...'  // Optional image
})

if (result.success) {
  console.log('Message SID:', result.sid)
  console.log('Status:', result.status)
} else {
  console.error('Error:', result.error)
}
```

### Phone Number Formatting

```typescript
import { formatParaguayPhone, formatPhoneDisplay } from '@/lib/types/whatsapp'

// International format for API
formatParaguayPhone('0981123456')     // '+595981123456'
formatParaguayPhone('595981123456')   // '+595981123456'

// Display format for UI
formatPhoneDisplay('+595981123456')   // '0981 123 456'
```

### Message Templates

```typescript
import { fillTemplateVariables, extractTemplateVariables } from '@/lib/types/whatsapp'

const template = 'Hola {{client_name}}! {{pet_name}} tiene cita el {{date}}.'

// Extract variables
const vars = extractTemplateVariables(template)
// ['client_name', 'pet_name', 'date']

// Fill template
const message = fillTemplateVariables(template, {
  client_name: 'María',
  pet_name: 'Luna',
  date: '15 de enero'
})
// 'Hola María! Luna tiene cita el 15 de enero.'
```

### Default Templates

```typescript
import { defaultWhatsAppTemplates } from '@/lib/types/whatsapp'

// Pre-built templates:
// - Recordatorio de cita
// - Vacuna próxima
// - Confirmación de cita
// - Mensaje de bienvenida

const reminderTemplate = defaultWhatsAppTemplates.find(
  t => t.category === 'appointment_reminder'
)
```

### TypeScript Types

```typescript
type MessageDirection = 'inbound' | 'outbound'
type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
type ConversationType = 'appointment_reminder' | 'vaccine_reminder' | 'general' | 'support'

interface WhatsAppMessage {
  id: string
  tenant_id: string
  client_id?: string | null
  phone_number: string
  direction: MessageDirection
  content: string
  media_url?: string | null
  status: MessageStatus
  twilio_sid?: string | null
  conversation_type?: ConversationType | null
  error_message?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  read_at?: string | null
  created_at: string
}

interface WhatsAppTemplate {
  id: string
  tenant_id: string
  name: string
  content: string
  variables: string[]
  category?: ConversationType | null
  is_active: boolean
}

interface WhatsAppConversation {
  phone_number: string
  client_id?: string | null
  client_name?: string
  last_message: string
  last_message_at: string
  direction: MessageDirection
  unread_count: number
  messages?: WhatsAppMessage[]
}
```

### UI Components

```typescript
// components/whatsapp/index.ts exports:
export * from './conversation-list'    // List of conversations
export * from './message-thread'       // Full conversation view
export * from './message-bubble'       // Single message display
export * from './quick-send'           // Quick message composer
export * from './template-selector'    // Template picker
export * from './conversation-header'  // Header with client info
export * from './message-input'        // Message composer
export * from './inbox'                // Combined inbox view
export * from './template-manager'     // Template CRUD
```

### Status Configuration

```typescript
import { messageStatusConfig, templateCategoryConfig } from '@/lib/types/whatsapp'

// Message status display
messageStatusConfig.delivered
// { label: 'Entregado', icon: 'check-check', className: 'text-blue-500' }

// Template category display
templateCategoryConfig.appointment_reminder
// { label: 'Recordatorio de cita', icon: 'calendar', color: 'blue' }
```

### Twilio Webhook

Receive incoming WhatsApp messages:

```typescript
// app/api/whatsapp/webhook/route.ts
import type { TwilioWhatsAppWebhook } from '@/lib/types/whatsapp'

export async function POST(request: NextRequest) {
  const body = await request.formData()

  const webhook: TwilioWhatsAppWebhook = {
    MessageSid: body.get('MessageSid') as string,
    From: body.get('From') as string,       // 'whatsapp:+595...'
    To: body.get('To') as string,
    Body: body.get('Body') as string,
    NumMedia: body.get('NumMedia') as string,
    MediaUrl0: body.get('MediaUrl0') as string,
  }

  // Store inbound message in database
  // Match to client by phone number
  // Create/update conversation

  return new Response('OK', { status: 200 })
}
```

---

## Email Integration

### Email Templates

```typescript
import { generateAppointmentConfirmationEmail } from '@/lib/email-templates'

const emailBody = generateAppointmentConfirmationEmail({
  userName: 'María García',
  petName: 'Luna',
  reason: 'Vacunación anual',
  dateTime: '15 de enero de 2026 a las 10:00',
  clinicName: 'Veterinaria Adris'
})

// Returns formatted plain text email:
// Hola María García,
//
// Tu cita ha sido agendada con éxito:
//
// Mascota: Luna
// Motivo: Vacunación anual
// Fecha y Hora: 15 de enero de 2026 a las 10:00
// Clínica: Veterinaria Adris
//
// ¡Gracias por confiar en nosotros!
//
// Saludos,
// El equipo de la Clínica Veterinaria
```

### Sending Emails

Emails are sent via Supabase Auth's email service or custom SMTP:

```typescript
// Via Supabase Auth (for auth-related emails)
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${baseUrl}/reset-password`
})

// Via custom service (for transactional emails)
// Implementation depends on email provider (SendGrid, Resend, etc.)
```

---

## Database Tables

### WhatsApp Messages

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id UUID REFERENCES profiles(id),
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  media_url TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  twilio_sid TEXT,
  conversation_type TEXT,
  related_id UUID,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_tenant_phone ON whatsapp_messages(tenant_id, phone_number);
CREATE INDEX idx_whatsapp_client ON whatsapp_messages(client_id);
```

### WhatsApp Templates

```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Best Practices

### DO

- Validate phone numbers before sending
- Store message history for compliance
- Use templates for consistent messaging
- Handle webhook failures gracefully
- Respect messaging windows (24h for user-initiated)

### DON'T

- Send messages without user consent
- Store Twilio credentials in code
- Ignore delivery failures
- Send sensitive medical info without encryption
- Spam users with excessive messages

---

## Related Documentation

- [Cron Jobs](../development/cron-jobs.md) - Automated reminders
- [API Overview](../api/overview.md#messaging)
- [Notifications System](../architecture/context-providers.md#notification-context)
