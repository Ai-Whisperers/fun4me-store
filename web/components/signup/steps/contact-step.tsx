'use client'

/**
 * Step 2: Contact Details
 *
 * Collects clinic contact information: email, phone, WhatsApp, address, city
 */

import { AlertCircle } from 'lucide-react'
import { PARAGUAY_CITIES } from '@/lib/signup/types'
import type { ContactData } from '@/lib/signup/types'

interface ContactStepProps {
  data: ContactData
  errors: Partial<Record<keyof ContactData, string>>
  onChange: (field: keyof ContactData, value: string) => void
  disabled?: boolean
}

export function ContactStep({ data, errors, onChange, disabled }: ContactStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Datos de Contacto</h2>
        <p className="mt-1 text-sm text-gray-600">
          Informacion de contacto que veran tus clientes
        </p>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email de la Clinica <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
          disabled={disabled}
          placeholder="contacto@miclinica.com"
          className={`
            w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2
            ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
            disabled:cursor-not-allowed disabled:bg-gray-100
          `}
        />
        {errors.email && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.email}
          </div>
        )}
      </div>

      {/* Phone and WhatsApp in a row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Phone */}
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Telefono <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            disabled={disabled}
            placeholder="+595 21 123 4567"
            className={`
              w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2
              ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
              disabled:cursor-not-allowed disabled:bg-gray-100
            `}
          />
          {errors.phone && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {errors.phone}
            </div>
          )}
          <p className="text-xs text-gray-500">Numero para mostrar en tu sitio</p>
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
            WhatsApp <span className="text-red-500">*</span>
          </label>
          <div className="flex rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="flex items-center pl-3 text-gray-500 text-sm">595</span>
            <input
              id="whatsapp"
              type="tel"
              value={data.whatsapp.startsWith('595') ? data.whatsapp.slice(3) : data.whatsapp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                onChange('whatsapp', '595' + digits)
              }}
              disabled={disabled}
              placeholder="981123456"
              className={`
                flex-1 border-0 bg-transparent py-2 pr-3 text-gray-900 placeholder:text-gray-400
                focus:ring-0
                disabled:cursor-not-allowed
              `}
            />
          </div>
          {errors.whatsapp && (
            <div className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {errors.whatsapp}
            </div>
          )}
          <p className="text-xs text-gray-500">Solo numeros, sin el 0 inicial</p>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Direccion <span className="text-red-500">*</span>
        </label>
        <input
          id="address"
          type="text"
          value={data.address}
          onChange={(e) => onChange('address', e.target.value)}
          disabled={disabled}
          placeholder="Av. Mcal. Lopez 1234 c/ San Martin"
          className={`
            w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2
            ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
            disabled:cursor-not-allowed disabled:bg-gray-100
          `}
        />
        {errors.address && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.address}
          </div>
        )}
      </div>

      {/* City */}
      <div className="space-y-2">
        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
          Ciudad <span className="text-red-500">*</span>
        </label>
        <select
          id="city"
          value={data.city}
          onChange={(e) => onChange('city', e.target.value)}
          disabled={disabled}
          className={`
            w-full rounded-lg border px-4 py-2 text-gray-900
            focus:outline-none focus:ring-2
            ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
            disabled:cursor-not-allowed disabled:bg-gray-100
          `}
        >
          <option value="">Selecciona una ciudad</option>
          {PARAGUAY_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {errors.city && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.city}
          </div>
        )}
      </div>
    </div>
  )
}
