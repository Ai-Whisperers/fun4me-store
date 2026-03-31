'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Users, Check, Percent, Loader2, Download } from 'lucide-react'
import type { PrivacyPolicy, AcceptanceReportEntry } from '@/lib/privacy'

interface PolicyStatsModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to close the modal */
  onClose: () => void
  /** The policy to show stats for */
  policy: PrivacyPolicy
}

interface PolicyStats {
  acceptanceCount: number
  totalUsers: number
  acceptanceRate: number
}

/**
 * Policy Stats Modal
 *
 * COMP-002: Modal showing acceptance statistics for a policy.
 */
export function PolicyStatsModal({ isOpen, onClose, policy }: PolicyStatsModalProps) {
  const [stats, setStats] = useState<PolicyStats | null>(null)
  const [report, setReport] = useState<AcceptanceReportEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'report'>('overview')

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, policy.id])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsRes, reportRes] = await Promise.all([
        fetch(`/api/privacy/${policy.id}/stats`),
        fetch(`/api/privacy/${policy.id}/report?limit=50`),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (reportRes.ok) {
        const reportData = await reportRes.json()
        setReport(reportData.data || [])
      }
    } catch (error) {
      console.error('Error loading policy stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadReport = () => {
    // Generate CSV
    const headers = ['Usuario', 'Email', 'Versión', 'Fecha', 'Método']
    const rows = report.map((r) => [
      r.userName || '-',
      r.userEmail,
      r.policyVersion,
      new Date(r.acceptedAt).toLocaleString('es-PY'),
      r.acceptanceMethod,
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aceptaciones-politica-${policy.version}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Estadísticas - Versión ${policy.version}`}
      size="lg"
    >
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-[var(--border-light)]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Resumen
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'report'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Reporte Detallado
            </button>
          </div>

          {activeTab === 'overview' && stats && (
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Total Users */}
              <div className="rounded-xl bg-[var(--bg-subtle)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Usuarios Totales</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stats.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              {/* Accepted */}
              <div className="rounded-xl bg-[var(--bg-subtle)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Han Aceptado</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stats.acceptanceCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rate */}
              <div className="rounded-xl bg-[var(--bg-subtle)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Percent className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Tasa de Aceptación</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stats.acceptanceRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div>
              {report.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-muted)]">
                  No hay aceptaciones registradas
                </div>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      onClick={downloadReport}
                      className="flex items-center gap-2 rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
                    >
                      <Download className="h-4 w-4" />
                      Descargar CSV
                    </button>
                  </div>
                  <div className="max-h-64 overflow-auto rounded-xl border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[var(--bg-subtle)]">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-muted)]">
                            Usuario
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-muted)]">
                            Fecha
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-muted)]">
                            Método
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-light)]">
                        {report.map((entry, index) => (
                          <tr key={index} className="hover:bg-[var(--bg-subtle)]">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">
                                  {entry.userName || entry.userEmail}
                                </p>
                                {entry.userName && (
                                  <p className="text-xs text-[var(--text-muted)]">
                                    {entry.userEmail}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">
                              {new Date(entry.acceptedAt).toLocaleString('es-PY', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                                {entry.acceptanceMethod}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          <ModalFooter>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[var(--bg-subtle)] px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
            >
              Cerrar
            </button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  )
}
