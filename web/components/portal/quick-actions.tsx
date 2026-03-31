'use client'

import Link from 'next/link'
import { CalendarPlus, ShoppingBag, FileText, MessageSquare, Plus, Home } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PortalQuickActionsProps {
  clinic: string
}

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  href: string
  primary?: boolean
}

function QuickAction({ icon, label, href, primary }: QuickActionProps): React.ReactElement {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
        primary
          ? 'bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary-dark)] hover:shadow-lg'
          : 'border border-[var(--border)] bg-white text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] hover:shadow-md'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

export function PortalQuickActions({ clinic }: PortalQuickActionsProps): React.ReactElement {
  const t = useTranslations('portal.quickActions')

  return (
    <div className="flex flex-wrap gap-2">
      <QuickAction
        icon={<CalendarPlus className="h-4 w-4" />}
        label={t('bookAppointment')}
        href={`/${clinic}/services`}
        primary
      />
      <QuickAction
        icon={<Plus className="h-4 w-4" />}
        label={t('addPet')}
        href={`/${clinic}/portal/pets/new`}
      />
      <QuickAction
        icon={<ShoppingBag className="h-4 w-4" />}
        label={t('store')}
        href={`/${clinic}/store`}
      />
      <QuickAction
        icon={<FileText className="h-4 w-4" />}
        label={t('invoices')}
        href={`/${clinic}/portal/invoices`}
      />
      <QuickAction
        icon={<MessageSquare className="h-4 w-4" />}
        label={t('messages')}
        href={`/${clinic}/portal/messages`}
      />
      <QuickAction
        icon={<Home className="h-4 w-4" />}
        label={t('viewPage')}
        href={`/${clinic}?public=true`}
      />
    </div>
  )
}
