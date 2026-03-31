# NOTIF-003: SMS Channel Implementation

## Priority: P1 (High)
## Category: Notifications
## Status: DESCOPED - Using WhatsApp Instead

## Description
SMS sending capability was originally planned via Twilio.

## Decision: Use WhatsApp Instead of SMS

After analysis, we decided to **not implement SMS** and instead rely on:

1. **WhatsApp** - Primary channel for phone-based messaging (already integrated)
2. **Email** - Secondary channel (already integrated)
3. **Push Notifications** - Future enhancement (FCM - free)

### Rationale

| Factor | SMS (Twilio) | WhatsApp |
|--------|--------------|----------|
| **Cost** | ~$0.04/message | Free* |
| **Paraguay Market** | Less common | Very popular |
| **Rich Content** | Text only | Images, buttons, cards |
| **Delivery** | Carrier-dependent | Internet-based |
| **Already Integrated** | No | Yes ✓ |

*WhatsApp Business API has requirements but no per-message cost

### What Was Done

1. SMS module was initially implemented but then removed
2. Channel sender updated to gracefully handle SMS requests:
   - Returns helpful error: "SMS no soportado. Use WhatsApp para mensajes por teléfono."
   - Logs the request for monitoring

### Current Notification Channels

| Channel | Status | Use Case |
|---------|--------|----------|
| **Email** | ✓ Active | Formal communications, invoices, reports |
| **WhatsApp** | ✓ Active | Reminders, quick notifications, interactive |
| **SMS** | ✗ Not supported | Use WhatsApp instead |
| **Push** | 🔜 Future | App users, instant alerts |

## Related Files
- `web/lib/reminders/channel-sender.ts` - Returns error for SMS requests
- `web/lib/whatsapp/client.ts` - Active WhatsApp integration
- `web/lib/email/client.ts` - Active email integration

## Future: Push Notifications (NOTIF-004)

If needed, push notifications via Firebase Cloud Messaging (FCM) can be added:
- Completely free
- Instant delivery
- Rich notifications with actions
- Requires app installation

---
*Ticket created: January 2026*
*Descoped: January 2026 - WhatsApp preferred over SMS for Paraguay market*
