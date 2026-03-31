import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'

export const dynamic = 'force-dynamic'

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
  conditions: Record<string, unknown> | null
  is_active: boolean
}

interface VaccineRecord {
  id: string
  pet_id: string
  name: string
  next_due_date: string | null
  pet:
    | {
        id: string
        name: string
        species: string
        owner_id: string
        tenant_id: string
        owner:
          | {
              id: string
              full_name: string
              email: string
            }
          | { id: string; full_name: string; email: string }[]
      }
    | {
        id: string
        name: string
        species: string
        owner_id: string
        tenant_id: string
        owner:
          | { id: string; full_name: string; email: string }
          | { id: string; full_name: string; email: string }[]
      }[]
}

interface AppointmentRecord {
  id: string
  pet_id: string
  owner_id: string
  start_time: string
  type: string
  status: string
  pet:
    | {
        id: string
        name: string
      }
    | { id: string; name: string }[]
  owner:
    | {
        id: string
        full_name: string
        email: string
      }
    | { id: string; full_name: string; email: string }[]
}

interface PetRecord {
  id: string
  name: string
  birth_date: string | null
  tenant_id: string
  owner_id: string
  owner:
    | {
        id: string
        full_name: string
        email: string
      }
    | { id: string; full_name: string; email: string }[]
}

/**
 * Generate Reminders Cron Job
 *
 * This runs daily (or on schedule) to generate reminders based on rules.
 * It checks for:
 * - Vaccines due soon or overdue
 * - Upcoming appointments
 * - Pet birthdays
 * - Follow-ups after visits
 */
export async function GET(request: NextRequest) {
  // SEC-006: Use timing-safe cron authentication
  const cronAuth = checkCronAuth(request)
  if (!cronAuth.authorized) {
    return cronAuth.errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient('service_role')
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const results = {
    tenants_processed: 0,
    rules_checked: 0,
    reminders_created: 0,
    reminders_skipped: 0,
    errors: [] as string[],
  }

  try {
    // 1. Get all active tenants (limit to prevent OOM on large installations)
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1000) // Safety limit - process max 1000 tenants per run

    if (tenantsError) {
      logger.error('Error fetching tenants', {
        error: tenantsError instanceof Error ? tenantsError.message : String(tenantsError),
      })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: 'No tenants found', ...results })
    }

    // 2. Process each tenant
    for (const tenant of tenants) {
      results.tenants_processed++

      // Get active reminder rules for this tenant
      const { data: rules, error: rulesError } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)

      if (rulesError) {
        results.errors.push(`Tenant ${tenant.id}: ${rulesError.message}`)
        continue
      }

      if (!rules || rules.length === 0) continue

      // Process each rule
      for (const rule of rules as ReminderRule[]) {
        results.rules_checked++

        try {
          switch (rule.type) {
            case 'vaccine_due':
              await generateVaccineReminders(supabase, tenant.id, rule, 'due', results)
              break

            case 'vaccine_overdue':
              await generateVaccineReminders(supabase, tenant.id, rule, 'overdue', results)
              break

            case 'appointment_before':
              await generateAppointmentReminders(supabase, tenant.id, rule, results)
              break

            case 'birthday':
              await generateBirthdayReminders(supabase, tenant.id, rule, results)
              break

            case 'appointment_after':
              await generateFollowUpReminders(supabase, tenant.id, rule, results)
              break

            default:
              // Custom and other types - skip automatic generation
              break
          }
        } catch (ruleError) {
          const errorMessage = ruleError instanceof Error ? ruleError.message : 'Unknown error'
          results.errors.push(`Rule ${rule.id}: ${errorMessage}`)
        }
      }

      // Log the generation run
      await supabase.from('reminder_generation_log').upsert(
        {
          tenant_id: tenant.id,
          run_date: todayStr,
          rule_type: 'all',
          reminders_checked: results.rules_checked,
          reminders_created: results.reminders_created,
          reminders_skipped: results.reminders_skipped,
          errors: results.errors.length,
          error_details: results.errors.length > 0 ? { errors: results.errors } : null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,run_date,rule_type' }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder generation completed',
      stats: results,
    })
  } catch (error) {
    logger.error('Reminder generation error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Generate vaccine reminders (due or overdue)
 */
async function generateVaccineReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  mode: 'due' | 'overdue',
  results: { reminders_created: number; reminders_skipped: number; errors: string[] }
) {
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + rule.days_offset)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // Find vaccines matching the criteria (with safety limit)
  let query = supabase
    .from('vaccines')
    .select(
      `
      id, pet_id, name, next_due_date,
      pet:pets(id, name, species, owner_id, tenant_id, owner:profiles!pets_owner_id_fkey(id, full_name, email))
    `
    )
    .eq('pet.tenant_id', tenantId)
    .not('next_due_date', 'is', null)
    .limit(500) // Safety limit - process max 500 vaccines per tenant per run

  if (mode === 'due') {
    // Vaccines due on the target date
    query = query.eq('next_due_date', targetDateStr)
  } else {
    // Vaccines overdue by X days (due date was X days ago)
    query = query.eq('next_due_date', targetDateStr)
  }

  const { data: vaccines, error } = await query

  if (error) {
    results.errors.push(`Vaccine query error: ${error.message}`)
    return
  }

  if (!vaccines || vaccines.length === 0) return

  for (const vaccine of vaccines as VaccineRecord[]) {
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
      results.reminders_skipped++
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
      results.errors.push(`Insert error for vaccine ${vaccine.id}: ${insertError.message}`)
    } else {
      results.reminders_created++
    }
  }
}

/**
 * Generate appointment reminders
 */
async function generateAppointmentReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  results: { reminders_created: number; reminders_skipped: number; errors: string[] }
) {
  const today = new Date()
  const targetDate = new Date(today)
  // For appointment_before, days_offset is negative (e.g., -1 for 1 day before)
  // So we add the absolute value to find appointments on that future date
  targetDate.setDate(today.getDate() + Math.abs(rule.days_offset))
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const { data: appointments, error} = await supabase
    .from('appointments')
    .select(
      `
      id, pet_id, owner_id, start_time, type, status,
      pet:pets(id, name),
      owner:profiles!appointments_owner_id_fkey(id, full_name, email)
    `
    )
    .eq('tenant_id', tenantId)
    .gte('start_time', `${targetDateStr}T00:00:00`)
    .lt('start_time', `${targetDateStr}T23:59:59`)
    .in('status', ['pending', 'confirmed'])
    .limit(200) // Safety limit - max 200 appointments per day per tenant

  if (error) {
    results.errors.push(`Appointment query error: ${error.message}`)
    return
  }

  if (!appointments || appointments.length === 0) return

  for (const appointment of appointments as AppointmentRecord[]) {
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
      results.reminders_skipped++
      continue
    }

    // Schedule for today at the rule's time
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
      results.errors.push(`Insert error for appointment ${appointment.id}: ${insertError.message}`)
    } else {
      results.reminders_created++
    }
  }
}

/**
 * Generate birthday reminders
 */
async function generateBirthdayReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  results: { reminders_created: number; reminders_skipped: number; errors: string[] }
) {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  // Find pets with birthday today (matching MM-DD regardless of year)
  const { data: pets, error } = await supabase
    .from('pets')
    .select(
      `
      id, name, birth_date, tenant_id, owner_id,
      owner:profiles!pets_owner_id_fkey(id, full_name, email)
    `
    )
    .eq('tenant_id', tenantId)
    .not('birth_date', 'is', null)
    .limit(1000) // Safety limit - max 1000 pets per tenant per run

  if (error) {
    results.errors.push(`Birthday query error: ${error.message}`)
    return
  }

  if (!pets || pets.length === 0) return

  for (const pet of pets as PetRecord[]) {
    if (!pet.birth_date) continue

    const petBirthday = new Date(pet.birth_date)
    const petMonth = String(petBirthday.getMonth() + 1).padStart(2, '0')
    const petDay = String(petBirthday.getDate()).padStart(2, '0')

    // Check if birthday matches today
    if (petMonth !== month || petDay !== day) continue

    const owner = pet.owner ? (Array.isArray(pet.owner) ? pet.owner[0] : pet.owner) : null
    if (!owner?.email) continue

    // Check if reminder already exists for this year
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
      results.reminders_skipped++
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
      results.errors.push(`Insert error for pet birthday ${pet.id}: ${insertError.message}`)
    } else {
      results.reminders_created++
    }
  }
}

/**
 * Generate follow-up reminders after visits
 */
async function generateFollowUpReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  rule: ReminderRule,
  results: { reminders_created: number; reminders_skipped: number; errors: string[] }
) {
  const today = new Date()
  const targetDate = new Date(today)
  // For follow-up, days_offset is positive (e.g., 7 for 7 days after)
  targetDate.setDate(today.getDate() - rule.days_offset) // Find appointments X days ago
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(
      `
      id, pet_id, owner_id, start_time, type,
      pet:pets(id, name),
      owner:profiles!appointments_owner_id_fkey(id, full_name, email)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('start_time', `${targetDateStr}T00:00:00`)
    .lt('start_time', `${targetDateStr}T23:59:59`)
    .limit(200) // Safety limit - max 200 completed appointments per day

  if (error) {
    results.errors.push(`Follow-up query error: ${error.message}`)
    return
  }

  if (!appointments || appointments.length === 0) return

  for (const appointment of appointments as AppointmentRecord[]) {
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
      results.reminders_skipped++
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
      results.errors.push(`Insert error for follow-up ${appointment.id}: ${insertError.message}`)
    } else {
      results.reminders_created++
    }
  }
}
