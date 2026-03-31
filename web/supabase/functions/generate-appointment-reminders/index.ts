// Supabase Edge Function: Generate Appointment Reminders
// Called daily by pg_cron to create notification queue entries for upcoming appointments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Reminder schedule: 24 hours and 2 hours before appointment
const REMINDER_HOURS = [24, 2]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Generating appointment reminders...')

    const now = new Date()
    let totalReminders = 0

    for (const hoursAhead of REMINDER_HOURS) {
      // Calculate the target time window (1 hour window around the target time)
      const targetTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)
      const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000) // 30 min before
      const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000) // 30 min after

      // Get appointments in this window
      const { data: appointments, error } = await supabaseAdmin
        .from('appointments')
        .select(
          `
          id, start_time, reason, status, tenant_id,
          pet:pets(
            id, name,
            owner:profiles!pets_owner_id_fkey(id, email, phone, full_name)
          ),
          tenant:tenants(name, config)
        `
        )
        .gte('start_time', windowStart.toISOString())
        .lt('start_time', windowEnd.toISOString())
        .in('status', ['pending', 'confirmed'])

      if (error) {
        console.error(`Error fetching appointments for ${hoursAhead}h window:`, error)
        continue
      }

      // Explicitly type the result structure to match the query
      type AppointmentResult = {
        id: string
        start_time: string
        reason: string
        status: string
        tenant_id: string
        pet: {
          id: string
          name: string
          owner: {
            id: string
            email: string | null
            phone: string | null
            full_name: string | null
          } | null
        } | null
        tenant: {
          name: string
          config: unknown
        } | null
      }

      for (const appointment of (appointments || []) as unknown as AppointmentResult[]) {
        const remindersCreated = await createAppointmentReminders(appointment, hoursAhead)
        totalReminders += remindersCreated
      }
    }

    console.log(`Generated ${totalReminders} appointment reminders`)

    return new Response(
      JSON.stringify({
        message: 'Appointment reminders generated',
        total_reminders: totalReminders,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error generating appointment reminders:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Define the interface for the helper function
interface AppointmentData {
  id: string
  start_time: string
  reason: string
  status: string
  tenant_id: string
  pet: {
    id: string
    name: string
    owner: {
      id: string
      email: string | null
      phone: string | null
      full_name: string | null
    } | null
  } | null
  tenant: {
    name: string
    config: unknown
  } | null
}

async function createAppointmentReminders(appointment: AppointmentData, hoursAhead: number): Promise<number> {
  let remindersCreated = 0

  const pet = appointment.pet
  if (!pet) {
     console.warn(`Appointment ${appointment.id} has no linked pet. Skipping.`)
     return 0
  }

  const owner = pet.owner
  const tenant = appointment.tenant

  if (!owner) {
     console.warn(`Pet ${pet.id} has no linked owner. Skipping reminder.`)
     return 0
  }
  
  if (!tenant) {
      console.warn(`Appointment ${appointment.id} has no linked tenant. Skipping.`)
      return 0
  }

  // Check if reminder already sent
  const reminderKey = `apt-${appointment.id}-${hoursAhead}h`
  const { data: existing } = await supabaseAdmin
    .from('reminders')
    .select('id')
    .eq('tenant_id', appointment.tenant_id)
    .eq('entity_type', 'appointment')
    .eq('entity_id', appointment.id)
    .eq('reminder_key', reminderKey)
    .single()

  if (existing) return 0

  // Create reminder record
  await supabaseAdmin.from('reminders').insert({
    tenant_id: appointment.tenant_id,
    entity_type: 'appointment',
    entity_id: appointment.id,
    reminder_key: reminderKey,
    due_date: appointment.start_time,
    status: 'sent',
  })

  const appointmentTime = new Date(appointment.start_time)
  const timeStr = appointmentTime.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateStr = appointmentTime.toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Queue email notification
  if (owner.email) {
    await supabaseAdmin.from('notification_queue').insert({
      tenant_id: appointment.tenant_id,
      channel: 'email',
      recipient_id: owner.id,
      recipient_address: owner.email,
      subject: `Recordatorio: Cita de ${pet.name} - ${dateStr}`,
      body: formatAppointmentEmail(
        pet.name,
        appointment.reason,
        dateStr,
        timeStr,
        tenant.name,
        hoursAhead
      ),
      priority: hoursAhead <= 2 ? 'high' : 'normal',
      metadata: {
        appointment_id: appointment.id,
        pet_id: pet.id,
        pet_name: pet.name,
        hours_until: hoursAhead,
        clinic_name: tenant.name,
      },
    })
    remindersCreated++
  }

  // Queue SMS for 2-hour reminder
  if (owner.phone && hoursAhead === 2) {
    await supabaseAdmin.from('notification_queue').insert({
      tenant_id: appointment.tenant_id,
      channel: 'sms',
      recipient_id: owner.id,
      recipient_address: owner.phone,
      body: formatAppointmentSms(pet.name, timeStr, tenant.name),
      priority: 'high',
      metadata: {
        appointment_id: appointment.id,
        pet_id: pet.id,
      },
    })
    remindersCreated++
  }

  return remindersCreated
}

function formatAppointmentEmail(
  petName: string,
  reason: string,
  dateStr: string,
  timeStr: string,
  clinicName: string,
  hoursAhead: number
): string {
  const timeUntil =
    hoursAhead === 24 ? 'mañana' : hoursAhead === 2 ? 'en 2 horas' : `en ${hoursAhead} horas`

  return `
Hola,

Te recordamos que tienes una cita programada ${timeUntil}:

**Mascota:** ${petName}
**Motivo:** ${reason}
**Fecha:** ${dateStr}
**Hora:** ${timeStr}

Por favor llega 10 minutos antes de tu cita. Si necesitas cancelar o reprogramar, contáctanos lo antes posible.

Nos vemos pronto,
${clinicName}

---
Este es un mensaje automático. Por favor no respondas directamente a este correo.
  `.trim()
}

function formatAppointmentSms(petName: string, timeStr: string, clinicName: string): string {
  return `${clinicName}: Recordatorio! Cita de ${petName} a las ${timeStr}. Te esperamos!`
}
