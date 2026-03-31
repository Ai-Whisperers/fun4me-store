'use client'

/**
 * Step 5: Confirmation
 *
 * Shows summary of all entered data and terms acceptance
 */

import { CheckCircle2, Building2, Phone, User, Palette, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import type { SignupFormData } from '@/lib/signup/types'

interface ConfirmationStepProps {
  data: SignupFormData
  termsAccepted: boolean
  onTermsChange: (accepted: boolean) => void
  onEditStep: (step: number) => void
  disabled?: boolean
}

export function ConfirmationStep({
  data,
  termsAccepted,
  onTermsChange,
  onEditStep,
  disabled,
}: ConfirmationStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Confirmar Datos</h2>
        <p className="mt-1 text-sm text-gray-600">
          Revisa la informacion antes de crear tu cuenta
        </p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Clinic Info */}
        <SummaryCard
          icon={Building2}
          title="Informacion de la Clinica"
          onEdit={() => onEditStep(1)}
          disabled={disabled}
        >
          <SummaryItem label="Nombre" value={data.clinicName} />
          <SummaryItem label="URL" value={`vetic.com/${data.slug}`} />
          {data.ruc && <SummaryItem label="RUC" value={data.ruc} />}
        </SummaryCard>

        {/* Contact Info */}
        <SummaryCard
          icon={Phone}
          title="Datos de Contacto"
          onEdit={() => onEditStep(2)}
          disabled={disabled}
        >
          <SummaryItem label="Email" value={data.email} />
          <SummaryItem label="Telefono" value={data.phone} />
          <SummaryItem label="WhatsApp" value={data.whatsapp} />
          <SummaryItem label="Direccion" value={data.address} />
          <SummaryItem label="Ciudad" value={data.city} />
        </SummaryCard>

        {/* Admin Account */}
        <SummaryCard
          icon={User}
          title="Cuenta de Administrador"
          onEdit={() => onEditStep(3)}
          disabled={disabled}
        >
          <SummaryItem label="Nombre" value={data.adminFullName} />
          <SummaryItem label="Email" value={data.adminEmail} />
          <SummaryItem label="Contrasena" value="••••••••" />
        </SummaryCard>

        {/* Branding */}
        <SummaryCard
          icon={Palette}
          title="Personalizacion"
          onEdit={() => onEditStep(4)}
          disabled={disabled}
        >
          <div className="flex items-center gap-4">
            {data.logoUrl ? (
              <div className="relative h-12 w-24 rounded border border-gray-200 bg-white p-1">
                <Image
                  src={data.logoUrl}
                  alt="Logo"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <span className="text-sm text-gray-500">Sin logo</span>
            )}
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg ring-1 ring-gray-200"
                style={{ backgroundColor: data.primaryColor }}
                title="Color primario"
              />
              <div
                className="h-8 w-8 rounded-lg ring-1 ring-gray-200"
                style={{ backgroundColor: data.secondaryColor }}
                title="Color secundario"
              />
            </div>
          </div>
        </SummaryCard>
      </div>

      {/* Trial Info */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Prueba gratuita de 90 dias</h3>
            <p className="mt-1 text-sm text-green-700">
              Tu clinica tendra acceso completo a todas las funcionalidades profesionales
              durante el periodo de prueba. Sin necesidad de tarjeta de credito.
            </p>
          </div>
        </div>
      </div>

      {/* Terms Acceptance */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => onTermsChange(e.target.checked)}
            disabled={disabled}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-600">
            He leido y acepto los{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Terminos de Servicio
            </a>{' '}
            y la{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Politica de Privacidad
            </a>
            .
          </span>
        </label>

        {!termsAccepted && (
          <div className="flex items-center gap-1 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            Debes aceptar los terminos para continuar
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  onEdit: () => void
  disabled?: boolean
  children: React.ReactNode
}

function SummaryCard({ icon: Icon, title, onEdit, disabled, children }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="text-sm text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Editar
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface SummaryItemProps {
  label: string
  value: string
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}
