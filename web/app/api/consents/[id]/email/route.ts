import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { sendEmail } from '@/lib/email/client'
import {
  generateSignedConsentEmail,
  generateSignedConsentEmailText,
} from '@/lib/email/templates/consent-signed'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { renderToBuffer } from '@react-pdf/renderer'
import { ConsentPDF } from '@/components/consents/consent-pdf'
import React from 'react'

/**
 * POST /api/consents/[id]/email - Send signed consent via email
 */
export const POST = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const consentId = params.id

    try {
      // Get consent with all related data
      const { data: consent, error: consentError } = await supabase
        .from('consent_documents')
        .select(
          `
          *,
          pet:pets!inner(id, name, species, breed, tenant_id),
          owner:profiles!consent_documents_signed_by_id_fkey(id, full_name, email, phone),
          template:consent_templates(id, name, category, content),
          signed_by_user:profiles!consent_documents_signed_by_id_fkey(full_name)
        `
        )
        .eq('id', consentId)
        .eq('pet.tenant_id', profile.tenant_id)
        .single()

      if (consentError || !consent) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'consent' },
        })
      }

      // Verify consent is signed
      if (!consent.signed_at || !consent.signature_data) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Consent not signed yet' },
        })
      }

      // Get owner email
      const ownerEmail = consent.owner?.email
      if (!ownerEmail) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'Owner has no email registered' },
        })
      }

      // Get clinic info
      const { data: clinic } = await supabase
        .from('tenants')
        .select('name, phone, email, logo_url')
        .eq('id', profile.tenant_id)
        .single()

      // Generate email content
      const emailData = {
        clinicName: clinic?.name || 'Clínica Veterinaria',
        clinicLogo: clinic?.logo_url,
        clinicPhone: clinic?.phone,
        clinicEmail: clinic?.email,
        ownerName: consent.owner?.full_name || 'Propietario',
        petName: consent.pet?.name || 'Mascota',
        consentType: consent.template?.name || 'Consentimiento',
        consentCategory: consent.template?.category,
        signedAt: consent.signed_at,
        signedBy: consent.signed_by_user?.full_name || consent.owner?.full_name || 'Propietario',
      }

      const html = generateSignedConsentEmail(emailData)
      const text = generateSignedConsentEmailText(emailData)

      // Helper to render consent content with placeholders replaced
      const renderConsentContent = (): string => {
        let content = consent.custom_content || consent.template?.content || ''

        // Replace pet placeholders
        content = content.replace(/{{pet_name}}/g, consent.pet?.name || '')
        content = content.replace(/{{pet_species}}/g, consent.pet?.species || '')
        content = content.replace(/{{pet_breed}}/g, consent.pet?.breed || '')

        // Replace owner placeholders
        content = content.replace(/{{owner_name}}/g, consent.owner?.full_name || '')
        content = content.replace(/{{owner_email}}/g, consent.owner?.email || '')
        content = content.replace(/{{owner_phone}}/g, consent.owner?.phone || '')

        // Replace custom field placeholders
        if (consent.field_values) {
          Object.keys(consent.field_values).forEach((key) => {
            const value = consent.field_values[key]
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
          })
        }

        // Replace date placeholder
        content = content.replace(
          /{{date}}/g,
          new Date(consent.signed_at).toLocaleDateString('es-PY')
        )

        return content
      }

      // Generate PDF for attachment
      let pdfBuffer: Buffer | null = null
      try {
        pdfBuffer = await renderToBuffer(
          // @ts-expect-error - react-pdf createElement type mismatch with React.createElement
          React.createElement(ConsentPDF, {
            clinicName: clinic?.name || 'Clínica Veterinaria',
            templateName: consent.template?.name || 'Consentimiento',
            templateCategory: consent.template?.category || 'other',
            documentNumber: consentId.substring(0, 8).toUpperCase(),
            petName: consent.pet?.name || '',
            petSpecies: consent.pet?.species || '',
            petBreed: consent.pet?.breed || '',
            ownerName: consent.owner?.full_name || '',
            ownerEmail: consent.owner?.email || '',
            ownerPhone: consent.owner?.phone || '',
            content: renderConsentContent(),
            fieldValues: consent.field_values || {},
            signatureData: consent.signature_data,
            signedAt: consent.signed_at,
            witnessName: consent.witness_name || undefined,
            witnessSignatureData: consent.witness_signature_data || undefined,
            idVerificationType: consent.id_verification_type || undefined,
            idVerificationNumber: consent.id_verification_number || undefined,
            status: consent.status || 'active',
          })
        )
      } catch (pdfError) {
        logger.warn('Failed to generate consent PDF for email attachment', {
          tenantId: profile.tenant_id,
          consentId,
          error: pdfError instanceof Error ? pdfError.message : 'Unknown',
        })
        // Continue without PDF attachment
      }

      // Send email with optional PDF attachment
      const result = await sendEmail({
        to: ownerEmail,
        subject: `Consentimiento Firmado - ${consent.template?.name || 'Documento'} para ${consent.pet?.name}`,
        html,
        text,
        replyTo: clinic?.email,
        attachments: pdfBuffer
          ? [
              {
                filename: `consentimiento-${consent.pet?.name || 'documento'}-${new Date(consent.signed_at).toLocaleDateString('es-PY').replace(/\//g, '-')}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      })

      if (!result.success) {
        logger.error('Error sending consent email', {
          tenantId: profile.tenant_id,
          consentId,
          error: result.error,
        })
        return apiError('EXTERNAL_SERVICE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { service: 'email', error: result.error },
        })
      }

      // Log the action
      await supabase.from('consent_audit_log').insert({
        consent_document_id: consentId,
        action: 'sent',
        performed_by: user.id,
        details: {
          sent_to: ownerEmail,
          message_id: result.messageId,
        },
      })

      // Update email sent timestamp on consent
      await supabase
        .from('consent_documents')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', consentId)

      return NextResponse.json({
        success: true,
        message: `Email enviado a ${ownerEmail}`,
        messageId: result.messageId,
      })
    } catch (e) {
      logger.error('Error sending consent email', {
        tenantId: profile.tenant_id,
        consentId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
