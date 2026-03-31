---
name: whatsapp-business
description: WhatsApp Business API integration patterns for veterinary clinics in Paraguay. Use when building appointment reminders, prescription notifications, vaccination alerts, and customer communication features via WhatsApp.
---

# WhatsApp Business API Integration Guide

## Overview

WhatsApp is the primary communication channel in Paraguay (90%+ smartphone penetration). This skill covers WhatsApp Business API integration patterns for veterinary clinic communications.

---

## 1. Message Template Categories

### Appointment Reminders

```json
{
  "name": "appointment_reminder_24h",
  "language": "es_PY",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "🐾 Recordatorio de Cita"
    },
    {
      "type": "BODY",
      "text": "Hola {{1}}, te recordamos que {{2}} tiene una cita mañana {{3}} a las {{4}} en {{5}}.\n\n📍 Dirección: {{6}}\n\n¿Necesitás reprogramar?",
      "example": {
        "body_text": [["María", "Luna", "viernes 15 de enero", "10:00", "Veterinaria Adris", "Av. España 1234"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Responde CONFIRMAR o CANCELAR"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "✅ Confirmar" },
        { "type": "QUICK_REPLY", "text": "📅 Reprogramar" },
        { "type": "QUICK_REPLY", "text": "❌ Cancelar" }
      ]
    }
  ]
}
```

### Vaccination Alerts

```json
{
  "name": "vaccine_due_reminder",
  "language": "es_PY",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "💉 Vacuna Pendiente"
    },
    {
      "type": "BODY",
      "text": "Hola {{1}}, {{2}} tiene pendiente su vacuna de {{3}}.\n\n📅 Fecha sugerida: {{4}}\n\n¡Protegé a tu mascota! Agendá su cita ahora.",
      "example": {
        "body_text": [["Carlos", "Max", "Antirrábica", "próxima semana"]]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "📅 Agendar cita" },
        { "type": "QUICK_REPLY", "text": "📞 Llamar" }
      ]
    }
  ]
}
```

### Prescription Ready

```json
{
  "name": "prescription_ready",
  "language": "es_PY",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "📋 Receta Lista"
    },
    {
      "type": "BODY",
      "text": "Hola {{1}}, la receta de {{2}} ya está lista para retirar.\n\n💊 Medicamentos: {{3}}\n📍 Retirá en: {{4}}\n⏰ Horario: {{5}}",
      "example": {
        "body_text": [["Ana", "Michi", "Amoxicilina 250mg, Meloxicam", "Veterinaria Adris", "8:00 - 18:00"]]
      }
    }
  ]
}
```

### Order Status Updates

```json
{
  "name": "order_status_update",
  "language": "es_PY",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "📦 Actualización de Pedido"
    },
    {
      "type": "BODY",
      "text": "Hola {{1}}, tu pedido #{{2}} está {{3}}.\n\n{{4}}",
      "example": {
        "body_text": [["Pedro", "12345", "en camino", "Llegará hoy entre 14:00 y 16:00"]]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "📍 Ver ubicación" },
        { "type": "QUICK_REPLY", "text": "📞 Contactar" }
      ]
    }
  ]
}
```

### Lab Results Available

```json
{
  "name": "lab_results_ready",
  "language": "es_PY",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "🔬 Resultados de Laboratorio"
    },
    {
      "type": "BODY",
      "text": "Hola {{1}}, los resultados de {{2}} de {{3}} ya están disponibles.\n\n📄 Podés verlos en tu portal o retirarlos en la clínica.\n\n¿Querés agendar una consulta para revisar los resultados?",
      "example": {
        "body_text": [["María", "hemograma completo", "Luna"]]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "URL", "text": "📱 Ver en Portal", "url": "https://{{1}}.vete.app/portal" },
        { "type": "QUICK_REPLY", "text": "📅 Agendar consulta" }
      ]
    }
  ]
}
```

---

## 2. Interactive Message Patterns

### Appointment Booking Flow

```typescript
// Step 1: Service Selection (List Message)
const serviceSelectionMessage = {
  type: "interactive",
  interactive: {
    type: "list",
    header: { type: "text", text: "📋 Servicios Disponibles" },
    body: { text: "Seleccioná el servicio que necesitás para tu mascota:" },
    footer: { text: "Veterinaria Adris" },
    action: {
      button: "Ver servicios",
      sections: [
        {
          title: "Consultas",
          rows: [
            { id: "consulta_general", title: "Consulta General", description: "Revisión completa - 30 min" },
            { id: "consulta_urgencia", title: "Urgencia", description: "Atención inmediata" },
            { id: "consulta_seguimiento", title: "Seguimiento", description: "Control post-tratamiento" }
          ]
        },
        {
          title: "Vacunación",
          rows: [
            { id: "vacuna_antirrabica", title: "Antirrábica", description: "Obligatoria anual" },
            { id: "vacuna_multiple", title: "Múltiple", description: "DHPPi / Triple Felina" },
            { id: "vacuna_otras", title: "Otras vacunas", description: "Consultar disponibilidad" }
          ]
        },
        {
          title: "Otros",
          rows: [
            { id: "peluqueria", title: "Peluquería", description: "Baño y corte" },
            { id: "cirugia", title: "Cirugía", description: "Requiere evaluación previa" }
          ]
        }
      ]
    }
  }
};

// Step 2: Date Selection (Button Message)
const dateSelectionMessage = {
  type: "interactive",
  interactive: {
    type: "button",
    header: { type: "text", text: "📅 Seleccioná el día" },
    body: { text: "Tenemos disponibilidad para los siguientes días:" },
    action: {
      buttons: [
        { type: "reply", reply: { id: "date_today", title: "Hoy" } },
        { type: "reply", reply: { id: "date_tomorrow", title: "Mañana" } },
        { type: "reply", reply: { id: "date_other", title: "Otro día" } }
      ]
    }
  }
};

// Step 3: Time Slot Selection (List Message)
const timeSlotMessage = {
  type: "interactive",
  interactive: {
    type: "list",
    header: { type: "text", text: "⏰ Horarios Disponibles" },
    body: { text: "Seleccioná el horario que te quede mejor:" },
    action: {
      button: "Ver horarios",
      sections: [
        {
          title: "Mañana",
          rows: [
            { id: "slot_0800", title: "08:00", description: "Disponible" },
            { id: "slot_0900", title: "09:00", description: "Disponible" },
            { id: "slot_1000", title: "10:00", description: "Disponible" },
            { id: "slot_1100", title: "11:00", description: "Último turno mañana" }
          ]
        },
        {
          title: "Tarde",
          rows: [
            { id: "slot_1400", title: "14:00", description: "Disponible" },
            { id: "slot_1500", title: "15:00", description: "Disponible" },
            { id: "slot_1600", title: "16:00", description: "Disponible" },
            { id: "slot_1700", title: "17:00", description: "Último turno" }
          ]
        }
      ]
    }
  }
};
```

### Pet Selection for Multi-Pet Owners

```typescript
const petSelectionMessage = {
  type: "interactive",
  interactive: {
    type: "list",
    header: { type: "text", text: "🐾 Seleccioná tu mascota" },
    body: { text: "¿Para cuál de tus mascotas es la cita?" },
    action: {
      button: "Ver mascotas",
      sections: [
        {
          title: "Tus mascotas registradas",
          rows: [
            { id: "pet_uuid_1", title: "🐕 Max", description: "Golden Retriever - 3 años" },
            { id: "pet_uuid_2", title: "🐈 Luna", description: "Gato Siamés - 2 años" },
            { id: "pet_new", title: "➕ Nueva mascota", description: "Registrar una nueva" }
          ]
        }
      ]
    }
  }
};
```

---

## 3. Webhook Handler Pattern

```typescript
// lib/whatsapp/webhook-handler.ts
import { createClient } from '@/lib/supabase/server';

interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<WhatsAppMessage>;
        statuses?: Array<WhatsAppStatus>;
      };
      field: 'messages';
    }>;
  }>;
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'document' | 'button';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description: string };
  };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; sha256: string; filename: string };
}

export async function handleWhatsAppWebhook(payload: WhatsAppWebhookPayload) {
  const supabase = await createClient();

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { messages, contacts, metadata } = change.value;

      if (messages) {
        for (const message of messages) {
          await processMessage(supabase, message, contacts, metadata);
        }
      }
    }
  }
}

async function processMessage(
  supabase: SupabaseClient,
  message: WhatsAppMessage,
  contacts: Array<{ profile: { name: string }; wa_id: string }> | undefined,
  metadata: { phone_number_id: string }
) {
  const phoneNumber = message.from;
  const contact = contacts?.find(c => c.wa_id === phoneNumber);

  // Find or create conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, tenant_id, client_id')
    .eq('channel', 'whatsapp')
    .eq('phone_number', phoneNumber)
    .single();

  // Store incoming message
  await supabase.from('whatsapp_messages').insert({
    tenant_id: conversation?.tenant_id,
    conversation_id: conversation?.id,
    phone_number: phoneNumber,
    direction: 'inbound',
    message_id: message.id,
    message_type: message.type,
    content: extractMessageContent(message),
    status: 'received',
    raw_payload: message,
  });

  // Route message based on type and content
  await routeMessage(supabase, conversation, message);
}

function extractMessageContent(message: WhatsAppMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'interactive':
      return message.interactive?.button_reply?.title
        || message.interactive?.list_reply?.title
        || '';
    default:
      return `[${message.type}]`;
  }
}

async function routeMessage(
  supabase: SupabaseClient,
  conversation: any,
  message: WhatsAppMessage
) {
  const content = extractMessageContent(message).toLowerCase();

  // Quick reply handlers
  const quickReplyHandlers: Record<string, () => Promise<void>> = {
    'confirmar': () => confirmAppointment(conversation),
    '✅ confirmar': () => confirmAppointment(conversation),
    'cancelar': () => cancelAppointment(conversation),
    '❌ cancelar': () => cancelAppointment(conversation),
    'reprogramar': () => rescheduleAppointment(conversation),
    '📅 reprogramar': () => rescheduleAppointment(conversation),
    'agendar cita': () => startBookingFlow(conversation),
    '📅 agendar cita': () => startBookingFlow(conversation),
  };

  const handler = quickReplyHandlers[content];
  if (handler) {
    await handler();
    return;
  }

  // Interactive reply handlers (from list/button selections)
  if (message.type === 'interactive') {
    const replyId = message.interactive?.button_reply?.id
      || message.interactive?.list_reply?.id;

    if (replyId?.startsWith('slot_')) {
      await handleTimeSlotSelection(conversation, replyId);
    } else if (replyId?.startsWith('pet_')) {
      await handlePetSelection(conversation, replyId);
    } else if (replyId?.startsWith('date_')) {
      await handleDateSelection(conversation, replyId);
    }
    return;
  }

  // Default: Forward to staff for manual response
  await notifyStaffOfNewMessage(conversation, message);
}
```

---

## 4. Sending Messages

```typescript
// lib/whatsapp/send-message.ts
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface SendMessageOptions {
  phoneNumberId: string;
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
  interactive?: object;
}

export async function sendWhatsAppMessage(options: SendMessageOptions) {
  const { phoneNumberId, ...messagePayload } = options;

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        ...messagePayload,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Convenience functions
export async function sendAppointmentReminder(
  phoneNumberId: string,
  to: string,
  data: {
    ownerName: string;
    petName: string;
    date: string;
    time: string;
    clinicName: string;
    address: string;
  }
) {
  return sendWhatsAppMessage({
    phoneNumberId,
    to,
    type: 'template',
    template: {
      name: 'appointment_reminder_24h',
      language: { code: 'es_PY' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.ownerName },
            { type: 'text', text: data.petName },
            { type: 'text', text: data.date },
            { type: 'text', text: data.time },
            { type: 'text', text: data.clinicName },
            { type: 'text', text: data.address },
          ],
        },
      ],
    },
  });
}

export async function sendVaccineReminder(
  phoneNumberId: string,
  to: string,
  data: {
    ownerName: string;
    petName: string;
    vaccineName: string;
    suggestedDate: string;
  }
) {
  return sendWhatsAppMessage({
    phoneNumberId,
    to,
    type: 'template',
    template: {
      name: 'vaccine_due_reminder',
      language: { code: 'es_PY' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.ownerName },
            { type: 'text', text: data.petName },
            { type: 'text', text: data.vaccineName },
            { type: 'text', text: data.suggestedDate },
          ],
        },
      ],
    },
  });
}
```

---

## 5. Paraguay-Specific Considerations

### Phone Number Formatting

```typescript
// Paraguay phone numbers
// Mobile: 09xx xxx xxx (10 digits) -> +595 9xx xxx xxx
// Landline: 021 xxx xxxx (10 digits) -> +595 21 xxx xxxx

export function formatParaguayPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Already international format
  if (digits.startsWith('595')) {
    return `+${digits}`;
  }

  // Local format starting with 0
  if (digits.startsWith('0')) {
    return `+595${digits.slice(1)}`;
  }

  // Assume mobile without leading 0
  if (digits.startsWith('9')) {
    return `+595${digits}`;
  }

  // Default: add country code
  return `+595${digits}`;
}

export function validateParaguayPhone(phone: string): boolean {
  const formatted = formatParaguayPhone(phone);
  // +595 followed by 9 digits (mobile) or 8-9 digits (landline)
  return /^\+595(9\d{8}|21\d{6,7}|\d{8,9})$/.test(formatted);
}
```

### Carriers and Considerations

| Carrier | Prefix | Notes |
|---------|--------|-------|
| Tigo | 0981, 0982, 0983 | Most popular, best coverage |
| Personal | 0971, 0972, 0973 | Second largest |
| Claro | 0991, 0992, 0993 | Growing presence |
| VOX | 0961, 0962 | Smaller carrier |

### Business Hours Template

```typescript
// Paraguay business hours context
const businessHours = {
  timezone: 'America/Asuncion',
  weekdays: { open: '08:00', close: '18:00' },
  saturday: { open: '08:00', close: '12:00' },
  sunday: null, // Closed
  holidays: [
    '01-01', // Año Nuevo
    '03-01', // Día de los Héroes
    '04-18', // Jueves Santo (variable)
    '04-19', // Viernes Santo (variable)
    '05-01', // Día del Trabajador
    '05-15', // Independencia
    '06-12', // Paz del Chaco
    '08-15', // Fundación de Asunción
    '09-29', // Victoria de Boquerón
    '12-08', // Virgen de Caacupé
    '12-25', // Navidad
  ],
};
```

---

## 6. Media Message Handling

### Receiving Pet Photos/Documents

```typescript
async function handleMediaMessage(
  message: WhatsAppMessage,
  conversation: any
) {
  const mediaId = message.image?.id || message.document?.id;
  if (!mediaId) return;

  // Get media URL from WhatsApp
  const mediaUrl = await getMediaUrl(mediaId);

  // Download and upload to Supabase Storage
  const response = await fetch(mediaUrl, {
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
  });
  const buffer = await response.arrayBuffer();

  const filename = message.document?.filename || `media_${Date.now()}.jpg`;
  const path = `whatsapp/${conversation.tenant_id}/${conversation.id}/${filename}`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(path, buffer, {
      contentType: message.image?.mime_type || message.document?.mime_type,
    });

  // Store reference
  await supabase.from('message_attachments').insert({
    message_id: message.id,
    file_url: data?.path,
    file_type: message.type,
    original_filename: filename,
  });
}

async function getMediaUrl(mediaId: string): Promise<string> {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${mediaId}`,
    {
      headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` }
    }
  );
  const data = await response.json();
  return data.url;
}
```

---

## 7. Rate Limits and Best Practices

### WhatsApp Business API Limits

| Tier | Messages/Day | How to Qualify |
|------|--------------|----------------|
| Unverified | 250 | New accounts |
| Tier 1 | 1,000 | Verified business |
| Tier 2 | 10,000 | Good quality rating |
| Tier 3 | 100,000 | High volume, good rating |
| Tier 4 | Unlimited | Enterprise |

### Quality Rating Factors

- **Block rate**: Keep under 2%
- **Report rate**: Keep under 0.1%
- **Template rejection rate**: Keep under 10%
- **Read rate**: Target above 30%

### Best Practices

1. **24-hour window**: Free-form messages only within 24h of customer message
2. **Template approval**: Submit templates 24-48h before campaign
3. **Opt-in required**: Always get explicit consent before messaging
4. **Unsubscribe option**: Include opt-out in every campaign message
5. **Personalization**: Use customer name and pet name in messages
6. **Timing**: Send reminders 24h before, not too early morning/late night

---

*Reference: WhatsApp Business Platform documentation, Meta Business Suite*
