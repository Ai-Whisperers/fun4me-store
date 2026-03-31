import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

/**
 * Dashboard-scoped 404 page
 * Shown when a dashboard resource is not found or user doesn't have access
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="space-y-6">
        <div className="text-6xl">📋</div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Página no encontrada</h1>
          <p className="text-[var(--text-secondary)]">Esta sección no existe o fue movida.</p>
        </div>

        <div className="flex justify-center gap-3">
          <Link
            href=".."
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] px-5 py-3 text-base font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-subtle)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
