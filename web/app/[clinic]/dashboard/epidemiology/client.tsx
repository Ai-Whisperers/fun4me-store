'use client'

/**
 * Epidemiology Dashboard Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hooks
 * - Replaced manual mutation with useMutation
 * - Automatic cache invalidation on report creation
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  Activity,
  MapPin,
  AlertTriangle,
  BarChart2,
  Map,
  Plus,
  RefreshCw,
  FileText,
  Bug,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { useToast } from '@/components/ui/Toast'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface HeatmapPoint {
  diagnosis_code: string
  diagnosis_name: string
  species: string
  location_zone: string
  week: string
  case_count: number
  avg_severity: number
}

interface DiagnosisCode {
  id: string
  code: string
  term: string
  category: string
}

interface DiseaseReport {
  id: string
  species: string
  age_months: number | null
  is_vaccinated: boolean | null
  location_zone: string | null
  reported_date: string
  severity: string
  created_at: string
  diagnosis: { id: string; code: string; term: string } | null
}

interface Props {
  clinic: string
  tenantId: string
  diagnosisCodes: DiagnosisCode[]
}

export default function EpidemiologyDashboard({ clinic, tenantId, diagnosisCodes }: Props) {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [speciesFilter, setSpeciesFilter] = useState<string>('all')
  const [showReportForm, setShowReportForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'trends'>('overview')

  // Form state
  const [formData, setFormData] = useState({
    diagnosis_code_id: '',
    species: 'dog',
    age_months: '',
    is_vaccinated: '',
    location_zone: '',
    severity: 'moderate',
    reported_date: new Date().toISOString().split('T')[0],
  })

  // React Query: Fetch heatmap data
  const speciesParam = speciesFilter === 'all' ? undefined : speciesFilter
  const {
    data: rawData = [],
    isLoading: loadingHeatmap,
    refetch: refetchHeatmap,
  } = useQuery({
    queryKey: queryKeys.epidemiology.heatmap(tenantId, speciesParam),
    queryFn: async (): Promise<HeatmapPoint[]> => {
      const url = new URL('/api/epidemiology/heatmap', window.location.origin)
      if (speciesFilter !== 'all') {
        url.searchParams.set('species', speciesFilter)
      }
      url.searchParams.set('tenant', tenantId)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Error al cargar datos epidemiológicos')
      const json = await res.json()
      return Array.isArray(json) ? json : []
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Sort data by case count (memoized)
  const data = useMemo(
    () => [...rawData].sort((a, b) => b.case_count - a.case_count),
    [rawData]
  )

  // React Query: Fetch reports
  const {
    data: reports = [],
    isLoading: loadingReports,
    refetch: refetchReports,
  } = useQuery({
    queryKey: queryKeys.epidemiology.reports(speciesParam),
    queryFn: async (): Promise<DiseaseReport[]> => {
      const url = new URL('/api/epidemiology/reports', window.location.origin)
      if (speciesFilter !== 'all') {
        url.searchParams.set('species', speciesFilter)
      }

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Error al cargar reportes')
      const json = await res.json()
      return json.data || []
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const loading = loadingHeatmap || loadingReports

  // React Query: Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (payload: {
      diagnosis_code_id: string | null
      species: string
      age_months: number | null
      is_vaccinated: boolean | null
      location_zone: string
      severity: string
      reported_date: string
    }) => {
      const res = await fetch('/api/epidemiology/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al crear reporte')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate both queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.epidemiology.all })
      setShowReportForm(false)
      setFormData({
        diagnosis_code_id: '',
        species: 'dog',
        age_months: '',
        is_vaccinated: '',
        location_zone: '',
        severity: 'moderate',
        reported_date: new Date().toISOString().split('T')[0],
      })
    },
    onError: (error: Error) => {
      showToast({ title: error.message, variant: 'error' })
    },
  })

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault()
    createReportMutation.mutate({
      diagnosis_code_id: formData.diagnosis_code_id || null,
      species: formData.species,
      age_months: formData.age_months ? parseInt(formData.age_months) : null,
      is_vaccinated: formData.is_vaccinated === '' ? null : formData.is_vaccinated === 'true',
      location_zone: formData.location_zone,
      severity: formData.severity,
      reported_date: formData.reported_date,
    })
  }

  const handleRefresh = () => {
    refetchHeatmap()
    refetchReports()
  }

  // Aggregate data for visualization
  const locationData = data
    .reduce((acc: { name: string; value: number }[], curr) => {
      const existing = acc.find((x) => x.name === curr.location_zone)
      if (existing) {
        existing.value += curr.case_count
      } else if (curr.location_zone) {
        acc.push({ name: curr.location_zone, value: curr.case_count })
      }
      return acc
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const diagnosisData = data
    .reduce((acc: { name: string; value: number }[], curr) => {
      const existing = acc.find((x) => x.name === curr.diagnosis_name)
      if (existing) {
        existing.value += curr.case_count
      } else if (curr.diagnosis_name) {
        acc.push({ name: curr.diagnosis_name, value: curr.case_count })
      }
      return acc
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Weekly trend data
  const weeklyTrend = data
    .reduce((acc: { week: string; cases: number }[], curr) => {
      const existing = acc.find((x) => x.week === curr.week)
      if (existing) {
        existing.cases += curr.case_count
      } else {
        acc.push({ week: curr.week, cases: curr.case_count })
      }
      return acc
    }, [])
    .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())

  const downloadCSV = () => {
    const headers = ['Diagnóstico', 'Especie', 'Zona', 'Semana', 'Casos', 'Severidad Promedio']
    const rows = data.map((row) => [
      row.diagnosis_name,
      row.species,
      row.location_zone,
      new Date(row.week).toLocaleDateString(),
      row.case_count,
      row.avg_severity.toFixed(1),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      headers.join(',') +
      '\n' +
      rows.map((e) => e.join(',')).join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `reporte_epidemiologico_${clinic}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalCases = data.reduce((acc, curr) => acc + curr.case_count, 0)
  const severeCount = reports.filter((r) => r.severity === 'severe').length

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Vigilancia Epidemiológica
          </h1>
          <p className="text-[var(--text-secondary)]">Monitoreo de brotes y enfermedades</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">Todas las Especies</option>
            <option value="dog">Perros</option>
            <option value="cat">Gatos</option>
          </select>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2 font-medium text-green-700 transition-colors hover:bg-green-200"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>

          <button
            onClick={() => setShowReportForm(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nuevo Reporte
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Resumen', icon: BarChart2 },
          { id: 'reports', label: 'Reportes', icon: FileText },
          { id: 'trends', label: 'Tendencias', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-96 w-full animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Total Casos (90d)</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{totalCases}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-red-100 p-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Casos Severos</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{severeCount}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-2">
                      <MapPin className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Zona Crítica</span>
                  </div>
                  <p className="truncate text-lg font-bold text-gray-900">
                    {locationData[0]?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">{locationData[0]?.value || 0} casos</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-purple-100 p-2">
                      <Bug className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Principal Diagnóstico</span>
                  </div>
                  <p className="truncate text-lg font-bold text-gray-900">
                    {diagnosisData[0]?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">{diagnosisData[0]?.value || 0} casos</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                    <BarChart2 className="h-5 w-5 text-gray-400" />
                    Top Diagnósticos
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diagnosisData} layout="vertical" margin={{ left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {diagnosisData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? '#ef4444' : 'var(--primary)'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                    <Map className="h-5 w-5 text-gray-400" />
                    Zonas con Mayor Incidencia
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationData} layout="vertical" margin={{ left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Diagnóstico</th>
                      <th className="p-4">Especie</th>
                      <th className="p-4">Edad</th>
                      <th className="p-4">Vacunado</th>
                      <th className="p-4">Zona</th>
                      <th className="p-4 text-center">Severidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No hay reportes registrados
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="p-4 font-mono text-gray-500">
                            {new Date(report.reported_date).toLocaleDateString()}
                          </td>
                          <td className="p-4 font-medium text-gray-900">
                            {report.diagnosis?.term || '-'}
                          </td>
                          <td className="p-4 capitalize">
                            {report.species === 'dog'
                              ? 'Perro'
                              : report.species === 'cat'
                                ? 'Gato'
                                : report.species}
                          </td>
                          <td className="p-4">
                            {report.age_months ? `${report.age_months} meses` : '-'}
                          </td>
                          <td className="p-4">
                            {report.is_vaccinated === null
                              ? '-'
                              : report.is_vaccinated
                                ? 'Sí'
                                : 'No'}
                          </td>
                          <td className="p-4">{report.location_zone || '-'}</td>
                          <td className="p-4 text-center">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${
                                report.severity === 'severe'
                                  ? 'bg-red-100 text-red-700'
                                  : report.severity === 'moderate'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {report.severity === 'severe'
                                ? 'Severo'
                                : report.severity === 'moderate'
                                  ? 'Moderado'
                                  : 'Leve'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                <Activity className="h-5 w-5 text-gray-400" />
                Tendencia Semanal de Casos
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={(val) =>
                        new Date(val).toLocaleDateString('es', { month: 'short', day: 'numeric' })
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(val) => `Semana del ${new Date(val).toLocaleDateString()}`}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cases"
                      name="Casos"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--primary)', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Report Modal */}
      {showReportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white">
            <div className="border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900">Nuevo Reporte de Enfermedad</h2>
              <p className="text-sm text-gray-500">
                Datos anonimizados para vigilancia epidemiológica
              </p>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Diagnóstico</label>
                <select
                  value={formData.diagnosis_code_id}
                  onChange={(e) => setFormData({ ...formData, diagnosis_code_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Seleccionar diagnóstico...</option>
                  {diagnosisCodes.map((dc) => (
                    <option key={dc.id} value={dc.id}>
                      {dc.code} - {dc.term}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Especie *</label>
                  <select
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="dog">Perro</option>
                    <option value="cat">Gato</option>
                    <option value="bird">Ave</option>
                    <option value="rabbit">Conejo</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Severidad *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="mild">Leve</option>
                    <option value="moderate">Moderado</option>
                    <option value="severe">Severo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Edad (meses)
                  </label>
                  <input
                    type="number"
                    value={formData.age_months}
                    onChange={(e) => setFormData({ ...formData, age_months: e.target.value })}
                    placeholder="ej: 24"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Vacunado</label>
                  <select
                    value={formData.is_vaccinated}
                    onChange={(e) => setFormData({ ...formData, is_vaccinated: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Desconocido</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Zona/Barrio</label>
                <input
                  type="text"
                  value={formData.location_zone}
                  onChange={(e) => setFormData({ ...formData, location_zone: e.target.value })}
                  placeholder="ej: Villa Morra, Asunción"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fecha del Reporte
                </label>
                <input
                  type="date"
                  value={formData.reported_date}
                  onChange={(e) => setFormData({ ...formData, reported_date: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createReportMutation.isPending}
                  className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {createReportMutation.isPending ? 'Guardando...' : 'Crear Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
