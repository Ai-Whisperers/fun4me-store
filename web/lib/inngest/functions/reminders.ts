/**
 * Inngest Reminder Functions
 *
 * Background jobs for reminder operations:
 * - Generate reminders from rules (vaccines, appointments, birthdays)
 * - Process and send pending reminders
 */

import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// =============================================================================
// TYPES
// =============================================================================

interface ReminderRule {
  id: string
  tenant_id: string
  name: string
  type: string
  days_offset: number
  hours_offset: number | null
  time_of_day: string
  channels: string[]
  template_id: string | null
  is_active: boolean
}

interface GenerationResult {
  tenantsProcessed: number
  rulesChecked: number
  remindersCreated: number
  remindersSkipped: number
  errors: string[]
}

// =============================================================================
// GENERATE REMINDERS
// =============================================================================

export const generateReminders = inngest.createFunction(
  {
    id: 'reminders-generate',
    name: 'Generate Reminders',
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: '0 6 * * *' }, // Daily at 06:00 UTC (02:00 Paraguay)
  async ({ step }) => {
    // For cron jobs, process all tenants and all reminder types
    const tenantId: string | undefined = undefined
    const types: string[] | undefined = undefined

    const result: GenerationResult = {
      tenantsProcessed: 0,
      rulesChecked: 0,
      remindersCreated: 0,
      remindersSkipped: 0,
      errors: [],
    }

    logger.info('Starting reminder generation', { tenantId, types })

    // Step 1: Get tenants to process
    const tenants = await step.run('fetch-tenants', async () => {
      const supabase = await createClient('service_role')

      let query = supabase.from('tenants').select('id, name').limit(1000)

      if (tenantId) {
        query = query.eq('id', tenantId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Error fetching tenants: ${error.message}`)
      }

      return data || []
    })

    if (tenants.length === 0) {
      return { success: true, message: 'No tenants found', ...result }
    }

    // Step 2: Process each tenant
    for (const tenant of tenants) {
      const tenantResult = await step.run(`process-tenant-${tenant.id}`, async () => {
        return await processTenanReminders(tenant.id, types, result)
      })

      result.tenantsProcessed++
      result.rulesChecked += tenantResult.rulesChecked
      result.remindersCreated += tenantResult.created
      result.remindersSkipped += tenantResult.skipped
      result.errors.push(...tenantResult.errors)
    }

    // Step 3: Log the generation run
    await step.run('log-generation', async () => {
      const supabase = await createClient('service_role')
      const today = new Date().toISOString().split('T')[0]

      await supabase.from('reminder_generation_log').upsert(
        {
          tenant_id: tenantId || 'all',
          run_date: today,
          rule_type: 'all',
          reminders_checked: result.rulesChecked,
          reminders_created: result.remindersCreated,
          reminders_skipped: result.remindersSkipped,
          errors: result.errors.length,
          error_details: result.errors.length > 0 ? { errors: result.errors } : null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,run_date,rule_type' }
      )
    })

    logger.info('Reminder generation completed', { ...result })

    return {
      success: result.errors.length === 0,
      message: 'Reminder generation completed',
      ...result,
    }
  }
)

async function processTenanReminders(
  tenantId: string,
  types: string[] | undefined,
  globalResult: GenerationResult
): Promise<{ rulesChecked: number; created: number; skipped: number; errors: string[] }> {
  const supabase = await createClient('service_role')
  const today = new Date()
  const result = { rulesChecked: 0, created: 0, skipped: 0, errors: [] as string[] }

  // Get active reminder rules
  let query = supabase
    .from('reminder_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (types && types.length > 0) {
    query = query.in('type', types)
  }

  const { data: rules, error: rulesError } = await query

  if (rulesError) {
    result.errors.push(`Tenant ${tenantId}: ${rulesError.message}`)
    return result
  }

  if (!rules || rules.length === 0) {
    return result
  }

  // Process each rule
  for (const rule of rules as ReminderRule[]) {
    result.rulesChecked++

    try {
      switch (rule.type) {
        case 'vaccine_due':
          await generateVaccineReminders(supabase, tenantId, rule, 'due', result)
          break

        case 'vaccine_overdue':
          await generateVaccineReminders(supabase, tenantId, rule, 'overdue', result)
          break

        case 'appointment_before':
          await generateAppointmentReminders(supabase, tenantId, rule, result)
          break

        case 'birthday':
          await generateBirthdayReminders(supabase, tenantId, rule, result)
          break

        case 'appointment_after':
          await generateFollowUpReminders(supabase, tenantId, rule, result)
          break
      }
    } catch (ruleError: unknown) {
      const errorMessage = ruleError instanceof Error ? ruleError.message : 'Unknown error'
      result.errors.push(`Rule ${rule.id}: ${errorMessage}`)
    }
  }

  return result
}

async function generateVaccineReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  mode: 'due' | 'overdue',
  result: { created: number; skipped: number; errors: string[] }
): Promise<void> {
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + rule.days_offset)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const { data: vaccines, error } = await supabase
    .from('vaccines')
    .select(`
      id, pet_id, name, next_due_date,
      pet:pets(id, name, species, owner_id, tenant_id, owner:profiles!pets_owner_id_fkey(id, full_name, email))
    `)
    .eq('pet.tenant_id', tenantId)
    .not('next_due_date', 'is', null)
    .eq('next_due_date', targetDateStr)
    .limit(500)

  if (error) {
    result.errors.push(`Vaccine query error: ${error.message}`)
    return
  }

  if (!vaccines || vaccines.length === 0) return

  for (const vaccine of vaccines) {
    const pet = Array.isArray(vaccine.pet) ? vaccine.pet[0] : vaccine.pet
    if (!pet) continue

    const owner = pet.owner ? (Array.isArray(pet.owner) ? pet.owner[0] : pet.owner) : null
    if (!owner?.email) continue

    // Check if reminder already exists
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('reference_type', 'vaccine')
      .eq('reference_id', vaccine.id)
      .eq('type', mode === 'due' ? 'vaccine_reminder' : 'vaccine_overdue')
      .gte('scheduled_at', today.toISOString().split('T')[0])
      .single()

    if (existing) {
      result.skipped++
      continue
    }

    // Create reminder
    const scheduledAt = new Date()
    scheduledAt.setHours(
      parseInt(rule.time_of_day.split(':')[0]),
      parseInt(rule.time_of_day.split(':')[1]),
      0,
      0
    )

    const { error: insertError } = await supabase.from('reminders').insert({
      tenant_id: tenantId,
      client_id: owner.id,
      pet_id: pet.id,
      type: mode === 'due' ? 'vaccine_reminder' : 'vaccine_overdue',
      reference_type: 'vaccine',
      reference_id: vaccine.id,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
    })

    if (insertError) {
      result.errors.push(`Insert error for vaccine ${vaccine.id}: ${insertError.message}`)
    } else {
      result.created++
    }
  }
}

async function generateAppointmentReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  result: { created: number; skipped: number; errors: string[] }
): Promise<void> {
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + Math.abs(rule.days_offset))
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id, pet_id, owner_id, start_time, type, status,
      pet:pets(id, name),
      owner:profiles!appointments_owner_id_fkey(id, full_name, email)
    `)
    .eq('tenant_id', tenantId)
    .gte('start_time', `${targetDateStr}T00:00:00`)
    .lt('start_time', `${targetDateStr}T23:59:59`)
    .in('status', ['pending', 'confirmed'])
    .limit(200)

  if (error) {
    result.errors.push(`Appointment query error: ${error.message}`)
    return
  }

  if (!appointments || appointments.length === 0) return

  for (const appointment of appointments) {
    const pet = Array.isArray(appointment.pet) ? appointment.pet[0] : appointment.pet
    const owner = appointment.owner
      ? Array.isArray(appointment.owner)
        ? appointment.owner[0]
        : appointment.owner
      : null

    if (!owner?.email) continue

    // Check if reminder already exists
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('reference_type', 'appointment')
      .eq('reference_id', appointment.id)
      .eq('type', 'appointment_reminder')
      .single()

    if (existing) {
      result.skipped++
      continue
    }

    const scheduledAt = new Date()
    scheduledAt.setHours(
      parseInt(rule.time_of_day.split(':')[0]),
      parseInt(rule.time_of_day.split(':')[1]),
      0,
      0
    )

    const { error: insertError } = await supabase.from('reminders').insert({
      tenant_id: tenantId,
      client_id: owner.id,
      pet_id: pet?.id || null,
      type: 'appointment_reminder',
      reference_type: 'appointment',
      reference_id: appointment.id,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
    })

    if (insertError) {
      result.errors.push(`Insert error for appointment ${appointment.id}: ${insertError.message}`)
    } else {
      result.created++
    }
  }
}

async function generateBirthdayReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  result: { created: number; skipped: number; errors: string[] }
): Promise<void> {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  const { data: pets, error } = await supabase
    .from('pets')
    .select(`
      id, name, birth_date, tenant_id, owner_id,
      owner:profiles!pets_owner_id_fkey(id, full_name, email)
    `)
    .eq('tenant_id', tenantId)
    .not('birth_date', 'is', null)
    .limit(1000)

  if (error) {
    result.errors.push(`Birthday query error: ${error.message}`)
    return
  }

  if (!pets || pets.length === 0) return

  for (const pet of pets) {
    if (!pet.birth_date) continue

    const petBirthday = new Date(pet.birth_date)
    const petMonth = String(petBirthday.getMonth() + 1).padStart(2, '0')
    const petDay = String(petBirthday.getDate()).padStart(2, '0')

    if (petMonth !== month || petDay !== day) continue

    const owner = pet.owner ? (Array.isArray(pet.owner) ? pet.owner[0] : pet.owner) : null
    if (!owner?.email) continue

    // Check if reminder already exists this year
    const yearStart = `${today.getFullYear()}-01-01`
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('reference_type', 'pet')
      .eq('reference_id', pet.id)
      .eq('type', 'birthday')
      .gte('scheduled_at', yearStart)
      .single()

    if (existing) {
      result.skipped++
      continue
    }

    const scheduledAt = new Date()
    scheduledAt.setHours(
      parseInt(rule.time_of_day.split(':')[0]),
      parseInt(rule.time_of_day.split(':')[1]),
      0,
      0
    )

    const { error: insertError } = await supabase.from('reminders').insert({
      tenant_id: tenantId,
      client_id: owner.id,
      pet_id: pet.id,
      type: 'birthday',
      reference_type: 'pet',
      reference_id: pet.id,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
    })

    if (insertError) {
      result.errors.push(`Insert error for birthday ${pet.id}: ${insertError.message}`)
    } else {
      result.created++
    }
  }
}

async function generateFollowUpReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  result: { created: number; skipped: number; errors: string[] }
): Promise<void> {
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() - rule.days_offset)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id, pet_id, owner_id, start_time, type,
      pet:pets(id, name),
      owner:profiles!appointments_owner_id_fkey(id, full_name, email)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('start_time', `${targetDateStr}T00:00:00`)
    .lt('start_time', `${targetDateStr}T23:59:59`)
    .limit(200)

  if (error) {
    result.errors.push(`Follow-up query error: ${error.message}`)
    return
  }

  if (!appointments || appointments.length === 0) return

  for (const appointment of appointments) {
    const pet = Array.isArray(appointment.pet) ? appointment.pet[0] : appointment.pet
    const owner = appointment.owner
      ? Array.isArray(appointment.owner)
        ? appointment.owner[0]
        : appointment.owner
      : null

    if (!owner?.email) continue

    // Check if reminder already exists
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('reference_type', 'appointment')
      .eq('reference_id', appointment.id)
      .eq('type', 'follow_up')
      .single()

    if (existing) {
      result.skipped++
      continue
    }

    const scheduledAt = new Date()
    scheduledAt.setHours(
      parseInt(rule.time_of_day.split(':')[0]),
      parseInt(rule.time_of_day.split(':')[1]),
      0,
      0
    )

    const { error: insertError } = await supabase.from('reminders').insert({
      tenant_id: tenantId,
      client_id: owner.id,
      pet_id: pet?.id || null,
      type: 'follow_up',
      reference_type: 'appointment',
      reference_id: appointment.id,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
    })

    if (insertError) {
      result.errors.push(`Insert error for follow-up ${appointment.id}: ${insertError.message}`)
    } else {
      result.created++
    }
  }
}

// =============================================================================
// PROCESS REMINDERS
// =============================================================================

export const processReminders = inngest.createFunction(
  {
    id: 'reminders-process',
    name: 'Process Pending Reminders',
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: '*/15 * * * *' }, // Every 15 minutes
  async ({ step }) => {
    // Default: process 50 reminders per batch across all channels
    const batchSize = 50
    const channels = ['email', 'sms', 'whatsapp']

    const result = await step.run('process-reminders', async () => {
      const supabase = await createClient('service_role')
      const now = new Date().toISOString()

      // Get pending reminders
      const { data: reminders, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', now)
        .limit(batchSize)

      if (error) {
        throw new Error(`Query error: ${error.message}`)
      }

      if (!reminders || reminders.length === 0) {
        return { processed: 0, sent: 0, failed: 0 }
      }

      let sent = 0
      let failed = 0

      for (const reminder of reminders) {
        try {
          // Mark as sent (actual sending would happen via external service)
          await supabase
            .from('reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', reminder.id)

          sent++
        } catch (e: unknown) {
          await supabase
            .from('reminders')
            .update({
              status: 'failed',
              error_message: e instanceof Error ? e.message : 'Unknown error',
            })
            .eq('id', reminder.id)

          failed++
        }
      }

      return { processed: reminders.length, sent, failed }
    })

    logger.info('Reminders processed', result)
    return { success: true, ...result }
  }
)
