'use client'

/**
 * Epidemiology Client Component
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import { Download, Activity, MapPin, AlertTriangle, BarChart2, Map } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface HeatmapPoint {
  diagnosis_code: string
  diagnosis_name: string
  species: string
  location_zone: string
  week: string
  case_count: number
  avg_severity: number
}

interface ChartDataPoint {
  name: string
  value: number
}

export default function EpidemiologyPage({ params }: { params: { clinic: string } }) {
  const [speciesFilter, setSpeciesFilter] = useState<string>('all')

  // React Query: Fetch heatmap data
  const { data: rawData = [], isLoading: loading } = useQuery({
    queryKey: ['epidemiology-heatmap', speciesFilter],
    queryFn: async (): Promise<HeatmapPoint[]> => {
      const url = new URL('/api/epidemiology/heatmap', window.location.origin)
      if (speciesFilter !== 'all') {
        url.searchParams.set('species', speciesFilter)
      }
      const res = await fetch(url.toString())
      const json = await res.json()
      if (Array.isArray(json)) {
        return json.sort((a: HeatmapPoint, b: HeatmapPoint) => b.case_count - a.case_count)
      }
      return []
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const data = rawData

  // Aggregate data for visualization (memoized)
  const locationData: ChartDataPoint[] = useMemo(() => data
    .reduce((acc: ChartDataPoint[], curr) => {
      const existing = acc.find((x: ChartDataPoint) => x.name === curr.location_zone)
      if (existing) {
        existing.value += curr.case_count
      } else {
        acc.push({ name: curr.location_zone, value: curr.case_count })
      }
      return acc
    }, [])
    .sort((a: ChartDataPoint, b: ChartDataPoint) => b.value - a.value)
    .slice(0, 10), [data])

  const diagnosisData: ChartDataPoint[] = useMemo(() => data
    .reduce((acc: ChartDataPoint[], curr) => {
      const existing = acc.find((x: ChartDataPoint) => x.name === curr.diagnosis_name)
      if (existing) {
        existing.value += curr.case_count
      } else {
        acc.push({ name: curr.diagnosis_name, value: curr.case_count })
      }
      return acc
    }, [])
    .sort((a: ChartDataPoint, b: ChartDataPoint) => b.value - a.value)
    .slice(0, 10), [data])

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
    link.setAttribute('download', 'reporte_epidemiologico_terrapet.csv')
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-heading text-3xl font-black text-gray-900">
            Inteligencia Epidemiológica
          </h1>
          <p className="text-gray-500">Monitoreo de brotes y enfermedades en tiempo real</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">Todas las Especies</option>
            <option value="dog">Perros</option>
            <option value="cat">Gatos</option>
          </select>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2 font-bold text-green-700 transition-colors hover:bg-green-200"
          >
            <Download className="h-5 w-5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 w-full animate-pulse rounded-3xl bg-gray-100" />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                <Activity className="h-24 w-24 text-[var(--primary)]" />
              </div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Casos Registrados (90d)
              </h3>
              <p className="text-4xl font-black text-[var(--primary)]">
                {data.reduce((acc, curr) => acc + curr.case_count, 0)}
              </p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                <MapPin className="h-24 w-24 text-red-500" />
              </div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Zona Crítica
              </h3>
              <p className="truncate text-2xl font-black text-gray-900">
                {locationData[0]?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">{locationData[0]?.value || 0} casos</p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                <AlertTriangle className="h-24 w-24 text-amber-500" />
              </div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Principal Diagnóstico
              </h3>
              <p className="truncate text-2xl font-black text-gray-900">
                {diagnosisData[0]?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">{diagnosisData[0]?.value || 0} casos</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Diagnoses Chart */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 font-bold text-gray-900">
                <BarChart2 className="h-5 w-5 text-gray-400" />
                Diagnósticos Más Frecuentes
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diagnosisData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                      {diagnosisData.map((entry: ChartDataPoint, index: number) => (
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

            {/* Top Locations Chart */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 font-bold text-gray-900">
                <Map className="h-5 w-5 text-gray-400" />
                Zonas con Mayor Incidencia
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
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

          {/* Detailed Table */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <h3 className="font-bold text-gray-900">Registro Detallado (Anónimo)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                  <tr>
                    <th className="p-4">Semana</th>
                    <th className="p-4">Diagnóstico</th>
                    <th className="p-4">Especie</th>
                    <th className="p-4">Zona</th>
                    <th className="p-4 text-center">Casos</th>
                    <th className="p-4 text-center">Severidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 font-mono text-gray-500">
                        {new Date(row.week).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-bold text-gray-900">{row.diagnosis_name}</td>
                      <td className="p-4 capitalize">{row.species}</td>
                      <td className="p-4">{row.location_zone}</td>
                      <td className="p-4 text-center font-bold">{row.case_count}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              row.avg_severity >= 2.5
                                ? 'bg-red-100 text-red-700'
                                : row.avg_severity >= 1.5
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {row.avg_severity.toFixed(1)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
