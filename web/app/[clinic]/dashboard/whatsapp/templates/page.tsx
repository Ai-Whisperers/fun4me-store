import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { TemplateManager } from '@/components/whatsapp/template-manager'
import { getTemplates } from '@/app/actions/whatsapp'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function WhatsAppTemplatesPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Admin check (templates management is admin-only)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/dashboard/whatsapp`)
  }

  // Fetch templates
  const result = await getTemplates(clinic)
  const templates = 'data' in result ? result.data : []

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${clinic}/dashboard/whatsapp`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          Volver a WhatsApp
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Plantillas de WhatsApp
            </h1>
            <p className="text-[var(--text-secondary)]">Crea y gestiona plantillas de mensajes</p>
          </div>
        </div>
      </div>

      {/* Template Manager */}
      <TemplateManager templates={templates} clinic={clinic} />
    </div>
  )
}
