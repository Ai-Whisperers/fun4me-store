'use client'

/**
 * Step 1: Clinic Info
 *
 * Collects clinic name, URL slug, and optional RUC (tax ID)
 */

import { AlertCircle } from 'lucide-react'
import { SlugInput } from '../slug-input'
import type { ClinicInfoData } from '@/lib/signup/types'

interface ClinicInfoStepProps {
  data: ClinicInfoData
  errors: Partial<Record<keyof ClinicInfoData, string>>
  onChange: (field: keyof ClinicInfoData, value: string | null) => void
  disabled?: boolean
}

export function ClinicInfoStep({ data, errors, onChange, disabled }: ClinicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Informacion de la Clinica</h2>
        <p className="mt-1 text-sm text-gray-600">
          Ingresa los datos basicos de tu clinica veterinaria
        </p>
      </div>

      {/* Clinic Name */}
      <div className="space-y-2">
        <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700">
          Nombre de la Clinica <span className="text-red-500">*</span>
        </label>
        <input
          id="clinicName"
          type="text"
          value={data.clinicName}
          onChange={(e) => onChange('clinicName', e.target.value)}
          disabled={disabled}
          placeholder="Ej: Veterinaria San Francisco"
          className={`
            w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2
            ${errors.clinicName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
            disabled:cursor-not-allowed disabled:bg-gray-100
          `}
        />
        {errors.clinicName && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.clinicName}
          </div>
        )}
      </div>

      {/* Slug */}
      <SlugInput
        value={data.slug}
        clinicName={data.clinicName}
        onChange={(slug) => onChange('slug', slug)}
        error={errors.slug}
        disabled={disabled}
      />

      {/* RUC (Optional) */}
      <div className="space-y-2">
        <label htmlFor="ruc" className="block text-sm font-medium text-gray-700">
          RUC <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          id="ruc"
          type="text"
          value={data.ruc || ''}
          onChange={(e) => {
            const value = e.target.value
            // Allow only numbers and one dash
            const cleaned = value.replace(/[^0-9-]/g, '')
            onChange('ruc', cleaned || null)
          }}
          disabled={disabled}
          placeholder="Ej: 12345678-9"
          className={`
            w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2
            ${errors.ruc ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
            disabled:cursor-not-allowed disabled:bg-gray-100
          `}
        />
        {errors.ruc && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.ruc}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Numero de RUC de Paraguay. Formato: 12345678-9
        </p>
      </div>
    </div>
  )
}
