'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  DollarSign,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ServiceVariant {
  name: string
  price_display: string
  price_value: number
  size_pricing?: Record<string, number>
}

interface Service {
  id: string
  visible: boolean
  category: string
  title: string
  icon: string
  summary: string
  details: {
    description: string
    duration_minutes: number
    includes: string[]
  }
  variants: ServiceVariant[]
  booking: {
    online_enabled: boolean
    emergency_available: boolean
  }
}

const categoryLabels: Record<string, string> = {
  medical: 'Médico',
  preventative: 'Preventivo',
  surgery: 'Cirugía',
  diagnostics: 'Diagnóstico',
  wellness: 'Bienestar',
  luxury: 'Premium',
  administrative: 'Administrativo',
}

const formatPrice = (value: number): string => {
  if (value === 0) return 'Consultar'
  return (
    new Intl.NumberFormat('es-PY', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(value) + ' Gs'
  )
}

export default function ServicesSettingsPage(): React.ReactElement {
  const { clinic } = useParams() as { clinic: string }
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [expandedService, setExpandedService] = useState<string | null>(null)

  useEffect(() => {
    const fetchServices = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/settings/services?clinic=${clinic}`)
        if (res.ok) {
          const data = await res.json()
          setServices(data.services || [])
        }
      } catch (error) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching services:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [clinic])

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.summary.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [services, searchQuery, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category))
    return Array.from(cats)
  }, [services])

  const toggleVisibility = (serviceId: string): void => {
    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, visible: !s.visible } : s)))
  }

  const updateVariantPrice = (serviceId: string, variantIndex: number, newPrice: number): void => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s
        const newVariants = [...s.variants]
        newVariants[variantIndex] = {
          ...newVariants[variantIndex],
          price_value: newPrice,
          price_display: formatPrice(newPrice),
        }
        return { ...s, variants: newVariants }
      })
    )
  }

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const res = await fetch('/api/settings/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic, services }),
      })

      if (res.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving services:', error)
      }
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const applyBulkPriceChange = (percentage: number): void => {
    setServices((prev) =>
      prev.map((service) => ({
        ...service,
        variants: service.variants.map((variant) => {
          if (variant.price_value === 0) return variant
          const newPrice = Math.round(variant.price_value * (1 + percentage / 100))
          return {
            ...variant,
            price_value: newPrice,
            price_display: formatPrice(newPrice),
          }
        }),
      }))
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar servicios..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat] || cat}
              </option>
            ))}
          </select>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Ajuste masivo:</span>
            <button
              onClick={() => applyBulkPriceChange(5)}
              className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              +5%
            </button>
            <button
              onClick={() => applyBulkPriceChange(10)}
              className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              +10%
            </button>
            <button
              onClick={() => applyBulkPriceChange(-5)}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              -5%
            </button>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="font-semibold text-gray-900">
              Catálogo de Servicios ({filteredServices.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredServices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p>No se encontraron servicios</p>
            </div>
          ) : (
            filteredServices.map((service) => {
              const isExpanded = expandedService === service.id
              return (
                <div key={service.id} className="transition-colors hover:bg-gray-50">
                  {/* Service Header */}
                  <div className="flex items-center gap-4 px-6 py-4">
                    <button className="cursor-grab text-gray-300 hover:text-gray-400">
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => toggleVisibility(service.id)}
                      className={`rounded-lg p-2 transition-colors ${
                        service.visible
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={service.visible ? 'Visible en sitio' : 'Oculto'}
                    >
                      {service.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{service.title}</h3>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {categoryLabels[service.category] || service.category}
                        </span>
                      </div>
                      <p className="truncate text-sm text-gray-500">{service.summary}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {service.variants.length} variante{service.variants.length !== 1 ? 's' : ''}
                      </p>
                      <p className="font-medium text-gray-900">
                        {service.variants[0]?.price_display || 'Consultar'}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedService(isExpanded ? null : service.id)}
                      className="p-2 text-gray-400 transition-colors hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Variants */}
                  {isExpanded && (
                    <div className="mx-4 mb-4 ml-12 rounded-lg bg-gray-50 px-6 pb-4">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Variante
                            </th>
                            <th className="w-40 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Precio
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {service.variants.map((variant, idx) => (
                            <tr key={idx}>
                              <td className="py-3 text-sm text-gray-900">{variant.name}</td>
                              <td className="py-3 text-right">
                                <input
                                  type="number"
                                  value={variant.price_value}
                                  onChange={(e) =>
                                    updateVariantPrice(
                                      service.id,
                                      idx,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-right text-sm focus:ring-2 focus:ring-[var(--primary)]"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Service Options */}
                      <div className="mt-4 flex items-center gap-6 border-t border-gray-200 pt-4">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={service.booking.online_enabled}
                            onChange={(e) => {
                              setServices((prev) =>
                                prev.map((s) =>
                                  s.id === service.id
                                    ? {
                                        ...s,
                                        booking: { ...s.booking, online_enabled: e.target.checked },
                                      }
                                    : s
                                )
                              )
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span className="text-sm text-gray-700">Reservable online</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={service.booking.emergency_available}
                            onChange={(e) => {
                              setServices((prev) =>
                                prev.map((s) =>
                                  s.id === service.id
                                    ? {
                                        ...s,
                                        booking: {
                                          ...s.booking,
                                          emergency_available: e.target.checked,
                                        },
                                      }
                                    : s
                                )
                              )
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span className="text-sm text-gray-700">Disponible en emergencias</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">Precios actualizados</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-600">Error al guardar</span>
            </>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 font-medium text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Precios
        </button>
      </div>
    </div>
  )
}
