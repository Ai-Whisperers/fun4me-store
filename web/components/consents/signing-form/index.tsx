'use client'

import type { JSX } from 'react'
import { useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import CustomFields from './custom-fields'
import ConsentPreview from './consent-preview'
import IDVerification from './id-verification'
import SignaturePad from './signature-pad'
import WitnessSignature from './witness-signature'
import { useSignature } from './use-signature'
import type { ConsentTemplate, Pet, Owner, SigningFormData } from './types'

interface SigningFormProps {
  template: ConsentTemplate
  pet: Pet
  owner: Owner
  onSubmit: (data: SigningFormData) => Promise<void>
  onCancel: () => void
}

export default function SigningForm({
  template,
  pet,
  owner,
  onSubmit,
  onCancel,
}: SigningFormProps): JSX.Element {
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean | null | undefined>>({})
  const [witnessName, setWitnessName] = useState('')
  const [idVerificationType, setIdVerificationType] = useState('')
  const [idVerificationNumber, setIdVerificationNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Owner signature
  const ownerSignature = useSignature()

  // Witness signature
  const witnessSignature = useSignature()

  const handleFieldChange = (fieldName: string, value: string | number | boolean | null): void => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const validateForm = (): string | null => {
    // Validate required custom fields
    if (template.fields) {
      for (const field of template.fields) {
        if (field.is_required && !fieldValues[field.field_name]) {
          return `El campo "${field.field_label}" es requerido`
        }
      }
    }

    // Validate signature
    const signatureData = ownerSignature.getSignatureData()
    if (!signatureData) {
      return 'Debe proporcionar una firma'
    }

    // Validate witness signature if required
    if (template.requires_witness) {
      const witnessSignatureData = witnessSignature.getSignatureData()
      if (!witnessSignatureData) {
        return 'Se requiere firma del testigo'
      }
      if (!witnessName.trim()) {
        return 'Debe ingresar el nombre del testigo'
      }
    }

    // Validate ID verification if required
    if (template.requires_id_verification) {
      if (!idVerificationType || !idVerificationNumber) {
        return 'Se requiere verificación de identidad'
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setFormError(null)

    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSubmitting(true)

    try {
      const data: SigningFormData = {
        template_id: template.id,
        pet_id: pet.id,
        owner_id: owner.id,
        field_values: fieldValues,
        signature_data: ownerSignature.getSignatureData(),
      }

      if (template.requires_witness) {
        data.witness_signature_data = witnessSignature.getSignatureData()
        data.witness_name = witnessName
      }

      if (template.requires_id_verification) {
        data.id_verification_type = idVerificationType
        data.id_verification_number = idVerificationNumber
      }

      await onSubmit(data)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al enviar el consentimiento')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="font-medium">{formError}</p>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="ml-auto hover:opacity-70"
              aria-label="Cerrar mensaje de error"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <CustomFields
        fields={template.fields || []}
        values={fieldValues}
        onChange={handleFieldChange}
      />

      <ConsentPreview template={template} pet={pet} owner={owner} fieldValues={fieldValues} />

      {template.requires_id_verification && (
        <IDVerification
          idVerificationType={idVerificationType}
          idVerificationNumber={idVerificationNumber}
          onTypeChange={setIdVerificationType}
          onNumberChange={setIdVerificationNumber}
        />
      )}

      <SignaturePad
        signatureMode={ownerSignature.signatureMode}
        onModeChange={ownerSignature.setSignatureMode}
        signatureText={ownerSignature.signatureText}
        onSignatureTextChange={ownerSignature.setSignatureText}
        canvasRef={ownerSignature.canvasRef}
        canvasContainerRef={ownerSignature.canvasContainerRef}
        onStartDrawing={ownerSignature.startDrawing}
        onDraw={ownerSignature.draw}
        onStopDrawing={ownerSignature.stopDrawing}
        onClearSignature={ownerSignature.clearSignature}
        label="Firma del propietario"
        required={true}
      />

      {template.requires_witness && (
        <WitnessSignature
          witnessName={witnessName}
          onWitnessNameChange={setWitnessName}
          signatureMode={witnessSignature.signatureMode}
          onModeChange={witnessSignature.setSignatureMode}
          signatureText={witnessSignature.signatureText}
          onSignatureTextChange={witnessSignature.setSignatureText}
          canvasRef={witnessSignature.canvasRef}
          canvasContainerRef={witnessSignature.canvasContainerRef}
          onStartDrawing={witnessSignature.startDrawing}
          onDraw={witnessSignature.draw}
          onStopDrawing={witnessSignature.stopDrawing}
          onClearSignature={witnessSignature.clearSignature}
        />
      )}

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-[var(--bg-default)] px-4 py-3 text-[var(--text-primary)] transition-colors disabled:opacity-50 sm:px-6"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:px-6"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              Enviando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Firmar y enviar
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export type { SigningFormData } from './types'
