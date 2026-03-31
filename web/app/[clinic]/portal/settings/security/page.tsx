'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Eye, EyeOff, Shield, Loader2, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SecuritySettingsPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 8) errors.push('Mínimo 8 caracteres')
    if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula')
    if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula')
    if (!/[0-9]/.test(password)) errors.push('Al menos un número')
    return errors
  }

  const passwordErrors = newPassword ? validatePassword(newPassword) : []
  const passwordsMatch = newPassword === confirmPassword
  const canSubmit =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    passwordErrors.length === 0 &&
    passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canSubmit) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar contraseña'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      <div className="container mx-auto max-w-xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`/${clinic}/portal/dashboard`}
            className="rounded-xl p-2 transition-colors hover:bg-white"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Seguridad</h1>
            <p className="text-sm text-gray-500">Cambia tu contraseña</p>
          </div>
        </div>

        {/* Password Change Form */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <Lock className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Cambiar Contraseña</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div>
              <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-bold text-gray-600"
              >
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 outline-none focus:border-[var(--primary)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-bold text-gray-600">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 pr-12 outline-none transition-colors ${
                    newPassword && passwordErrors.length > 0
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[var(--primary)]'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div className="mt-3 space-y-1">
                  {[
                    { check: newPassword.length >= 8, text: 'Mínimo 8 caracteres' },
                    { check: /[A-Z]/.test(newPassword), text: 'Al menos una mayúscula' },
                    { check: /[a-z]/.test(newPassword), text: 'Al menos una minúscula' },
                    { check: /[0-9]/.test(newPassword), text: 'Al menos un número' },
                  ].map((req) => (
                    <div
                      key={req.text}
                      className={`flex items-center gap-2 text-xs ${
                        req.check ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {req.check ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-current" />
                      )}
                      {req.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-bold text-gray-600"
              >
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 pr-12 outline-none transition-colors ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[var(--primary)]'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="mt-2 text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-600"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-green-600"
              >
                <Check className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                Contraseña actualizada correctamente
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Cambiar Contraseña
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Tips */}
        <div className="mt-6 rounded-2xl bg-blue-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-blue-800">
            <Shield className="h-5 w-5" />
            Consejos de Seguridad
          </h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>• No compartas tu contraseña con nadie</li>
            <li>• Usa una contraseña única para cada servicio</li>
            <li>• Cambia tu contraseña periódicamente</li>
            <li>• Evita contraseñas obvias como fechas de nacimiento</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
