# BUG-004: Waitlist Notification Not Triggered

## Priority: P2 (Medium)
## Category: Bug
## Status: COMPLETED

## Description
The waitlist trigger updates database records when slots become available, but the TODO comment indicates the notification to customers was never implemented.

## Current State
### Database Trigger
**`db/40_scheduling/03_waitlist.sql:128`**
```sql
CREATE OR REPLACE FUNCTION process_waitlist_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Find eligible waitlist entries
  -- Update their status to 'offered'
  -- Set offer_expires_at

  -- TODO: Send notification to client about available slot
  -- This would trigger notification system

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Current Behavior
1. Appointment is cancelled
2. Trigger finds waitlisted clients
3. Waitlist entry status updated to 'offered'
4. `offer_expires_at` set (e.g., 2 hours from now)
5. **NO notification sent to client!**
6. Client never knows a slot opened
7. Offer expires, slot goes unfilled

### Business Impact
- Lost revenue from unfilled slots
- Poor customer experience
- Waitlist feature is effectively broken
- Clients added to waitlist but never contacted

## Proposed Solution

### 1. Notification Trigger Function
```sql
-- db/migrations/xxx_waitlist_notification.sql

-- Create notification queue table
CREATE TABLE waitlist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  waitlist_id UUID NOT NULL REFERENCES appointment_waitlist(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  appointment_date DATE NOT NULL,
  service_name TEXT NOT NULL,
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  channels TEXT[] DEFAULT '{}'::TEXT[],
  processed BOOLEAN DEFAULT FALSE
);

-- Update trigger to queue notification
CREATE OR REPLACE FUNCTION process_waitlist_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_waitlist RECORD;
  v_service RECORD;
BEGIN
  -- Find eligible waitlist entries
  FOR v_waitlist IN
    SELECT w.*, p.full_name, p.email, p.phone
    FROM appointment_waitlist w
    JOIN profiles p ON p.id = w.client_id
    WHERE w.tenant_id = OLD.tenant_id
    AND w.service_id = OLD.service_id
    AND w.preferred_date = OLD.start_time::DATE
    AND w.status = 'waiting'
    ORDER BY w.created_at
    LIMIT 1
  LOOP
    -- Get service name
    SELECT name INTO v_service FROM services WHERE id = OLD.service_id;

    -- Update waitlist status
    UPDATE appointment_waitlist
    SET
      status = 'offered',
      offered_slot_time = OLD.start_time,
      offer_expires_at = NOW() + INTERVAL '2 hours'
    WHERE id = v_waitlist.id;

    -- Queue notification
    INSERT INTO waitlist_notifications (
      tenant_id,
      waitlist_id,
      client_id,
      appointment_date,
      service_name,
      expires_at,
      channels
    ) VALUES (
      OLD.tenant_id,
      v_waitlist.id,
      v_waitlist.client_id,
      OLD.start_time::DATE,
      v_service.name,
      NOW() + INTERVAL '2 hours',
      ARRAY['email', 'push', 'sms']
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Notification Processor (Cron or Inngest)
```typescript
// app/api/cron/process-waitlist-notifications/route.ts
export async function GET(request: NextRequest) {
  // Auth...

  const { data: notifications } = await supabase
    .from('waitlist_notifications')
    .select(`
      *,
      profiles!client_id(email, phone, full_name)
    `)
    .eq('processed', false)
    .eq('notification_sent', false)

  for (const notif of notifications || []) {
    const sent: string[] = []

    // Send email
    if (notif.channels.includes('email') && notif.profiles.email) {
      await sendEmail({
        to: notif.profiles.email,
        template: 'waitlist-slot-available',
        data: {
          name: notif.profiles.full_name,
          service: notif.service_name,
          date: notif.appointment_date,
          expires: notif.expires_at,
          bookingUrl: `${baseUrl}/book?waitlist=${notif.waitlist_id}`,
        },
      })
      sent.push('email')
    }

    // Send SMS
    if (notif.channels.includes('sms') && notif.profiles.phone) {
      await sendSMS({
        to: notif.profiles.phone,
        message: `¡Hay un turno disponible para ${notif.service_name}! Reserva antes de las ${formatTime(notif.expires_at)}: ${shortUrl}`,
      })
      sent.push('sms')
    }

    // Send push notification
    if (notif.channels.includes('push')) {
      await sendPush(notif.client_id, {
        title: '¡Turno disponible!',
        body: `Se liberó un turno para ${notif.service_name}`,
        data: { waitlist_id: notif.waitlist_id },
      })
      sent.push('push')
    }

    // Update notification record
    await supabase
      .from('waitlist_notifications')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
        channels: sent,
        processed: true,
      })
      .eq('id', notif.id)
  }

  return NextResponse.json({ processed: notifications?.length || 0 })
}
```

### 3. Email Template
```typescript
// lib/email/templates/waitlist-slot-available.tsx
export const WaitlistSlotAvailableEmail = ({
  name,
  service,
  date,
  expires,
  bookingUrl,
}) => (
  <Email>
    <Heading>¡Hola {name}!</Heading>
    <Text>
      Se acaba de liberar un turno para <strong>{service}</strong>
      el día <strong>{formatDate(date)}</strong>.
    </Text>
    <Text>
      Como estabas en lista de espera, tienes prioridad para reservarlo.
    </Text>
    <Button href={bookingUrl}>Reservar Ahora</Button>
    <Text style={{ color: '#666' }}>
      Esta oferta expira el {formatDateTime(expires)}.
      Si no reservas a tiempo, el turno se ofrecerá a otros clientes.
    </Text>
  </Email>
)
```

## Implementation Steps
1. Create waitlist_notifications table
2. Update trigger to queue notifications
3. Create notification processor cron job
4. Create email template
5. Add SMS sending (if Twilio configured)
6. Add push notification support
7. Test end-to-end flow
8. Add expiry handling (offer expired)

## Acceptance Criteria
- [ ] Client notified when slot becomes available
- [ ] Email sent with booking link
- [ ] SMS sent (if configured)
- [ ] Notification tracks sent status
- [ ] Deep link to booking with pre-filled waitlist ID
- [ ] Expired offers handled gracefully

## Related Files
- `web/db/40_scheduling/03_waitlist.sql`
- `web/db/migrations/xxx_waitlist_notification.sql` (new)
- `web/app/api/cron/process-waitlist-notifications/route.ts` (new)
- `web/lib/email/templates/waitlist-slot-available.tsx` (new)

## Estimated Effort
- Database changes: 2 hours
- Cron processor: 3 hours
- Email template: 1 hour
- SMS integration: 1 hour
- Testing: 2 hours
- **Total: 9 hours**

---
## Implementation Summary (Completed)

**Migration Created:** `db/migrations/058_waitlist_notification.sql`

**Changes Made:**
1. Updated `process_waitlist_on_cancellation()` trigger function to:
   - Insert notification record when slot is offered to waitlisted client
   - Include service name, pet name, and expiration time in notification
   - Use type 'waitlist_offer' with link to `/portal/appointments/waitlist`

2. Updated `expire_waitlist_offers()` function to:
   - Notify client when their offer expires (type: 'waitlist_expired')
   - Cascade offer to next person in waitlist
   - Send 'waitlist_offer' notification to next client

**Notification Data:**
- `title`: "¡Turno disponible!" (slot available) or "Oferta de turno expirada" (offer expired)
- `message`: Includes service name, pet name, and 4-hour expiration window
- `data`: Contains waitlist_id, service_id, pet_id, expires_at for frontend handling

**Result:** Clients now receive in-app notifications when waitlist slots become available.

---
*Ticket created: January 2026*
*Completed: January 2026*
