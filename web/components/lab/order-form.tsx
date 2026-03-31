'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'

interface Pet {
  id: string
  name: string
  species: string
  breed: string
}

interface TestCatalog {
  id: string
  code: string
  name: string
  category: string
  specimen_type: string
  typical_turnaround_hours: number
}

interface Panel {
  id: string
  name: string
  category: string
  tests: { test_id: string }[]
}

interface LabOrderFormProps {
  onSuccess?: (orderId: string) => void
  onCancel?: () => void
}

// TICKET-FORM-002: Replace alert() with proper error state
interface FormError {
  message: string
  type: 'validation' | 'server'
}

const categories = [
  { value: 'hematology', label: 'Hematología' },
  { value: 'chemistry', label: 'Química Sanguínea' },
  { value: 'urinalysis', label: 'Urianálisis' },
  { value: 'microbiology', label: 'Microbiología' },
  { value: 'parasitology', label: 'Parasitología' },
  { value: 'serology', label: 'Serología' },
  { value: 'endocrinology', label: 'Endocrinología' },
  { value: 'other', label: 'Otros' },
]

export function LabOrderForm({ onSuccess, onCancel }: LabOrderFormProps) {
  const [pets, setPets] = useState<Pet[]>([])
  const [tests, setTests] = useState<TestCatalog[]>([])
  const [panels, setPanels] = useState<Panel[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  // TICKET-FORM-002: Replace alert() with proper error state
  const [formError, setFormError] = useState<FormError | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state
  const [selectedPetId, setSelectedPetId] = useState('')
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())
  const [selectedPanels, setSelectedPanels] = useState<Set<string>>(new Set())
  const [priority, setPriority] = useState('routine')
  const [labType, setLabType] = useState('in_house')
  const [fasting, setFasting] = useState(false)
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      // Fetch pets
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('id, name, species, breed')
        .order('name')

      if (petsError) throw petsError

      // Fetch test catalog
      const { data: testsData, error: testsError } = await supabase
        .from('lab_test_catalog')
        .select('id, code, name, category, specimen_type, typical_turnaround_hours')
        .eq('active', true)
        .order('name')

      if (testsError) throw testsError

      // Fetch panels
      const { data: panelsData, error: panelsError } = await supabase
        .from('lab_test_panels')
        .select(
          `
          id,
          name,
          category,
          lab_test_panel_items!inner(test_id)
        `
        )
        .eq('active', true)
        .order('name')

      if (panelsError) throw panelsError

      setPets(petsData || [])
      setTests(testsData || [])
      setPanels(
        panelsData?.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          tests: p.lab_test_panel_items as { test_id: string }[],
        })) || []
      )
    } catch (err) {
      setLoadError('Error al cargar datos del laboratorio. Por favor, intenta de nuevo.')
      console.error('Lab order form data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleTest = (testId: string) => {
    const newSelected = new Set(selectedTests)
    if (newSelected.has(testId)) {
      newSelected.delete(testId)
    } else {
      newSelected.add(testId)
    }
    setSelectedTests(newSelected)
  }

  const togglePanel = (panelId: string) => {
    const panel = panels.find((p) => p.id === panelId)
    if (!panel) return

    const newSelectedPanels = new Set(selectedPanels)
    const newSelectedTests = new Set(selectedTests)

    if (newSelectedPanels.has(panelId)) {
      // Remove panel and its tests
      newSelectedPanels.delete(panelId)
      panel.tests.forEach((t) => newSelectedTests.delete(t.test_id))
    } else {
      // Add panel and its tests
      newSelectedPanels.add(panelId)
      panel.tests.forEach((t) => newSelectedTests.add(t.test_id))
    }

    setSelectedPanels(newSelectedPanels)
    setSelectedTests(newSelectedTests)
  }

  const filteredTests = tests.filter((test) => {
    const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter
    const matchesSearch =
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.code.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const filteredPanels = panels.filter((panel) => {
    const matchesCategory = categoryFilter === 'all' || panel.category === categoryFilter
    const matchesSearch = panel.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TICKET-FORM-002: Clear previous errors and use state instead of alert()
    setFormError(null)

    if (!selectedPetId || selectedTests.size === 0) {
      setFormError({ message: 'Selecciona una mascota y al menos una prueba', type: 'validation' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/lab-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: selectedPetId,
          test_ids: Array.from(selectedTests),
          panel_ids: Array.from(selectedPanels),
          priority,
          lab_type: labType,
          fasting_status: fasting,
          clinical_notes: clinicalNotes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al crear orden')
      }

      const data = await response.json()
      onSuccess?.(data.id)
    } catch (err) {
      setFormError({
        message: err instanceof Error ? err.message : 'Error al crear la orden de laboratorio',
        type: 'server',
      })
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

  // UX-001: Show error state with retry option
  if (loadError) {
    return (
      <div className="rounded-2xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--status-error)]" />
        <h3 className="mb-2 text-lg font-semibold text-[var(--status-error-text)]">Error al cargar</h3>
        <p className="mb-4 text-[var(--status-error)]">{loadError}</p>
        <button
          onClick={() => fetchData()}
          className="rounded-xl bg-[var(--status-error)] px-6 py-2 font-medium text-white transition-colors hover:bg-[var(--status-error)]/90"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pet Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
          Mascota <span className="text-[var(--status-error)]">*</span>
        </label>
        <select
          value={selectedPetId}
          onChange={(e) => setSelectedPetId(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Seleccionar mascota...</option>
          {pets.map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.name} - {pet.species} ({pet.breed})
            </option>
          ))}
        </select>
      </div>

      {/* Priority and Lab Type */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Prioridad
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="routine">Rutina</option>
            <option value="urgent">Urgente</option>
            <option value="stat">STAT</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Tipo de Laboratorio
          </label>
          <select
            value={labType}
            onChange={(e) => setLabType(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="in_house">Interno</option>
            <option value="external">Externo</option>
          </select>
        </div>
      </div>

      {/* Fasting Status */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="fasting"
          checked={fasting}
          onChange={(e) => setFasting(e.target.checked)}
          className="h-5 w-5 rounded text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]"
        />
        <label htmlFor="fasting" className="text-sm font-medium text-[var(--text-primary)]">
          Paciente en ayunas
        </label>
      </div>

      {/* Test Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
          Pruebas y Paneles <span className="text-[var(--status-error)]">*</span>
        </label>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-4 md:flex-row">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Buscar pruebas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Panels */}
        {filteredPanels.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Paneles de Pruebas
            </h4>
            <div className="space-y-2">
              {filteredPanels.map((panel) => (
                <div
                  key={panel.id}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    selectedPanels.has(panel.id)
                      ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePanel(panel.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-[var(--text-primary)]">{panel.name}</h5>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {panel.tests.length} pruebas incluidas
                      </p>
                    </div>
                    {selectedPanels.has(panel.id) && (
                      <CheckCircle className="h-6 w-6 text-[var(--primary)]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Tests */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Pruebas Individuales
          </h4>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-4">
            {filteredTests.map((test) => (
              <label
                key={test.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all ${
                  selectedTests.has(test.id)
                    ? 'bg-[var(--primary)]/10 border-[var(--primary)]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTests.has(test.id)}
                  onChange={() => toggleTest(test.id)}
                  className="h-5 w-5 rounded text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]"
                />
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-primary)]">{test.name}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {test.code} • {test.specimen_type}
                  </div>
                </div>
              </label>
            ))}
            {filteredTests.length === 0 && (
              <p className="py-8 text-center text-[var(--text-secondary)]">
                No se encontraron pruebas
              </p>
            )}
          </div>
        </div>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {selectedTests.size} prueba{selectedTests.size !== 1 ? 's' : ''} seleccionada
          {selectedTests.size !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Clinical Notes */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
          Notas Clínicas
        </label>
        <textarea
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          rows={4}
          placeholder="Información clínica relevante, síntomas, diagnóstico presuntivo..."
          className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      {/* TICKET-FORM-002, TICKET-A11Y-004: Error Display with accessibility */}
      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            formError.type === 'validation'
              ? 'border-[var(--status-warning,#eab308)]/30 bg-[var(--status-warning-bg,#fef3c7)] text-[var(--status-warning-dark,#a16207)]'
              : 'border-[var(--status-error,#ef4444)]/30 bg-[var(--status-error-bg,#fee2e2)] text-[var(--status-error,#dc2626)]'
          }`}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="font-medium">{formError.message}</p>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="ml-auto hover:opacity-70"
            aria-label="Cerrar mensaje de error"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 border-t pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-gray-300 px-6 py-3 font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !selectedPetId || selectedTests.size === 0}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              Crear Orden
            </>
          )}
        </button>
      </div>
    </form>
  )
}
