import Link from 'next/link'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import type { FeatureName } from '@/lib/features'

interface UpgradePromptServerProps {
  feature: FeatureName
  title: string
  description: string
  clinic: string
}

/**
 * Server-side upgrade prompt for gated features
 *
 * Used in server components when a feature is not available in the tenant's tier.
 * Shows a full-page prompt with upgrade CTA.
 */
export function UpgradePromptServer({
  feature,
  title,
  description,
  clinic,
}: UpgradePromptServerProps): React.ReactElement {
  const featureIcons: Partial<Record<FeatureName, React.ReactNode>> = {
    hospitalization: '🏥',
    laboratory: '🔬',
    ecommerce: '🛒',
    analyticsAdvanced: '📊',
    analyticsAI: '🤖',
    whatsappApi: '💬',
    multiLocation: '🏢',
    qrTags: '📱',
    bulkOrdering: '📦',
  }

  const icon = featureIcons[feature] || '✨'

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-4xl shadow-lg">
          {icon}
        </div>

        {/* Lock Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--status-warning-bg)] px-4 py-1.5 text-sm font-medium text-[var(--status-warning)]">
          <Lock className="h-4 w-4" />
          Función Premium
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">{title}</h1>

        {/* Description */}
        <p className="mb-8 text-[var(--text-secondary)]">{description}</p>

        {/* Features List */}
        <div className="mb-8 rounded-xl border border-[var(--border-color)] bg-white p-6 text-left shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
            Incluido en planes superiores
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-success)] text-xs text-white">
                ✓
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                Acceso completo a esta función y más
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-success)] text-xs text-white">
                ✓
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                Soporte prioritario y actualizaciones
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-success)] text-xs text-white">
                ✓
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                Sin límites en el uso de la plataforma
              </span>
            </li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Ver Planes
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/${clinic}/dashboard`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-white px-6 py-3 font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            Volver al Dashboard
          </Link>
        </div>

        {/* Contact */}
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          ¿Tienes preguntas?{' '}
          <Link href="/contacto" className="text-[var(--primary)] hover:underline">
            Contáctanos
          </Link>
        </p>
      </div>
    </div>
  )
}
