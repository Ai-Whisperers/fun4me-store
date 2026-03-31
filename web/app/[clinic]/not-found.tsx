import Link from 'next/link'
import { Home, PawPrint, Search } from 'lucide-react'

/**
 * Clinic-scoped 404 page - shown when no route matches within a clinic
 * Uses clinic theme variables for consistent branding
 */
export default function ClinicNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-default)] px-4">
      <div className="w-full max-w-lg text-center">
        {/* Animated Paw */}
        <div className="relative mb-8">
          <div className="shadow-[var(--primary)]/20 mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark,var(--primary))] shadow-xl">
            <PawPrint className="h-16 w-16 text-white" />
          </div>
          <div className="absolute -bottom-4 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full bg-black/10 blur-sm" />
        </div>

        {/* Error Code */}
        <h1 className="mb-2 text-8xl font-black text-gray-200">404</h1>

        {/* Message */}
        <h2 className="mb-3 text-2xl font-bold text-[var(--text-primary)]">Página no encontrada</h2>
        <p className="mx-auto mb-8 max-w-md text-[var(--text-secondary)]">
          Parece que esta página se escapó del corral. No te preocupes, te ayudamos a volver al
          camino correcto.
        </p>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="../"
            className="shadow-[var(--primary)]/20 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-lg transition-opacity hover:opacity-90"
          >
            <Home className="h-5 w-5" />
            Ir al Inicio
          </Link>
          <Link
            href="../services"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-bold text-[var(--text-primary)] transition-colors hover:bg-gray-50"
          >
            <Search className="h-5 w-5" />
            Ver Servicios
          </Link>
        </div>

        {/* Help Text */}
        <div className="bg-[var(--primary)]/5 border-[var(--primary)]/10 mt-12 rounded-xl border p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            ¿Necesitas ayuda? Contáctanos por WhatsApp o visita nuestra página de contacto.
          </p>
        </div>
      </div>
    </div>
  )
}
