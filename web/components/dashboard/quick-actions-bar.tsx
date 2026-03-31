import Link from 'next/link'
import { Plus, FileText, Users, Calendar, Package } from 'lucide-react'

interface QuickActionsBarProps {
  clinic: string
  isAdmin?: boolean
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  shortcut?: string
  href: string
  primary?: boolean
}

function ActionButton({ icon, label, shortcut, href, primary }: ActionButtonProps): React.ReactElement {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
        primary
          ? 'bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary-dark)] hover:shadow-lg'
          : 'border border-[var(--border)] bg-white text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] hover:shadow-md'
      }`}
    >
      {icon}
      <span>{label}</span>
      {shortcut && (
        <kbd
          className={`hidden rounded px-1.5 py-0.5 text-[10px] font-medium lg:inline ${
            primary ? 'bg-white/20 text-white/80' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {shortcut}
        </kbd>
      )}
    </Link>
  )
}

export function QuickActionsBar({ clinic, isAdmin }: QuickActionsBarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        icon={<Plus className="h-4 w-4" />}
        label="Nueva Cita"
        shortcut="Ctrl+N"
        href={`/${clinic}/dashboard/appointments?action=new`}
        primary
      />
      <ActionButton
        icon={<FileText className="h-4 w-4" />}
        label="Facturar"
        href={`/${clinic}/dashboard/invoices?action=new`}
      />
      <ActionButton
        icon={<Users className="h-4 w-4" />}
        label="Nuevo Cliente"
        href={`/${clinic}/dashboard/clients?action=new-client`}
      />
      <ActionButton
        icon={<Calendar className="h-4 w-4" />}
        label="Ver Calendario"
        href={`/${clinic}/dashboard/calendar`}
      />
      {isAdmin && (
        <ActionButton
          icon={<Package className="h-4 w-4" />}
          label="Inventario"
          href={`/${clinic}/portal/inventory`}
        />
      )}
    </div>
  )
}
