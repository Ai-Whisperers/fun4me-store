'use client'

import { ArrowRight, ChevronDown, Save, Loader2 } from 'lucide-react'
import { TARGET_FIELDS, type ImportMapping } from './types'

interface MappingStepProps {
  rawHeaders: string[]
  rawRows: string[][]
  columnMapping: Record<string, string>
  savedMappings: ImportMapping[]
  selectedMappingId: string | null
  showSaveMapping: boolean
  newMappingName: string
  isSavingMapping: boolean
  onMappingChange: (colKey: string, targetField: string) => void
  onApplyPreset: (mappingId: string) => void
  onSaveMapping: () => Promise<void>
  onDeleteMapping: (mappingId: string) => Promise<void>
  onNewMappingNameChange: (name: string) => void
  onShowSaveMappingChange: (show: boolean) => void
}

export function MappingStep({
  rawHeaders,
  rawRows,
  columnMapping,
  savedMappings,
  selectedMappingId,
  showSaveMapping,
  newMappingName,
  isSavingMapping,
  onMappingChange,
  onApplyPreset,
  onSaveMapping,
  onDeleteMapping,
  onNewMappingNameChange,
  onShowSaveMappingChange,
}: MappingStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Mapear Columnas</h3>
          <p className="text-sm text-gray-500">Indica a qué campo corresponde cada columna</p>
        </div>

        {/* Saved Mappings Dropdown */}
        {savedMappings.length > 0 && (
          <div className="relative">
            <select
              value={selectedMappingId || ''}
              onChange={(e) => e.target.value && onApplyPreset(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-sm font-medium"
            >
              <option value="">Cargar mapeo guardado...</option>
              {savedMappings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        )}
      </div>

      {/* Mapping Grid */}
      <div className="grid gap-3">
        {rawHeaders.map((header, idx) => {
          const colKey = `col_${idx}`
          return (
            <div key={idx} className="flex items-center gap-4 rounded-xl bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">
                  {header || `Columna ${idx + 1}`}
                </p>
                <p className="truncate text-xs text-gray-400">Ej: {rawRows[0]?.[idx] || '—'}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
              <select
                value={columnMapping[colKey] || ''}
                onChange={(e) => onMappingChange(colKey, e.target.value)}
                className={`w-48 rounded-lg border px-3 py-2 text-sm font-medium ${
                  columnMapping[colKey]
                    ? 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {TARGET_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* Save Mapping */}
      <div className="border-t pt-4">
        {showSaveMapping ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMappingName}
              onChange={(e) => onNewMappingNameChange(e.target.value)}
              placeholder="Nombre del mapeo (ej: Proveedor ABC)"
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm"
            />
            <button
              onClick={onSaveMapping}
              disabled={!newMappingName.trim() || isSavingMapping}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {isSavingMapping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </button>
            <button
              onClick={() => {
                onShowSaveMappingChange(false)
                onNewMappingNameChange('')
              }}
              className="px-4 py-2 text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => onShowSaveMappingChange(true)}
            className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
          >
            <Save className="h-4 w-4" />
            Guardar este mapeo para futuras importaciones
          </button>
        )}
      </div>
    </div>
  )
}
