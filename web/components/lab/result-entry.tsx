'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface OrderItem {
  id: string
  test_id: string
  test: {
    id: string
    code: string
    name: string
    unit: string
    result_type: string
  }
  result?: {
    id: string
    value_numeric?: number
    value_text?: string
    flag?: string
  }
}

interface ReferenceRange {
  min_value?: number
  max_value?: number
  reference_text?: string
}

interface ResultEntryProps {
  orderId: string
  onSuccess?: () => void
  onCancel?: () => void
}

type ResultFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high'

export function ResultEntry({ orderId, onSuccess, onCancel }: ResultEntryProps) {
  const { showToast } = useToast()
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [results, setResults] = useState<Record<string, { value: string; flag?: ResultFlag }>>({})
  const [specimenQuality, setSpecimenQuality] = useState('acceptable')
  const [specimenIssues, setSpecimenIssues] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [petInfo, setPetInfo] = useState<{
    species: string
    age_years: number
    sex: string
  } | null>(null)
  const [referenceRanges, setReferenceRanges] = useState<Record<string, ReferenceRange>>({})

  const supabase = createClient()

  useEffect(() => {
    fetchOrderItems()
  }, [orderId])

  const fetchOrderItems = async () => {
    setLoading(true)
    try {
      // Fetch order with pet info
      const { data: orderData } = await supabase
        .from('lab_orders')
        .select(
          `
          id,
          pets!inner(species, date_of_birth, sex)
        `
        )
        .eq('id', orderId)
        .single()

      if (orderData) {
        // Supabase inner join returns single object, but TS infers array
        const pet = orderData.pets as unknown as {
          species: string
          date_of_birth: string
          sex: string
        }
        const ageYears = Math.floor(
          (new Date().getTime() - new Date(pet.date_of_birth).getTime()) /
            (1000 * 60 * 60 * 24 * 365)
        )
        setPetInfo({ species: pet.species, age_years: ageYears, sex: pet.sex })
      }

      // Fetch order items with tests
      const { data: itemsData } = await supabase
        .from('lab_order_items')
        .select(
          `
          id,
          test_id,
          lab_test_catalog!inner(id, code, name, unit, result_type),
          lab_results(id, value_numeric, value_text, flag)
        `
        )
        .eq('order_id', orderId)
        .order('created_at')

      const items =
        itemsData?.map((item) => {
          // Supabase inner join returns single object, but TS infers array
          const catalog = item.lab_test_catalog as unknown as {
            id: string
            code: string
            name: string
            unit: string
            result_type: string
          }
          return {
            id: item.id,
            test_id: item.test_id,
            test: {
              id: catalog.id,
              code: catalog.code,
              name: catalog.name,
              unit: catalog.unit,
              result_type: catalog.result_type,
            },
            result:
              Array.isArray(item.lab_results) && item.lab_results.length > 0
                ? item.lab_results[0]
                : undefined,
          }
        }) || []

      setOrderItems(items)

      // Fetch reference ranges
      if (petInfo && items.length > 0) {
        const { data: rangesData } = await supabase
          .from('lab_reference_ranges')
          .select('test_id, min_value, max_value, reference_text')
          .eq('species', petInfo.species)
          .in(
            'test_id',
            items.map((i) => i.test_id)
          )

        const ranges: Record<string, ReferenceRange> = {}
        rangesData?.forEach((range) => {
          ranges[range.test_id] = {
            min_value: range.min_value,
            max_value: range.max_value,
            reference_text: range.reference_text,
          }
        })
        setReferenceRanges(ranges)
      }

      // Initialize results from existing data
      const initialResults: Record<string, { value: string; flag?: ResultFlag }> = {}
      items.forEach((item) => {
        if (item.result) {
          initialResults[item.id] = {
            value: item.result.value_numeric?.toString() || item.result.value_text || '',
            flag: item.result.flag as ResultFlag,
          }
        }
      })
      setResults(initialResults)
    } catch (_error: unknown) {
      // Error fetching order items - silently fail
    } finally {
      setLoading(false)
    }
  }

  const evaluateFlag = (testId: string, value: string): ResultFlag => {
    const numericValue = parseFloat(value)
    if (isNaN(numericValue)) return 'normal'

    const range = referenceRanges[testId]
    if (!range || range.min_value === undefined || range.max_value === undefined) {
      return 'normal'
    }

    const criticalThreshold = 0.3 // 30% beyond range is critical
    const rangeSize = range.max_value - range.min_value

    if (numericValue < range.min_value) {
      const deviation = (range.min_value - numericValue) / rangeSize
      return deviation > criticalThreshold ? 'critical_low' : 'low'
    } else if (numericValue > range.max_value) {
      const deviation = (numericValue - range.max_value) / rangeSize
      return deviation > criticalThreshold ? 'critical_high' : 'high'
    }

    return 'normal'
  }

  const handleValueChange = (itemId: string, testId: string, value: string) => {
    const flag = evaluateFlag(testId, value)
    setResults((prev) => ({
      ...prev,
      [itemId]: { value, flag },
    }))
  }

  const getFlagColor = (flag?: ResultFlag): string => {
    switch (flag) {
      case 'normal':
        return 'text-[var(--status-success,#16a34a)] bg-[var(--status-success-bg,#dcfce7)]'
      case 'low':
      case 'high':
        return 'text-[var(--status-warning-dark,#a16207)] bg-[var(--status-warning-bg,#fef3c7)]'
      case 'critical_low':
      case 'critical_high':
        return 'text-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fee2e2)]'
      default:
        return 'text-[var(--text-secondary)] bg-[var(--bg-subtle)]'
    }
  }

  const getFlagLabel = (flag?: ResultFlag): string => {
    switch (flag) {
      case 'normal':
        return 'Normal'
      case 'low':
        return 'Bajo'
      case 'high':
        return 'Alto'
      case 'critical_low':
        return 'Crítico Bajo'
      case 'critical_high':
        return 'Crítico Alto'
      default:
        return '-'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // FORM-004: Prevent double-submit
    if (submitting) return

    const emptyResults = orderItems.filter((item) => !results[item.id]?.value)
    if (emptyResults.length > 0) {
      const proceed = confirm(
        `Hay ${emptyResults.length} prueba(s) sin resultado. ¿Desea continuar de todos modos?`
      )
      if (!proceed) return
    }

    setSubmitting(true)

    // FORM-004: Create AbortController for cancellation
    const controller = new AbortController()

    try {
      const response = await fetch(`/api/lab-orders/${orderId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: Object.entries(results).map(([itemId, data]) => ({
            order_item_id: itemId,
            value_numeric: !isNaN(parseFloat(data.value)) ? parseFloat(data.value) : null,
            value_text: isNaN(parseFloat(data.value)) ? data.value : null,
            flag: data.flag,
          })),
          specimen_quality: specimenQuality,
          specimen_issues: specimenIssues || null,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error('Error al guardar resultados')

      onSuccess?.()
    } catch (error) {
      // Handle different error types
      if (error instanceof Error && error.name === 'AbortError') {
        showToast({ title: 'Solicitud cancelada', variant: 'warning' })
      } else {
        showToast({ title: 'Error al guardar los resultados', variant: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Specimen Quality */}
      <div className="rounded-xl bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Calidad de la Muestra
        </h3>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {[
            { value: 'acceptable', label: 'Aceptable', color: 'green' },
            { value: 'suboptimal', label: 'Subóptima', color: 'yellow' },
            { value: 'unacceptable', label: 'Inaceptable', color: 'red' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSpecimenQuality(option.value)}
              className={`min-h-[48px] rounded-lg border-2 p-3 font-medium transition-all ${
                specimenQuality === option.value
                  ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {specimenQuality !== 'acceptable' && (
          <textarea
            value={specimenIssues}
            onChange={(e) => setSpecimenIssues(e.target.value)}
            placeholder="Describe los problemas con la muestra..."
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          />
        )}
      </div>

      {/* Results Entry */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Resultados de Pruebas
        </h3>
        <div className="space-y-3">
          {orderItems.map((item) => {
            const result = results[item.id]
            const range = referenceRanges[item.test_id]

            return (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
                  {/* Test Info */}
                  <div className="md:col-span-4">
                    <div className="font-medium text-[var(--text-primary)]">{item.test.name}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{item.test.code}</div>
                  </div>

                  {/* Value Input */}
                  <div className="md:col-span-3">
                    {item.test.result_type === 'numeric' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={result?.value || ''}
                          onChange={(e) => handleValueChange(item.id, item.test_id, e.target.value)}
                          placeholder="Valor"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
                        />
                        {item.test.unit && (
                          <span className="whitespace-nowrap text-sm text-[var(--text-secondary)]">
                            {item.test.unit}
                          </span>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={result?.value || ''}
                        onChange={(e) => handleValueChange(item.id, item.test_id, e.target.value)}
                        placeholder="Resultado"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    )}
                  </div>

                  {/* Reference Range */}
                  <div className="md:col-span-3">
                    {range ? (
                      <div className="text-sm">
                        {range.reference_text || (
                          <span className="text-[var(--text-secondary)]">
                            {range.min_value} - {range.max_value} {item.test.unit}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin rango</span>
                    )}
                  </div>

                  {/* Flag */}
                  <div className="md:col-span-2">
                    {result?.value && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getFlagColor(result.flag)}`}
                      >
                        {getFlagLabel(result.flag)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t pt-4 sm:flex-row sm:items-center sm:gap-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-[48px] rounded-xl border border-gray-300 px-6 py-3 font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Guardar Resultados
            </>
          )}
        </button>
      </div>
    </form>
  )
}
