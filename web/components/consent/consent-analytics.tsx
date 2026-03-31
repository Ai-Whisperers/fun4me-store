'use client'

/**
 * ConsentAnalytics Component
 *
 * COMP-003: Admin dashboard for viewing consent analytics
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
} from 'lucide-react'
import { type ConsentAnalytics, CONSENT_DESCRIPTIONS, type ConsentType } from '@/lib/consent'

interface ConsentAnalyticsProps {
  /** Callback for exporting report */
  onExportReport?: () => void
}

export function ConsentAnalyticsDashboard({ onExportReport }: ConsentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ConsentAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/consents/preferences/analytics')
      if (!response.ok) {
        throw new Error('Error al cargar analíticas')
      }
      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  // Calculate totals
  const totalUsers = analytics[0]?.totalUsers ?? 0
  const avgGrantRate =
    analytics.length > 0
      ? analytics.reduce((sum, a) => sum + a.grantRate, 0) / analytics.length
      : 0
  const totalChanges = analytics.reduce((sum, a) => sum + a.changesLast30Days, 0)

  // Export analytics as CSV
  const handleExport = () => {
    const headers = [
      'Tipo',
      'Etiqueta',
      'Total Usuarios',
      'Otorgados',
      'Retirados',
      'Sin Configurar',
      'Tasa (%)',
      'Cambios (30 días)',
    ]
    const rows = analytics.map((a) => [
      a.consentType,
      CONSENT_DESCRIPTIONS[a.consentType]?.label ?? a.consentType,
      a.totalUsers,
      a.grantedCount,
      a.withdrawnCount,
      a.neverSetCount,
      a.grantRate.toFixed(2),
      a.changesLast30Days,
    ])

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consent-analytics-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    onExportReport?.()
  }

  // Trend indicator
  const getTrendIndicator = (changesLast30Days: number) => {
    if (changesLast30Days > 10) {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    }
    if (changesLast30Days > 5) {
      return <Minus className="w-4 h-4 text-yellow-500" />
    }
    return <TrendingDown className="w-4 h-4 text-red-500" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analíticas de Consentimiento
            </CardTitle>
            <CardDescription>
              Resumen de las preferencias de consentimiento de los usuarios
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{totalUsers}</div>
              <p className="text-sm text-[var(--text-secondary)]">Usuarios totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {avgGrantRate.toFixed(1)}%
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Tasa promedio de aceptación</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{totalChanges}</div>
              <p className="text-sm text-[var(--text-secondary)]">Cambios últimos 30 días</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Consentimiento</TableHead>
              <TableHead className="text-right">Otorgados</TableHead>
              <TableHead className="text-right">Tasa</TableHead>
              <TableHead className="text-center">Progreso</TableHead>
              <TableHead className="text-right">Cambios (30d)</TableHead>
              <TableHead className="text-center">Tendencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.map((item) => (
              <TableRow key={item.consentType}>
                <TableCell>
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {CONSENT_DESCRIPTIONS[item.consentType as ConsentType]?.label ?? item.consentType}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{item.consentType}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {item.grantedCount} / {item.totalUsers}
                </TableCell>
                <TableCell className="text-right">{item.grantRate.toFixed(1)}%</TableCell>
                <TableCell>
                  <div className="w-full max-w-[120px] mx-auto">
                    <Progress value={item.grantRate} className="h-2" />
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.changesLast30Days}</TableCell>
                <TableCell className="text-center">{getTrendIndicator(item.changesLast30Days)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {analytics.length === 0 && !error && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            No hay datos de analíticas disponibles
          </div>
        )}
      </CardContent>
    </Card>
  )
}
