import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PageAction {
  label: string
  href?: string
  onClick?: () => void
  icon?: LucideIcon
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
}

interface DashboardPageLayoutProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: PageAction[]
  breadcrumbs?: Array<{ label: string; href?: string }>
  children: React.ReactNode
}

export function DashboardPageLayout({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumbs,
  children,
}: DashboardPageLayoutProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-sm">
          <ol className="flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-[var(--text-muted)]">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--text-primary)]">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="bg-[var(--primary)]/10 rounded-lg p-2">
              <Icon className="h-6 w-6 text-[var(--primary)]" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
            {description && <p className="mt-1 text-[var(--text-secondary)]">{description}</p>}
          </div>
        </div>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => {
              const ActionIcon = action.icon
              return action.href ? (
                <Link key={index} href={action.href}>
                  <Button variant={action.variant || 'primary'}>
                    {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                    {action.label}
                  </Button>
                </Link>
              ) : (
                <Button key={index} variant={action.variant || 'primary'} onClick={action.onClick}>
                  {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                  {action.label}
                </Button>
              )
            })}
          </div>
        )}
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  )
}
