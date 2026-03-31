---
name: email-campaign
description: Spanish veterinary email marketing patterns for appointment reminders, vaccine alerts, promotional campaigns, and transactional emails. Use when building email features for the Vete platform.
---

# Email Campaign Patterns for Veterinary Clinics

## Overview

This skill covers email marketing patterns for veterinary clinics in Paraguay, including transactional emails, reminder campaigns, and promotional content - all in Spanish.

---

## 1. Transactional Email Templates

### Appointment Confirmation

```html
<!-- Subject: ✅ Cita confirmada - {{petName}} el {{date}} -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita Confirmada</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="{{clinicLogo}}" alt="{{clinicName}}" style="max-height: 60px;">
    </div>

    <!-- Success Icon -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #10b981; border-radius: 50%; padding: 16px;">
        <span style="font-size: 32px;">✓</span>
      </div>
    </div>

    <!-- Main Content -->
    <h1 style="color: #1f2937; text-align: center; margin-bottom: 8px;">¡Cita Confirmada!</h1>
    <p style="color: #6b7280; text-align: center; margin-bottom: 32px;">
      Tu cita para <strong>{{petName}}</strong> ha sido confirmada.
    </p>

    <!-- Appointment Details Card -->
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">📅 Fecha:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{{date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">🕐 Hora:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{{time}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">🏥 Servicio:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{{serviceName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">👨‍⚕️ Veterinario:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">Dr. {{vetName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">🐾 Mascota:</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{{petName}} ({{petSpecies}})</td>
        </tr>
      </table>
    </div>

    <!-- Location -->
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; color: #1e40af; font-weight: 600;">📍 Dirección</p>
      <p style="margin: 0; color: #3b82f6;">{{clinicAddress}}</p>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="{{portalUrl}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-right: 8px;">
        Ver en Portal
      </a>
      <a href="{{calendarUrl}}" style="display: inline-block; background-color: white; color: {{primaryColor}}; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; border: 2px solid {{primaryColor}};">
        Agregar al Calendario
      </a>
    </div>

    <!-- Important Notes -->
    <div style="border-left: 4px solid #fbbf24; background-color: #fffbeb; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600;">⚠️ Recordá</p>
      <ul style="margin: 0; padding-left: 20px; color: #92400e;">
        <li>Llegá 10 minutos antes de tu cita</li>
        <li>Traé el carnet de vacunas de {{petName}}</li>
        {{#if requiresFasting}}<li>Tu mascota debe estar en ayunas</li>{{/if}}
      </ul>
    </div>

    <!-- Reschedule/Cancel -->
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      ¿Necesitás cambiar la cita?
      <a href="{{rescheduleUrl}}" style="color: {{primaryColor}};">Reprogramar</a> o
      <a href="{{cancelUrl}}" style="color: #ef4444;">Cancelar</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
    <p>{{clinicName}} | {{clinicPhone}} | {{clinicEmail}}</p>
    <p>{{clinicAddress}}</p>
    <p style="margin-top: 16px;">
      <a href="{{unsubscribeUrl}}" style="color: #9ca3af;">Cancelar suscripción</a>
    </p>
  </div>
</body>
</html>
```

### Prescription Ready

```html
<!-- Subject: 📋 Receta lista para {{petName}} -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Receta Lista</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 32px;">

    <div style="text-align: center; margin-bottom: 24px;">
      <img src="{{clinicLogo}}" alt="{{clinicName}}" style="max-height: 60px;">
    </div>

    <h1 style="color: #1f2937; text-align: center;">📋 Receta Lista</h1>

    <p style="color: #4b5563; text-align: center;">
      Hola {{ownerName}}, la receta de <strong>{{petName}}</strong> ya está disponible.
    </p>

    <!-- Medications List -->
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin-top: 0; color: #374151;">💊 Medicamentos recetados:</h3>
      <ul style="color: #4b5563; padding-left: 20px;">
        {{#each medications}}
        <li style="margin-bottom: 8px;">
          <strong>{{name}}</strong> - {{dosage}}<br>
          <span style="color: #6b7280; font-size: 14px;">{{instructions}}</span>
        </li>
        {{/each}}
      </ul>
    </div>

    <!-- Validity -->
    <p style="text-align: center; color: #6b7280;">
      📅 Válida hasta: <strong>{{validUntil}}</strong>
    </p>

    <!-- Download Button -->
    <div style="text-align: center; margin: 24px 0;">
      <a href="{{prescriptionPdfUrl}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600;">
        📥 Descargar Receta PDF
      </a>
    </div>

    <!-- Pickup Info -->
    <div style="background-color: #ecfdf5; border-radius: 8px; padding: 16px; text-align: center;">
      <p style="margin: 0; color: #065f46;">
        🏥 Podés retirar los medicamentos en nuestra farmacia veterinaria
      </p>
    </div>

  </div>
</body>
</html>
```

---

## 2. Reminder Campaign Templates

### Vaccine Due Reminder

```html
<!-- Subject: 💉 {{petName}} necesita su vacuna de {{vaccineName}} -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recordatorio de Vacuna</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 32px;">

    <div style="text-align: center; margin-bottom: 24px;">
      <img src="{{clinicLogo}}" alt="{{clinicName}}" style="max-height: 60px;">
    </div>

    <!-- Pet Image (if available) -->
    {{#if petPhotoUrl}}
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="{{petPhotoUrl}}" alt="{{petName}}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid {{primaryColor}};">
    </div>
    {{/if}}

    <h1 style="color: #1f2937; text-align: center;">💉 Vacuna Pendiente</h1>

    <p style="color: #4b5563; text-align: center; font-size: 18px;">
      Hola {{ownerName}}, <strong>{{petName}}</strong> tiene pendiente su vacuna.
    </p>

    <!-- Vaccine Details -->
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">VACUNA REQUERIDA</p>
      <p style="margin: 0; color: #78350f; font-size: 24px; font-weight: 700;">{{vaccineName}}</p>
      <p style="margin: 8px 0 0 0; color: #92400e;">
        📅 Fecha recomendada: <strong>{{dueDate}}</strong>
      </p>
    </div>

    <!-- Why Important -->
    <div style="margin: 24px 0;">
      <h3 style="color: #374151;">¿Por qué es importante?</h3>
      <p style="color: #6b7280;">{{vaccineDescription}}</p>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{bookingUrl}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
        📅 Agendar Vacunación
      </a>
    </div>

    <!-- Price Info -->
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      💰 Precio: {{formatGuarani vaccinePrice}} | Duración: ~{{duration}} minutos
    </p>

  </div>
</body>
</html>
```

### Appointment Reminder (24h Before)

```html
<!-- Subject: ⏰ Recordatorio: Cita mañana a las {{time}} -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recordatorio de Cita</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 32px;">

    <div style="text-align: center; margin-bottom: 24px;">
      <img src="{{clinicLogo}}" alt="{{clinicName}}" style="max-height: 60px;">
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">⏰</span>
    </div>

    <h1 style="color: #1f2937; text-align: center;">Tu cita es mañana</h1>

    <p style="color: #4b5563; text-align: center;">
      Hola {{ownerName}}, te recordamos que {{petName}} tiene cita mañana.
    </p>

    <!-- Appointment Card -->
    <div style="background-color: {{primaryColor}}; color: white; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; opacity: 0.9;">{{dayOfWeek}}</p>
      <p style="margin: 8px 0; font-size: 32px; font-weight: 700;">{{date}}</p>
      <p style="margin: 0; font-size: 24px;">{{time}}</p>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <p style="color: #6b7280; margin: 4px 0;">🏥 {{serviceName}}</p>
      <p style="color: #6b7280; margin: 4px 0;">👨‍⚕️ Dr. {{vetName}}</p>
      <p style="color: #6b7280; margin: 4px 0;">🐾 {{petName}}</p>
    </div>

    <!-- Quick Actions -->
    <div style="display: flex; justify-content: center; gap: 12px; margin: 24px 0;">
      <a href="{{confirmUrl}}" style="background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
        ✅ Confirmar
      </a>
      <a href="{{rescheduleUrl}}" style="background-color: #f3f4f6; color: #374151; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
        📅 Cambiar
      </a>
    </div>

    <!-- Location with Map Link -->
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #374151; font-weight: 600;">📍 {{clinicName}}</p>
      <p style="margin: 0 0 8px 0; color: #6b7280;">{{clinicAddress}}</p>
      <a href="{{mapsUrl}}" style="color: {{primaryColor}};">Ver en Google Maps →</a>
    </div>

  </div>
</body>
</html>
```

---

## 3. Promotional Campaign Templates

### Seasonal Campaign (Summer Pet Care)

```html
<!-- Subject: ☀️ Prepará a {{petName}} para el verano -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ofertas de Verano</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; overflow: hidden;">

    <!-- Hero Banner -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px; text-align: center; color: white;">
      <span style="font-size: 64px;">☀️</span>
      <h1 style="margin: 16px 0 8px 0;">Ofertas de Verano</h1>
      <p style="margin: 0; opacity: 0.9;">Cuidá a tu mascota del calor</p>
    </div>

    <div style="padding: 32px;">

      <!-- Offer Cards -->
      <div style="margin-bottom: 24px;">
        <!-- Offer 1 -->
        <div style="border: 2px solid #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px; display: flex; align-items: center;">
          <div style="flex: 1;">
            <p style="margin: 0 0 4px 0; color: #ef4444; font-weight: 600; font-size: 14px;">20% OFF</p>
            <p style="margin: 0 0 4px 0; color: #1f2937; font-weight: 600;">Baño Refrescante</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Incluye corte de uñas</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #9ca3af; text-decoration: line-through; font-size: 14px;">₲ 80.000</p>
            <p style="margin: 0; color: #ef4444; font-weight: 700; font-size: 20px;">₲ 64.000</p>
          </div>
        </div>

        <!-- Offer 2 -->
        <div style="border: 2px solid #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px; display: flex; align-items: center;">
          <div style="flex: 1;">
            <p style="margin: 0 0 4px 0; color: #ef4444; font-weight: 600; font-size: 14px;">COMBO</p>
            <p style="margin: 0 0 4px 0; color: #1f2937; font-weight: 600;">Desparasitación + Vitaminas</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Protección completa</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #ef4444; font-weight: 700; font-size: 20px;">₲ 120.000</p>
          </div>
        </div>

        <!-- Offer 3 -->
        <div style="border: 2px solid #f3f4f6; border-radius: 8px; padding: 16px; display: flex; align-items: center;">
          <div style="flex: 1;">
            <p style="margin: 0 0 4px 0; color: #ef4444; font-weight: 600; font-size: 14px;">GRATIS</p>
            <p style="margin: 0 0 4px 0; color: #1f2937; font-weight: 600;">Consulta de Control</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Con cualquier vacuna</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #10b981; font-weight: 700; font-size: 20px;">¡GRATIS!</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{bookingUrl}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
          Agendar Ahora
        </a>
      </div>

      <!-- Urgency -->
      <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; color: #dc2626; font-weight: 600;">
          ⏰ Ofertas válidas hasta el {{expiryDate}}
        </p>
      </div>

      <!-- Tips Section -->
      <div style="margin-top: 32px;">
        <h3 style="color: #374151;">🌡️ Tips para el verano:</h3>
        <ul style="color: #6b7280; padding-left: 20px;">
          <li>Mantené siempre agua fresca disponible</li>
          <li>Evitá paseos en las horas de más calor (12-16h)</li>
          <li>Nunca dejes a tu mascota en el auto</li>
          <li>Protegé las almohadillas del asfalto caliente</li>
        </ul>
      </div>

    </div>
  </div>
</body>
</html>
```

---

## 4. Email Service Integration

### Resend Integration

```typescript
// lib/email/resend.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export async function sendEmail(options: EmailOptions) {
  const { to, subject, html, from, replyTo, tags } = options;

  const { data, error } = await resend.emails.send({
    from: from || `${process.env.CLINIC_NAME} <noreply@${process.env.EMAIL_DOMAIN}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    reply_to: replyTo,
    tags,
  });

  if (error) {
    console.error('Email send error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

// Convenience functions
export async function sendAppointmentConfirmation(
  to: string,
  data: AppointmentEmailData
) {
  const html = await renderTemplate('appointment-confirmation', data);

  return sendEmail({
    to,
    subject: `✅ Cita confirmada - ${data.petName} el ${data.date}`,
    html,
    tags: [
      { name: 'type', value: 'appointment-confirmation' },
      { name: 'tenant', value: data.tenantId },
    ],
  });
}

export async function sendVaccineReminder(
  to: string,
  data: VaccineReminderData
) {
  const html = await renderTemplate('vaccine-reminder', data);

  return sendEmail({
    to,
    subject: `💉 ${data.petName} necesita su vacuna de ${data.vaccineName}`,
    html,
    tags: [
      { name: 'type', value: 'vaccine-reminder' },
      { name: 'tenant', value: data.tenantId },
    ],
  });
}
```

### Template Rendering

```typescript
// lib/email/templates.ts
import Handlebars from 'handlebars';
import { formatGuarani } from '@/lib/utils/currency-paraguay';

// Register helpers
Handlebars.registerHelper('formatGuarani', (amount: number) => formatGuarani(amount));
Handlebars.registerHelper('formatDate', (date: string) => {
  return new Date(date).toLocaleDateString('es-PY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Template cache
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

export async function renderTemplate(
  templateName: string,
  data: Record<string, any>
): Promise<string> {
  let template = templateCache.get(templateName);

  if (!template) {
    // In production, load from file system or database
    const templateSource = await loadTemplate(templateName);
    template = Handlebars.compile(templateSource);
    templateCache.set(templateName, template);
  }

  return template(data);
}
```

---

## 5. Subject Line Best Practices

### Effective Subject Lines (Spanish)

```typescript
// lib/email/subject-lines.ts
export const SUBJECT_LINE_PATTERNS = {
  // Appointment reminders
  appointmentConfirmation: (petName: string, date: string) =>
    `✅ Cita confirmada - ${petName} el ${date}`,

  appointmentReminder24h: (time: string) =>
    `⏰ Recordatorio: Cita mañana a las ${time}`,

  appointmentReminder1h: (petName: string) =>
    `🔔 ${petName} tiene cita en 1 hora`,

  // Vaccines
  vaccineDue: (petName: string, vaccineName: string) =>
    `💉 ${petName} necesita su vacuna de ${vaccineName}`,

  vaccineOverdue: (petName: string) =>
    `⚠️ Vacuna vencida - ${petName} necesita atención`,

  // Prescriptions
  prescriptionReady: (petName: string) =>
    `📋 Receta lista para ${petName}`,

  // Orders
  orderConfirmation: (orderNumber: string) =>
    `🛒 Pedido #${orderNumber} confirmado`,

  orderShipped: (orderNumber: string) =>
    `📦 Tu pedido #${orderNumber} está en camino`,

  orderDelivered: (orderNumber: string) =>
    `✅ Pedido #${orderNumber} entregado`,

  // Lab results
  labResultsReady: (petName: string) =>
    `🔬 Resultados de laboratorio de ${petName}`,

  // Promotions
  seasonalOffer: (discount: string) =>
    `☀️ ${discount} de descuento en servicios de verano`,

  birthdayOffer: (petName: string) =>
    `🎂 ¡Feliz cumpleaños ${petName}! Tenemos un regalo`,

  // Re-engagement
  missYou: (petName: string) =>
    `🐾 Extrañamos a ${petName} - ¿Está todo bien?`,
};

// A/B testing variants
export const SUBJECT_AB_TESTS = {
  vaccineReminder: [
    { variant: 'A', subject: '💉 Vacuna pendiente para {{petName}}' },
    { variant: 'B', subject: '⚠️ {{petName}} necesita su vacuna' },
    { variant: 'C', subject: 'Protegé a {{petName}} - Vacuna disponible' },
  ],
  appointmentReminder: [
    { variant: 'A', subject: '⏰ Tu cita es mañana' },
    { variant: 'B', subject: '📅 Recordatorio: {{petName}} - {{date}}' },
    { variant: 'C', subject: '¡No olvides! Cita mañana a las {{time}}' },
  ],
};
```

---

## 6. Campaign Scheduling

```typescript
// lib/email/scheduler.ts
import { createClient } from '@/lib/supabase/server';

interface ScheduledCampaign {
  id: string;
  tenantId: string;
  templateName: string;
  recipients: 'all_clients' | 'vaccine_due' | 'inactive_30d' | 'custom';
  customRecipients?: string[];
  scheduledAt: Date;
  status: 'scheduled' | 'sending' | 'sent' | 'failed';
}

export async function scheduleCampaign(campaign: Omit<ScheduledCampaign, 'id' | 'status'>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({
      tenant_id: campaign.tenantId,
      template_name: campaign.templateName,
      recipients: campaign.recipients,
      custom_recipients: campaign.customRecipients,
      scheduled_at: campaign.scheduledAt.toISOString(),
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Recipient queries
export async function getVaccineDueRecipients(tenantId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('vaccines')
    .select(`
      pet_id,
      vaccine_name,
      next_due_date,
      pets (
        name,
        owner_id,
        profiles!pets_owner_id_fkey (
          email,
          full_name
        )
      )
    `)
    .eq('pets.tenant_id', tenantId)
    .lte('next_due_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()) // Due in 14 days
    .gt('next_due_date', new Date().toISOString()) // Not overdue
    .eq('status', 'pending');

  return data;
}

export async function getInactiveClients(tenantId: string, days: number = 30) {
  const supabase = await createClient();

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .not('id', 'in', supabase
      .from('appointments')
      .select('pet_id')
      .eq('tenant_id', tenantId)
      .gte('start_time', cutoffDate)
    );

  return data;
}
```

---

*Reference: Resend documentation, email marketing best practices*
