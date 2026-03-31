'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
  Banknote,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface Payout {
  id: string
  amount: number
  status: string
  bank_name: string
  bank_account: string
  created_at: string
  completed_at: string | null
  failure_reason: string | null
}

interface PayoutSummary {
  pending_payout: number
  total_paid: number
  minimum_payout: number
  can_request_payout: boolean
  saved_bank_details: {
    bank_name: string
    bank_account: string
    bank_holder_name: string
  } | null
}

export default function AmbassadorPayoutsPage() {
  const router = useRouter()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankHolderName, setBankHolderName] = useState('')

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ambassador/payouts')

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/ambassador/login')
          return
        }
        throw new Error('Error fetching payouts')
      }

      const data = await res.json()
      setPayouts(data.payouts || [])
      setSummary(data.summary)

      // Pre-fill bank details if saved
      if (data.summary?.saved_bank_details) {
        setBankName(data.summary.saved_bank_details.bank_name)
        setBankAccount(data.summary.saved_bank_details.bank_account)
        setBankHolderName(data.summary.saved_bank_details.bank_holder_name)
      }
    } catch (error) {
      logger.error('Error loading payouts', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchPayouts()
  }, [fetchPayouts])

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/ambassador/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName,
          bankAccount,
          bankHolderName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al solicitar pago')
      }

      setSuccess(data.message)
      setShowForm(false)
      fetchPayouts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return `Gs ${amount.toLocaleString('es-PY')}`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="h-4 w-4" /> },
      approved: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <CheckCircle className="h-4 w-4" /> },
      processing: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="h-4 w-4" /> },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="h-4 w-4" /> },
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
    }
    const style = styles[status] || styles.pending
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {labels[status] || status}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/ambassador" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al Panel</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Pagos</h1>
        <p className="text-gray-600">Solicita y rastrea tus pagos de comisión</p>

        {/* Summary Cards */}
        {summary && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                  <Banknote className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Saldo disponible</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.pending_payout)}
                  </p>
                </div>
              </div>
              {summary.can_request_payout ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
                >
                  Solicitar pago
                </button>
              ) : (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Mínimo para retiro: {formatCurrency(summary.minimum_payout)}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total pagado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.total_paid)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {success && (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Payout Request Form */}
        {showForm && summary?.can_request_payout && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Solicitar Pago</h2>
            <p className="text-sm text-gray-600">
              Monto a cobrar: <strong>{formatCurrency(summary.pending_payout)}</strong>
            </p>

            <form onSubmit={handleRequestPayout} className="mt-4 space-y-4">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">
                  Banco
                </label>
                <input
                  type="text"
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ej: Banco Continental"
                />
              </div>

              <div>
                <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  id="bankAccount"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Número de cuenta bancaria"
                />
              </div>

              <div>
                <label htmlFor="bankHolderName" className="block text-sm font-medium text-gray-700">
                  Nombre del Titular
                </label>
                <input
                  type="text"
                  id="bankHolderName"
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Nombre como aparece en la cuenta"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Solicitar Pago'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payout History */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Historial de Pagos</h2>
          </div>

          {payouts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Aún no tienes pagos registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(payout.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payout.bank_name} - {payout.bank_account}
                    </p>
                    <p className="text-xs text-gray-400">
                      Solicitado: {formatDate(payout.created_at)}
                      {payout.completed_at && ` • Completado: ${formatDate(payout.completed_at)}`}
                    </p>
                    {payout.failure_reason && (
                      <p className="text-xs text-red-500">
                        Motivo: {payout.failure_reason}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(payout.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 rounded-lg bg-gray-100 p-4">
          <h3 className="font-medium text-gray-900">¿Cómo funcionan los pagos?</h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            <li>• Los pagos se procesan en 3-5 días hábiles</li>
            <li>• Monto mínimo para retiro: {formatCurrency(summary?.minimum_payout || 500000)}</li>
            <li>• Las comisiones se acreditan cuando la clínica paga su primera suscripción</li>
            <li>• Solo se puede tener una solicitud de pago activa a la vez</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
