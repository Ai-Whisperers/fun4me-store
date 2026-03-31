'use client'

/**
 * Mode Selection Screen
 *
 * Initial screen for selecting the scanner operation mode.
 * Displays available modes (lookup, receive, count) with descriptions.
 */

import { X, ArrowRight } from 'lucide-react'
import { MODE_CONFIG } from './mode-config'
import type { ScannerMode, ModeSelectionScreenProps } from './types'

export function ModeSelectionScreen({
  onModeSelect,
  onClose,
  continuousMode,
  setContinuousMode,
}: ModeSelectionScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h3 className="font-bold text-gray-900">Escáner de Inventario</h3>
            <p className="mt-1 text-sm text-gray-500">Selecciona el modo de operación</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Cerrar escáner"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Options */}
        <div className="space-y-3 p-4">
          {(Object.keys(MODE_CONFIG) as ScannerMode[]).map((modeKey) => {
            const config = MODE_CONFIG[modeKey]
            const Icon = config.icon
            return (
              <button
                key={modeKey}
                onClick={() => onModeSelect(modeKey)}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-100 p-4 text-left transition-all hover:border-[var(--primary)] hover:bg-gray-50"
              >
                <div className={`rounded-xl p-3 ${config.bgColor}`}>
                  <Icon className={`h-6 w-6 ${config.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{config.label}</p>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </button>
            )
          })}
        </div>

        {/* Continuous Mode Toggle */}
        <div className="border-t bg-gray-50 p-4">
          <label className="flex cursor-pointer items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Modo Continuo</p>
              <p className="text-xs text-gray-500">Escanear múltiples productos sin cerrar</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-[var(--primary)]" />
              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
