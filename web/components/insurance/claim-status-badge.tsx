'use client'

interface ClaimStatusBadgeProps {
  status: string
  className?: string
}

export default function ClaimStatusBadge({ status, className = '' }: ClaimStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const configs: { [key: string]: { label: string; color: string } } = {
      draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
      pending_documents: { label: 'Docs. Pendientes', color: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]' },
      submitted: { label: 'Enviado', color: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]' },
      under_review: { label: 'En Revisión', color: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]' },
      approved: { label: 'Aprobado', color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' },
      partially_approved: { label: 'Parcialmente Aprobado', color: 'bg-[var(--status-success-bg)] text-[var(--status-success)]' },
      denied: { label: 'Denegado', color: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]' },
      paid: { label: 'Pagado', color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' },
      appealed: { label: 'Apelado', color: 'bg-purple-100 text-purple-700' },
      closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-600' },
    }

    return configs[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  }

  const config = getStatusConfig(status)

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} ${className}`}
    >
      {config.label}
    </span>
  )
}
