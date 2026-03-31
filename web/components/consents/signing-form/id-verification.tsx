'use client'

import type { JSX } from 'react'

interface IDVerificationProps {
  idVerificationType: string
  idVerificationNumber: string
  onTypeChange: (type: string) => void
  onNumberChange: (number: string) => void
}

export default function IDVerification({
  idVerificationType,
  idVerificationNumber,
  onTypeChange,
  onNumberChange,
}: IDVerificationProps): JSX.Element {
  return (
    <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-4 sm:p-6">
      <h3 className="mb-4 text-base font-semibold text-[var(--text-primary)] sm:text-lg">
        Verificación de identidad
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Tipo de documento <span className="text-red-600">*</span>
          </label>
          <select
            value={idVerificationType}
            onChange={(e) => onTypeChange(e.target.value)}
            required
            className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Seleccionar...</option>
            <option value="ci">Cédula de Identidad</option>
            <option value="passport">Pasaporte</option>
            <option value="ruc">RUC</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Número de documento <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={idVerificationNumber}
            onChange={(e) => onNumberChange(e.target.value)}
            required
            className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </div>
    </div>
  )
}
