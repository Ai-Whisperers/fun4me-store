'use client'

import { useState } from 'react'
import { History, Gift, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Copy, Check } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Transaction {
  id: string
  points: number
  description: string | null
  type: string
  created_at: string
  balance_after: number | null
}

interface Redemption {
  id: string
  points_spent: number
  redemption_code: string
  status: string
  expires_at: string
  used_at: string | null
  created_at: string
  reward: {
    name: string
    description: string | null
    reward_type: string
    reward_value: number | null
  } | null
}

interface LoyaltyClientProps {
  clinic: string
  transactions: Transaction[]
  redemptions: Redemption[]
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  approved: { label: 'Disponible', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  used: { label: 'Usado', icon: CheckCircle, color: 'text-gray-600 bg-gray-100' },
  expired: { label: 'Expirado', icon: XCircle, color: 'text-red-600 bg-red-100' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600 bg-red-100' },
}

const TYPE_CONFIG = {
  earn: { label: 'Ganado', icon: TrendingUp, color: 'text-green-600' },
  redeem: { label: 'Canjeado', icon: TrendingDown, color: 'text-red-600' },
  expire: { label: 'Expirado', icon: Clock, color: 'text-gray-500' },
  adjust: { label: 'Ajuste', icon: History, color: 'text-blue-600' },
  bonus: { label: 'Bonus', icon: Gift, color: 'text-purple-600' },
}

export function LoyaltyClient({ clinic: _clinic, transactions, redemptions }: LoyaltyClientProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'redemptions'>('transactions')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[var(--border-light)]">
        <button
          role="tab"
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition ${
            activeTab === 'transactions'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <History className="h-4 w-4" />
          Historial
        </button>
        <button
          role="tab"
          onClick={() => setActiveTab('redemptions')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition ${
            activeTab === 'redemptions'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Gift className="h-4 w-4" />
          Historial de canjes
        </button>
      </div>

      {/* Transaction History */}
      {activeTab === 'transactions' && (
        <div data-testid="transaction-history">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <History className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-[var(--text-muted)]">No hay transacciones aún</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Realiza compras para empezar a acumular puntos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const typeConfig = TYPE_CONFIG[tx.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.earn
                const TypeIcon = typeConfig.icon
                const isPositive = tx.points > 0

                return (
                  <div
                    key={tx.id}
                    data-testid="transaction-item"
                    className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isPositive ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {tx.description || typeConfig.label}
                        </p>
                        <time className="text-sm text-[var(--text-muted)]">
                          {formatDistanceToNow(new Date(tx.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </time>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {isPositive ? '+' : ''}
                        {tx.points.toLocaleString()}
                      </p>
                      {tx.balance_after !== null && (
                        <p className="text-sm text-[var(--text-muted)]">
                          Saldo: {tx.balance_after.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Redemption History */}
      {activeTab === 'redemptions' && (
        <div data-testid="redemption-history">
          {redemptions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Gift className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-[var(--text-muted)]">No has canjeado recompensas aún</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Visita el catálogo de recompensas para ver las opciones disponibles
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.map((redemption) => {
                const statusConfig =
                  STATUS_CONFIG[redemption.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                const StatusIcon = statusConfig.icon
                const isActive = redemption.status === 'approved'

                return (
                  <div
                    key={redemption.id}
                    data-testid="redemption-item"
                    className="overflow-hidden rounded-xl bg-[var(--bg-secondary)]"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                          <Gift className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {redemption.reward?.name || 'Recompensa'}
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">
                            {redemption.points_spent.toLocaleString()} puntos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-4 w-4" />
                          {statusConfig.label}
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {format(new Date(redemption.created_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>

                    {/* Redemption code for active redemptions */}
                    {isActive && (
                      <div className="border-t border-[var(--border-light)] bg-[var(--bg-default)] p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--text-muted)]">Código de canje</p>
                            <p
                              className="font-mono text-lg font-bold text-[var(--primary)]"
                              data-testid="redemption-code"
                            >
                              {redemption.redemption_code}
                            </p>
                          </div>
                          <button
                            onClick={() => copyCode(redemption.redemption_code)}
                            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                          >
                            {copiedCode === redemption.redemption_code ? (
                              <>
                                <Check className="h-4 w-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                Copiar
                              </>
                            )}
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                          Válido hasta:{' '}
                          {format(new Date(redemption.expires_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}

                    {/* Used info */}
                    {redemption.status === 'used' && redemption.used_at && (
                      <div className="border-t border-[var(--border-light)] bg-green-50 p-4">
                        <p className="text-sm text-green-700">
                          Usado el {format(new Date(redemption.used_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
