# INT-003: SMS Provider Integration

## Priority: P2
## Category: Integrations
## Status: Not Started
## Epic: [EPIC-15: Integration Expansion](../epics/EPIC-15-integration-expansion.md)

## Description
Integrate local SMS providers for reliable message delivery in Paraguay, with failover support and delivery tracking.

## Current State
- WhatsApp integration exists (Twilio)
- No dedicated SMS integration
- Reminders limited to WhatsApp/email
- No delivery tracking

## Proposed Solution

### SMS Provider Interface
```typescript
// lib/sms/provider.ts
interface SMSProvider {
  name: string;
  sendSMS(to: string, message: string): Promise<SMSResult>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  getBalance(): Promise<number>;
}

interface SMSResult {
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
  cost?: number;
}

// Provider factory with failover
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const providers = [
    new TigoSMSProvider(),
    new PersonalSMSProvider(),
    new TwilioSMSProvider(),
  ];

  for (const provider of providers) {
    try {
      const result = await provider.sendSMS(to, message);
      if (result.status !== 'failed') {
        await logSMSAttempt(provider.name, to, result);
        return result;
      }
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      continue;
    }
  }

  throw new Error('All SMS providers failed');
}
```

### Tigo SMS (Paraguay)
```typescript
// lib/sms/tigo.ts
export class TigoSMSProvider implements SMSProvider {
  name = 'tigo';
  private apiUrl = 'https://api.tigo.com.py/sms/v1';

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const response = await fetch(`${this.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TIGO_SMS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formatPhoneNumber(to, 'PY'),
        message,
        from: process.env.TIGO_SENDER_ID,
      }),
    });

    const data = await response.json();

    return {
      messageId: data.id,
      status: data.status === 'accepted' ? 'sent' : 'failed',
      cost: data.cost,
    };
  }
}
```

### Personal SMS (Paraguay)
```typescript
// lib/sms/personal.ts
export class PersonalSMSProvider implements SMSProvider {
  name = 'personal';
  private apiUrl = 'https://sms.personal.com.py/api';

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const response = await fetch(`${this.apiUrl}/send`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PERSONAL_SMS_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination: formatPhoneNumber(to, 'PY'),
        text: message,
        sender: 'VETE',
      }),
    });

    return this.parseResponse(response);
  }
}
```

### SMS Template System
```typescript
// lib/sms/templates.ts
export const SMSTemplates = {
  APPOINTMENT_REMINDER: (data: AppointmentData) =>
    `Recordatorio: Cita para ${data.petName} mañana ${data.date} a las ${data.time}. Veterinaria ${data.clinicName}. Confirmar: ${data.confirmUrl}`,

  APPOINTMENT_CONFIRMED: (data: AppointmentData) =>
    `Cita confirmada: ${data.petName} el ${data.date} a las ${data.time}. Veterinaria ${data.clinicName}`,

  VACCINE_REMINDER: (data: VaccineData) =>
    `${data.petName} tiene vacuna pendiente: ${data.vaccineName}. Agenda tu cita: ${data.bookingUrl}`,

  ORDER_SHIPPED: (data: OrderData) =>
    `Tu pedido #${data.orderNumber} ha sido enviado. Seguimiento: ${data.trackingUrl}`,
};

// Character limit check (160 for GSM-7)
export function validateSMSLength(message: string): boolean {
  const gsmLength = countGSMCharacters(message);
  return gsmLength <= 160;
}
```

### Delivery Tracking
```typescript
// app/api/sms/webhook/route.ts
export async function POST(request: NextRequest) {
  const { messageId, status, deliveredAt, errorCode } = await request.json();

  await supabase.from('sms_logs').update({
    delivery_status: status,
    delivered_at: deliveredAt,
    error_code: errorCode,
  }).eq('message_id', messageId);

  // Update reminder status if applicable
  if (status === 'delivered') {
    await supabase.from('reminders')
      .update({ status: 'delivered' })
      .eq('sms_message_id', messageId);
  }

  return NextResponse.json({ received: true });
}
```

## Implementation Steps
1. Research Paraguay SMS providers (Tigo, Personal, Claro)
2. Create SMS provider abstraction
3. Integrate Tigo SMS
4. Integrate Personal SMS
5. Implement failover logic
6. Add delivery tracking webhooks
7. Create SMS analytics dashboard

## Acceptance Criteria
- [ ] Tigo SMS integrated
- [ ] Personal SMS integrated
- [ ] Failover working
- [ ] Delivery tracking
- [ ] SMS templates ready
- [ ] Balance monitoring

## SMS Provider Comparison
| Provider | Coverage | Cost/SMS | API Quality |
|----------|----------|----------|-------------|
| Tigo | 40% Paraguay | ~500 Gs | Good |
| Personal | 35% Paraguay | ~550 Gs | Medium |
| Twilio | International | ~$0.05 | Excellent |

## Related Files
- `lib/sms/` - SMS providers
- `lib/reminders/` - Reminder system
- `app/api/sms/` - SMS webhooks

## Estimated Effort
- 12 hours
  - Provider research: 2h
  - Tigo integration: 3h
  - Personal integration: 3h
  - Failover & tracking: 2h
  - Testing: 2h
