'use client'

/**
 * ColorPicker - Theme color selector with preview
 *
 * Allows selecting primary and secondary brand colors
 * with live preview of how they'll look on the site.
 */

import { useState, useCallback } from 'react'
import { Check } from 'lucide-react'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  presetColors?: string[]
  disabled?: boolean
}

// Preset colors optimized for veterinary clinics
const DEFAULT_PRESETS = [
  '#3B82F6', // Blue (default)
  '#10B981', // Green (nature)
  '#8B5CF6', // Purple (premium)
  '#EF4444', // Red (emergency)
  '#F59E0B', // Amber (warm)
  '#06B6D4', // Cyan (clinical)
  '#EC4899', // Pink (friendly)
  '#14B8A6', // Teal (calming)
]

export function ColorPicker({
  label,
  value,
  onChange,
  presetColors = DEFAULT_PRESETS,
  disabled,
}: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  const handlePresetClick = useCallback(
    (color: string) => {
      if (!disabled) {
        onChange(color)
        setShowCustom(false)
      }
    },
    [disabled, onChange]
  )

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onChange(e.target.value)
      }
    },
    [disabled, onChange]
  )

  const isPreset = presetColors.includes(value)

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2">
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => handlePresetClick(color)}
            disabled={disabled}
            className={`
              relative h-10 w-10 rounded-lg transition-all
              ${value === color ? 'ring-2 ring-offset-2 ring-gray-900' : 'ring-1 ring-gray-200 hover:ring-gray-400'}
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            style={{ backgroundColor: color }}
            aria-label={`Seleccionar color ${color}`}
          >
            {value === color && (
              <Check
                className="absolute inset-0 m-auto h-5 w-5"
                style={{
                  color: isLightColor(color) ? '#000000' : '#FFFFFF',
                }}
              />
            )}
          </button>
        ))}

        {/* Custom Color Toggle */}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          disabled={disabled}
          className={`
            h-10 w-10 rounded-lg border-2 border-dashed transition-all
            ${!isPreset ? 'border-gray-900' : 'border-gray-300 hover:border-gray-400'}
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
          style={!isPreset ? { backgroundColor: value } : undefined}
          aria-label="Color personalizado"
        >
          {!isPreset ? (
            <Check
              className="mx-auto h-5 w-5"
              style={{
                color: isLightColor(value) ? '#000000' : '#FFFFFF',
              }}
            />
          ) : (
            <span className="text-xs text-gray-500">+</span>
          )}
        </button>
      </div>

      {/* Custom Color Input */}
      {(showCustom || !isPreset) && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value}
            onChange={handleCustomChange}
            disabled={disabled}
            className="h-10 w-20 cursor-pointer rounded border border-gray-300 p-1 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const val = e.target.value
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                onChange(val)
              }
            }}
            disabled={disabled}
            placeholder="#000000"
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      )}

      {/* Preview */}
      <div
        className="rounded-lg p-4 transition-colors"
        style={{ backgroundColor: value }}
      >
        <p
          className="text-sm font-medium"
          style={{ color: isLightColor(value) ? '#000000' : '#FFFFFF' }}
        >
          Vista previa del color
        </p>
        <p
          className="text-xs opacity-80"
          style={{ color: isLightColor(value) ? '#000000' : '#FFFFFF' }}
        >
          Asi se vera en tu sitio web
        </p>
      </div>
    </div>
  )
}

/**
 * Determine if a color is light (for text contrast)
 */
function isLightColor(hex: string): boolean {
  const cleanHex = hex.replace('#', '')
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex

  const r = parseInt(fullHex.substring(0, 2), 16)
  const g = parseInt(fullHex.substring(2, 4), 16)
  const b = parseInt(fullHex.substring(4, 6), 16)

  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// ============================================================================
// Dual Color Picker (Primary + Secondary)
// ============================================================================

interface DualColorPickerProps {
  primaryColor: string
  secondaryColor: string
  onPrimaryChange: (color: string) => void
  onSecondaryChange: (color: string) => void
  disabled?: boolean
}

export function DualColorPicker({
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  disabled,
}: DualColorPickerProps) {
  return (
    <div className="space-y-6">
      <ColorPicker
        label="Color Primario"
        value={primaryColor}
        onChange={onPrimaryChange}
        disabled={disabled}
      />

      <ColorPicker
        label="Color Secundario"
        value={secondaryColor}
        onChange={onSecondaryChange}
        presetColors={[
          '#10B981', // Green (default secondary)
          '#3B82F6', // Blue
          '#8B5CF6', // Purple
          '#F59E0B', // Amber
          '#EF4444', // Red
          '#06B6D4', // Cyan
          '#EC4899', // Pink
          '#84CC16', // Lime
        ]}
        disabled={disabled}
      />

      {/* Combined Preview */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Vista Previa Combinada</p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {/* Header preview */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: primaryColor }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: isLightColor(primaryColor) ? '#000000' : '#FFFFFF' }}
            >
              Mi Clinica Veterinaria
            </span>
            <div className="flex gap-2">
              <span
                className="text-xs"
                style={{ color: isLightColor(primaryColor) ? '#000000' : '#FFFFFF' }}
              >
                Inicio
              </span>
              <span
                className="text-xs"
                style={{ color: isLightColor(primaryColor) ? '#000000' : '#FFFFFF' }}
              >
                Servicios
              </span>
            </div>
          </div>

          {/* Content preview */}
          <div className="bg-white p-4">
            <div className="flex gap-4">
              <div className="h-16 w-16 rounded-lg" style={{ backgroundColor: primaryColor + '20' }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded" style={{ backgroundColor: primaryColor }} />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          </div>

          {/* Button preview */}
          <div className="flex gap-2 bg-gray-50 p-4">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Boton Primario
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-white"
              style={{ backgroundColor: secondaryColor }}
            >
              Boton Secundario
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
