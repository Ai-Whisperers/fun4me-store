'use client'

/**
 * Step 4: Branding
 *
 * Collects brand identity: logo and theme colors
 */

import { LogoUploader } from '../logo-uploader'
import { DualColorPicker } from '../color-picker'
import type { BrandingData } from '@/lib/signup/types'

interface BrandingStepProps {
  data: BrandingData
  slug: string
  errors: Partial<Record<keyof BrandingData, string>>
  onChange: (field: keyof BrandingData, value: string | null) => void
  disabled?: boolean
}

export function BrandingStep({ data, slug, errors, onChange, disabled }: BrandingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Personalizacion</h2>
        <p className="mt-1 text-sm text-gray-600">
          Dale estilo propio a tu clinica con tu logo y colores
        </p>
      </div>

      {/* Logo Upload */}
      <LogoUploader
        value={data.logoUrl}
        slug={slug}
        onChange={(url) => onChange('logoUrl', url)}
        disabled={disabled}
      />

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-sm text-gray-500">Colores del tema</span>
        </div>
      </div>

      {/* Color Pickers */}
      <DualColorPicker
        primaryColor={data.primaryColor}
        secondaryColor={data.secondaryColor}
        onPrimaryChange={(color) => onChange('primaryColor', color)}
        onSecondaryChange={(color) => onChange('secondaryColor', color)}
        disabled={disabled}
      />

      {/* Tips */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-900">Consejos de diseno</h3>
        <ul className="mt-2 space-y-1 text-xs text-gray-600">
          <li>• El color primario se usa en botones, links y elementos destacados</li>
          <li>• El color secundario se usa para acentos y elementos complementarios</li>
          <li>• Elige colores que contrasten bien para mejor legibilidad</li>
          <li>• Puedes cambiar estos colores despues desde el panel de administracion</li>
        </ul>
      </div>
    </div>
  )
}
