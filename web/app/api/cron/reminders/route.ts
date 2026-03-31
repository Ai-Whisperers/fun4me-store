/**
 * Process Reminders Cron Job
 *
 * Processes pending reminders that are due and sends notifications.
 * Supports email, SMS (via integration), and WhatsApp.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { buildReminderContent } from '@/lib/reminders/content-builder'
import { sendReminderToChannels } from '@/lib/reminders/channel-sender'
import { checkCronAuth } from '@/lib/api/cron-auth'
import type { Reminder, ClientInfo, PetInfo, MessageTemplate } from '@/lib/reminders/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized) {
    // checkCronAuth guarantees errorResponse when !authorized
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createClient('service_role')
  const now = new Date()

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // 1. Get pending reminders due now or earlier
    const { data: reminders, error: fetchError } = await supabase
      .from('reminders')
      .select(`
        id, tenant_id, client_id, pet_id, type,
        reference_type, reference_id, scheduled_at,
        status, attempts, max_attempts,
        channels, channels_sent,
        custom_subject, custom_body,
        client:profiles!reminders_client_id_fkey(id, full_name, email, phone),
        pet:pets(id, name, species)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString())
      .lt('attempts', 3)
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      logger.error('Error fetching reminders', { error: fetchError.message })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ message: 'No pending reminders', ...results })
    }

    // 2. Get message templates
    const { data: templates } = await supabase
      .from('message_templates')
      .select('id, code, name, subject, content, content_html, variables')
      .eq('is_active', true)
      .is('deleted_at', null)

    const templateMap = new Map<string, MessageTemplate>()
    templates?.forEach((t) => templateMap.set(t.code, t as MessageTemplate))

    // 3. Get tenant details for branding
    const tenantIds = [...new Set(reminders.map((r) => r.tenant_id))]
    const { data: tenants } = await supabase.from('tenants').select('id, name').in('id', tenantIds)

    const tenantMap = new Map<string, { name: string }>()
    tenants?.forEach((t) => tenantMap.set(t.id, { name: t.name }))

    // 4. Process each reminder
    for (const rawReminder of reminders) {
      const reminder = rawReminder as unknown as Reminder
      results.processed++

      try {
        // Mark as processing
        await supabase
          .from('reminders')
          .update({
            status: 'processing',
            last_attempt_at: now.toISOString(),
            attempts: (reminder.attempts || 0) + 1,
          })
          .eq('id', reminder.id)

        // Get client and pet info
        const client = (Array.isArray(reminder.client) ? reminder.client[0] : reminder.client) as ClientInfo
        const pet = reminder.pet
          ? (Array.isArray(reminder.pet) ? reminder.pet[0] : reminder.pet) as PetInfo
          : null

        // Get tenant info
        const tenant = tenantMap.get(reminder.tenant_id)
        const clinicName = tenant?.name || 'Veterinaria'

        // Build message content
        const content = await buildReminderContent(
          supabase,
          reminder,
          client,
          pet,
          clinicName,
          templateMap
        )

        // Send to all configured channels
        const channelResults = await sendReminderToChannels(supabase, reminder, client, content)

        // Determine overall status
        const successfulChannels = channelResults.filter((r) => r.success).map((r) => r.channel)
        const alreadySent = reminder.channels_sent || []
        const allChannelsSent = [...alreadySent, ...successfulChannels]
        const atLeastOneSuccess = successfulChannels.length > 0

        if (atLeastOneSuccess) {
          // Mark as sent if at least one channel succeeded
          await supabase
            .from('reminders')
            .update({
              status: 'sent',
              channels_sent: allChannelsSent,
            })
            .eq('id', reminder.id)

          results.sent++
        } else {
          // All channels failed
          throw new Error(
            `All channels failed: ${channelResults.map((r) => `${r.channel}: ${r.error}`).join(', ')}`
          )
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Reminder ${reminder.id}: ${errorMessage}`)
        results.failed++

        // Update reminder with error
        const attempts = (reminder.attempts || 0) + 1
        await supabase
          .from('reminders')
          .update({
            status: attempts >= (reminder.max_attempts || 3) ? 'failed' : 'pending',
            error_message: errorMessage,
            next_attempt_at:
              attempts < (reminder.max_attempts || 3)
                ? new Date(now.getTime() + 60 * 60 * 1000).toISOString() // Retry in 1 hour
                : null,
          })
          .eq('id', reminder.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} reminders`,
      stats: results,
    })
  } catch (error) {
    logger.error('Reminder processing error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
