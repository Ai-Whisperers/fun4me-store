'use client'

/**
 * Dosage Calculator Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Automatic caching of drug data
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calculator, AlertTriangle } from 'lucide-react'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Drug {
  id: string
  name: string
  species: 'dog' | 'cat' | 'all'
  min_dose_mg_kg: number
  max_dose_mg_kg: number
  concentration_mg_ml: number
  notes: string
  max_absolute_mg?: number // Maximum absolute dose regardless of weight
}

// Validation constants
const MIN_PRACTICAL_VOLUME_ML = 0.1 // Minimum measurable volume
const MAX_SAFE_WEIGHT_KG = 200 // Maximum reasonable animal weight

export function DosageCalculator({
  initialWeightKg,
  species,
}: {
  initialWeightKg?: number
  species?: 'dog' | 'cat'
}) {
  const [selectedDrugId, setSelectedDrugId] = useState('')
  const [weight, setWeight] = useState(initialWeightKg || 0)

  // React Query for data fetching
  const { data: drugs = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.clinical.drugDosages(),
    queryFn: async (): Promise<Drug[]> => {
      const url = species ? `/api/drug_dosages?species=${species}` : '/api/drug_dosages'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Error al cargar medicamentos')
      }
      return response.json()
    },
    staleTime: staleTimes.STATIC,
    gcTime: gcTimes.LONG,
  })

  const selectedDrug = drugs.find((d) => d.id === selectedDrugId)

  const calculateDose = () => {
    if (!selectedDrug || weight <= 0) return null

    let minTotalMg = selectedDrug.min_dose_mg_kg * weight
    let maxTotalMg = selectedDrug.max_dose_mg_kg * weight

    // Apply absolute maximum dose limit if defined
    if (selectedDrug.max_absolute_mg) {
      maxTotalMg = Math.min(maxTotalMg, selectedDrug.max_absolute_mg)
      minTotalMg = Math.min(minTotalMg, selectedDrug.max_absolute_mg)
    }

    const minMl = minTotalMg / selectedDrug.concentration_mg_ml
    const maxMl = maxTotalMg / selectedDrug.concentration_mg_ml

    // Generate warnings
    const warnings: string[] = []

    // Warning for very small volumes (hard to measure accurately)
    if (minMl < MIN_PRACTICAL_VOLUME_ML) {
      warnings.push(
        `Volumen muy pequeño (${minMl.toFixed(3)} ml). Considere diluir o usar jeringa de precisión.`
      )
    }

    // Warning for max dose being capped
    if (selectedDrug.max_absolute_mg && maxTotalMg === selectedDrug.max_absolute_mg) {
      warnings.push(`Dosis máxima absoluta aplicada: ${selectedDrug.max_absolute_mg} mg`)
    }

    return { minMl, maxMl, minTotalMg, maxTotalMg, warnings }
  }

  const dose = calculateDose()

  // Weight validation warning
  const weightWarning =
    weight < 0
      ? 'El peso no puede ser negativo'
      : weight > MAX_SAFE_WEIGHT_KG
        ? `Peso inusualmente alto (${weight} kg). Verifique el valor.`
        : null

  return (
    <div className="rounded-2xl border border-[var(--border-light,#f3f4f6)] bg-[var(--bg-paper)] p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <Calculator className="h-5 w-5 text-[var(--primary)]" />
        Calculadora de Dosis
      </h3>

      <div className="space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[var(--text-muted)]">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max={MAX_SAFE_WEIGHT_KG}
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              className={`min-h-[44px] w-full rounded-lg border bg-[var(--bg-subtle)] p-3 focus:ring-[var(--primary)] ${weightWarning ? 'border-[var(--status-error-light,#fca5a5)]' : 'border-[var(--border,#e5e7eb)]'}`}
            />
            {weightWarning && (
              <p className="mt-1 text-xs text-[var(--status-error,#ef4444)]">{weightWarning}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[var(--text-muted)]">
              Medicamento
            </label>
            <select
              value={selectedDrugId}
              onChange={(e) => setSelectedDrugId(e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-[var(--border,#e5e7eb)] bg-[var(--bg-subtle)] p-3 text-sm focus:ring-[var(--primary)]"
              disabled={loading}
            >
              <option value="">Seleccionar...</option>
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.concentration_mg_ml}mg/ml)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drug Info */}
        {selectedDrug && (
          <div className="space-y-1 rounded-lg bg-[var(--status-info-bg,#dbeafe)] p-3 text-xs text-[var(--status-info,#1d4ed8)]">
            <div className="flex justify-between">
              <span className="font-bold">Dosis:</span>
              <span>
                {selectedDrug.min_dose_mg_kg} - {selectedDrug.max_dose_mg_kg} mg/kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Conc:</span>
              <span>{selectedDrug.concentration_mg_ml} mg/ml</span>
            </div>
            {selectedDrug.notes && (
              <div className="border-[var(--status-info,#3b82f6)]/20 mt-2 border-t pt-2 font-medium italic">
                Nota: {selectedDrug.notes}
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {dose && (
          <div className="space-y-3">
            <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl bg-[var(--primary)] p-4 text-center text-white">
              <div className="mb-1 text-sm font-medium opacity-80">Administrar</div>
              <div className="mb-1 text-2xl font-black sm:text-3xl">
                {dose.minMl.toFixed(2)} - {dose.maxMl.toFixed(2)} ml
              </div>
              <div className="text-xs opacity-70">
                ({dose.minTotalMg.toFixed(0)} - {dose.maxTotalMg.toFixed(0)} mg totales)
              </div>
            </div>

            {/* Warnings */}
            {dose.warnings.length > 0 && (
              <div className="border-[var(--status-warning,#eab308)]/30 rounded-lg border bg-[var(--status-warning-bg,#fef3c7)] p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--status-warning-dark,#ca8a04)]" />
                  <div className="space-y-1 text-xs text-[var(--status-warning-dark,#a16207)]">
                    {dose.warnings.map((warning, idx) => (
                      <p key={idx}>{warning}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
