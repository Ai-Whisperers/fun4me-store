'use client'

/**
 * Step 3: Admin Account
 *
 * Collects admin user credentials: email, password, full name, and optional referral code
 */

import { useState, useCallback } from 'react'
import { AlertCircle, Eye, EyeOff, CheckCircle2, Gift, Loader2 } from 'lucide-react'
import type { AdminAccountData } from '@/lib/signup/types'

interface AdminAccountStepProps {
  data: AdminAccountData
  errors: Partial<Record<keyof AdminAccountData, string>>
  onChange: (field: keyof AdminAccountData, value: string | null) => void
  disabled?: boolean
}

interface ReferralValidation {
  status: 'idle' | 'checking' | 'valid' | 'invalid'
  message?: string
  ambassadorName?: string
}

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Una letra mayuscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minuscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Un numero', test: (p) => /[0-9]/.test(p) },
]

export function AdminAccountStep({ data, errors, onChange, disabled }: AdminAccountStepProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [referralValidation, setReferralValidation] = useState<ReferralValidation>({ status: 'idle' })

  // Validate referral code against ambassador API
  const validateReferralCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setReferralValidation({ status: 'idle' })
      return
    }

    setReferralValidation({ status: 'checking' })

    try {
      const response = await fetch(`/api/ambassador/validate?code=${encodeURIComponent(code.trim())}`)
      const result = await response.json()

      if (result.valid) {
        setReferralValidation({
          status: 'valid',
          message: 'Codigo valido',
          ambassadorName: result.ambassadorName,
        })
      } else {
        setReferralValidation({
          status: 'invalid',
          message: result.error || 'Codigo no valido',
        })
      }
    } catch (_error: unknown) {
      setReferralValidation({
        status: 'invalid',
        message: 'Error al validar el codigo',
      })
    }
  }, [])

  // Debounced referral code change handler
  const handleReferralCodeChange = useCallback((value: string) => {
    onChange('referralCode', value || null)
    // Validate after a short delay
    const timeoutId = setTimeout(() => validateReferralCode(value), 500)
    return () => clearTimeout(timeoutId)
  }, [onChange, validateReferralCode])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Cuenta de Administrador</h2>
        <p className="mt-1 text-sm text-gray-600">
          Crea tu cuenta para administrar la clinica
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <label htmlFor="adminFullName" className="block text-sm font-medium text-gray-700">
          Nombre Completo <span className="text-red-500">*</span>
        </label>
        <input
          id="adminFullName"
          type="text"
          value={data.adminFullName}
          onChange={(e) => onChange('adminFullName', e.target.value)}
          disabled={disabled}
          placeholder="Dr. Juan Perez"
          className={`
            w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2
            ${errors.adminFullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
            disabled:cursor-not-allowed disabled:bg-gray-100
          `}
        />
        {errors.adminFullName && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.adminFullName}
          </div>
        )}
      </div>

      {/* Admin Email */}
      <div className="space-y-2">
        <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
          Email de Acceso <span className="text-red-500">*</span>
        </label>
        <input
          id="adminEmail"
          type="email"
          value={data.adminEmail}
          onChange={(e) => onChange('adminEmail', e.target.value)}
          disabled={disabled}
          placeholder="admin@miclinica.com"
          className={`
            w-full rounded-lg border px-4 py-2 text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2
            ${errors.adminEmail ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
            disabled:cursor-not-allowed disabled:bg-gray-100
          `}
        />
        {errors.adminEmail && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.adminEmail}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Este email sera usado para iniciar sesion en el panel de administracion
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
          Contrasena <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="adminPassword"
            type={showPassword ? 'text' : 'password'}
            value={data.adminPassword}
            onChange={(e) => onChange('adminPassword', e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            disabled={disabled}
            placeholder="********"
            className={`
              w-full rounded-lg border px-4 py-2 pr-10 text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2
              ${errors.adminPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
              disabled:cursor-not-allowed disabled:bg-gray-100
            `}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.adminPassword && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors.adminPassword}
          </div>
        )}

        {/* Password Requirements */}
        {(passwordFocused || data.adminPassword) && (
          <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-700">Requisitos de contrasena:</p>
            <ul className="space-y-1">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const passed = req.test(data.adminPassword)
                return (
                  <li
                    key={req.label}
                    className={`flex items-center gap-2 text-xs ${passed ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    {passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />
                    )}
                    {req.label}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Referral Code (Optional) */}
      <div className="space-y-2">
        <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700">
          <span className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-600" />
            Codigo de Referido
            <span className="text-xs font-normal text-gray-500">(opcional)</span>
          </span>
        </label>
        <div className="relative">
          <input
            id="referralCode"
            type="text"
            value={data.referralCode || ''}
            onChange={(e) => handleReferralCodeChange(e.target.value.toUpperCase())}
            disabled={disabled}
            placeholder="ABC123"
            maxLength={20}
            className={`
              w-full rounded-lg border px-4 py-2 pr-10 text-gray-900 placeholder:text-gray-400 uppercase
              focus:outline-none focus:ring-2
              ${referralValidation.status === 'invalid'
                ? 'border-red-500 focus:ring-red-500'
                : referralValidation.status === 'valid'
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
              }
              disabled:cursor-not-allowed disabled:bg-gray-100
            `}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {referralValidation.status === 'checking' && (
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            )}
            {referralValidation.status === 'valid' && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {referralValidation.status === 'invalid' && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>

        {/* Validation Messages */}
        {referralValidation.status === 'valid' && referralValidation.ambassadorName && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Referido por: {referralValidation.ambassadorName}
          </div>
        )}
        {referralValidation.status === 'invalid' && referralValidation.message && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {referralValidation.message}
          </div>
        )}

        <p className="text-xs text-gray-500">
          Si alguien te refirio a Vetic, ingresa su codigo para obtener beneficios exclusivos
        </p>
      </div>

      {/* Security Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota de seguridad:</strong> Tu contrasena se almacena de forma encriptada.
          Podras recuperarla o cambiarla en cualquier momento desde tu cuenta.
        </p>
      </div>
    </div>
  )
}
