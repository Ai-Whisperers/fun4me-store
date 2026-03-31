'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { SigningForm } from '@/components/consents'
import type { SigningFormData } from '@/components/consents'
import type { JSX } from 'react'
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface TemplateField {
  id: string
  field_name: string
  field_type: string
  field_label: string
  is_required: boolean
  field_options: string[] | null
}

interface ConsentRequest {
  id: string
  template_id: string
  pet_id: string
  owner_id: string
  token: string
  expires_at: string
  status: string
  template: {
    id: string
    name: string
    category: string
    content: string
    requires_witness: boolean
    requires_id_verification: boolean
    fields?: TemplateField[]
  }
  pet: {
    id: string
    name: string
    species: string
    breed: string
    owner_id: string
  }
  owner: {
    id: string
    full_name: string
    email: string
    phone: string
  }
}

export default function RemoteSigningPage(): JSX.Element {
  const [request, setRequest] = useState<ConsentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const params = useParams()
  const supabase = createClient()

  const token = params?.token as string

  const validateToken = useCallback(async (): Promise<void> => {
    try {
      // Fetch consent request by token (no auth required)
      const { data, error } = await supabase
        .from('consent_requests')
        .select(
          `
          *,
          template:consent_templates!template_id(
            id,
            name,
            category,
            content,
            requires_witness,
            requires_id_verification,
            fields:consent_template_fields(*)
          ),
          pet:pets!pet_id(id, name, species, breed, owner_id),
          owner:profiles!owner_id(id, full_name, email, phone)
        `
        )
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('Token inválido o expirado')
        setLoading(false)
        return
      }

      // Check if already completed
      if (data.status === 'completed') {
        setError('Este consentimiento ya ha sido firmado')
        setLoading(false)
        return
      }

      // Check if expired
      const expiresAt = new Date(data.expires_at)
      const now = new Date()
      if (now > expiresAt) {
        setError('Este enlace ha expirado')
        setLoading(false)
        return
      }

      setRequest(data as ConsentRequest)
    } catch (err) {
      logger.error('Error validating consent token', {
        error: err instanceof Error ? err.message : 'Unknown error',
        token
      })
      setError('Error al validar el enlace')
    } finally {
      setLoading(false)
    }
  }, [token, supabase])

  useEffect(() => {
    if (token) {
      validateToken()
    }
  }, [token, validateToken])

  const handleSubmit = async (formData: SigningFormData): Promise<void> => {
    if (!request) return

    try {
      // Create consent document (no auth required for remote signing)
      const response = await fetch('/api/consents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Error al crear consentimiento')
      }

      // Update consent request status
      await supabase
        .from('consent_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      setSubmitted(true)
    } catch (err) {
      logger.error('Error submitting consent', {
        error: err instanceof Error ? err.message : 'Unknown error',
        token,
        requestId: request?.id
      })
      throw err
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-default)] p-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--primary)]"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-default)] p-4">
        <div className="border-[var(--primary)]/20 max-w-md rounded-lg border bg-[var(--bg-paper)] p-12 text-center">
          {error.includes('expirado') ? (
            <Clock className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
          ) : error.includes('firmado') ? (
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          ) : (
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          )}
          <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
            {error.includes('firmado') ? 'Ya firmado' : 'Error'}
          </h1>
          <p className="text-[var(--text-secondary)]">{error}</p>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Por favor, contacte con la clínica veterinaria si necesita asistencia.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-default)] p-4">
        <div className="border-[var(--primary)]/20 max-w-md rounded-lg border bg-[var(--bg-paper)] p-12 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
            Consentimiento firmado exitosamente
          </h1>
          <p className="mb-6 text-[var(--text-secondary)]">
            Gracias por completar el formulario de consentimiento. Su firma ha sido registrada de
            forma segura.
          </p>
          <div className="bg-[var(--primary)]/10 mb-6 rounded-lg p-4">
            <p className="text-sm text-[var(--text-primary)]">
              <strong>Mascota:</strong> {request?.pet.name}
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              <strong>Documento:</strong> {request?.template.name}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Recibirá una copia del consentimiento firmado por email.
            </p>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Puede cerrar esta ventana de forma segura.
          </p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-default)] p-4">
        <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">No se pudo cargar la solicitud</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="border-[var(--primary)]/20 mb-6 rounded-lg border bg-[var(--bg-paper)] p-6">
          <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
            Firma de Consentimiento Informado
          </h1>
          <p className="text-[var(--text-secondary)]">
            Por favor, lea cuidadosamente el documento y proporcione su firma digital para confirmar
            su consentimiento.
          </p>

          {/* Request Info */}
          <div className="mt-6 grid grid-cols-1 gap-4 rounded-lg bg-[var(--bg-default)] p-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Mascota</p>
              <p className="font-medium text-[var(--text-primary)]">{request.pet.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {request.pet.species} - {request.pet.breed}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Propietario</p>
              <p className="font-medium text-[var(--text-primary)]">{request.owner.full_name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{request.owner.email}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Válido hasta</p>
              <p className="font-medium text-[var(--text-primary)]">
                {new Date(request.expires_at).toLocaleDateString('es-PY')}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {new Date(request.expires_at).toLocaleTimeString('es-PY', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Firma segura</p>
              <p className="mt-1 text-xs">
                Su firma será almacenada de forma segura y encriptada. Este documento tiene validez
                legal.
              </p>
            </div>
          </div>
        </div>

        {/* Signing Form */}
        <SigningForm
          template={request.template}
          pet={request.pet}
          owner={request.owner}
          onSubmit={handleSubmit}
          onCancel={() => {
             
            if (confirm('¿Está seguro que desea cancelar? Perderá todo el progreso.')) {
              window.close()
            }
          }}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          <p>
            Al firmar este documento, usted confirma que ha leído y comprendido toda la información
            proporcionada.
          </p>
          <p className="mt-2">
            Si tiene preguntas, por favor contacte con la clínica veterinaria antes de firmar.
          </p>
        </div>
      </div>
    </div>
  )
}
