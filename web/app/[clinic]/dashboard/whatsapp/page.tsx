import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { Inbox } from '@/components/whatsapp/inbox'
import { getConversations, getWhatsAppStats, getWhatsAppWeeklyTrend } from '@/app/actions/whatsapp'
import { requireFeature } from '@/lib/features/server'
import { UpgradePromptServer } from '@/components/dashboard/upgrade-prompt-server'
import { WhatsAppWeeklyTrendChart } from '@/components/whatsapp/weekly-trend-chart'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function WhatsAppPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Staff check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role) || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Feature gate: WhatsApp Business API requires 'whatsappApi' feature
  const featureError = await requireFeature(profile.tenant_id, 'whatsappApi')
  if (featureError) {
    return (
      <UpgradePromptServer
        feature="whatsappApi"
        title="WhatsApp Business API"
        description="Envía mensajes automatizados, recordatorios y comunicaciones masivas por WhatsApp."
        clinic={clinic}
      />
    )
  }

  // Fetch conversations, stats, and weekly trend in parallel
  const [conversationsResult, statsResult, weeklyTrendResult] = await Promise.all([
    getConversations(clinic),
    getWhatsAppStats(clinic),
    getWhatsAppWeeklyTrend(clinic),
  ])

  const conversations =
    'data' in conversationsResult && conversationsResult.data ? conversationsResult.data : []
  const stats = 'data' in statsResult && statsResult.data ? statsResult.data : null
  const weeklyTrend =
    'data' in weeklyTrendResult && weeklyTrendResult.data ? weeklyTrendResult.data : []

  // Stats
  const totalConversations = conversations.length
  const unreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0)
  const sentToday = stats?.sentToday ?? 0
  const failedToday = stats?.failedToday ?? 0
  const deliveryRate = stats?.deliveryRate ?? 100
  const totalThisWeek = stats?.totalThisWeek ?? 0

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">WhatsApp</h1>
          <p className="text-[var(--text-secondary)]">Mensajería con clientes</p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/${clinic}/dashboard/whatsapp/templates`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-[var(--text-primary)] hover:bg-gray-50"
          >
            <Icons.FileText className="h-4 w-4" />
            Plantillas
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-blue-600">
            <Icons.MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">Conversaciones</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{totalConversations}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-green-600">
            <Icons.Bell className="h-4 w-4" />
            <span className="text-xs font-medium">Sin Leer</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{unreadCount}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-purple-600">
            <Icons.Send className="h-4 w-4" />
            <span className="text-xs font-medium">Enviados Hoy</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{sentToday}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-orange-600">
            <Icons.AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Fallidos</span>
          </div>
          <p
            className={`text-2xl font-bold ${failedToday > 0 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}
          >
            {failedToday}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-emerald-600">
            <Icons.CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Tasa Entrega</span>
          </div>
          <p
            className={`text-2xl font-bold ${deliveryRate < 90 ? 'text-amber-600' : 'text-emerald-600'}`}
          >
            {deliveryRate}%
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-indigo-600">
            <Icons.Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">Esta Semana</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{totalThisWeek}</p>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="mb-6">
        <WhatsAppWeeklyTrendChart data={weeklyTrend} />
      </div>

      {/* Inbox */}
      <Inbox conversations={conversations} clinic={clinic} />
    </div>
  )
}
