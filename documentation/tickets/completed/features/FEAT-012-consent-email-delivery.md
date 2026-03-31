# FEAT-012: Consent Document Email Delivery

## Priority: P2 - Medium
## Category: Feature
## Status: ✅ Complete
## Epic: [EPIC-08: Feature Completion](../epics/EPIC-08-feature-completion.md)
## Completion Date: January 2026
## Affected Areas: Consents, Email, Communications

## Description

Implement email delivery for signed consent documents, allowing staff to send consent PDFs directly to clients.

## Source

Derived from `documentation/feature-gaps/INCOMPLETE_FEATURES_ANALYSIS.md` (TICKET-005)

## Context

> **TODO in code**: `dashboard/consents/[id]/page.tsx:205` - "TODO: Implement email sending"
> **Button exists**: "Enviar por Email" visible but non-functional
> **Email service**: Resend configured but not connected here

## Current State

- Consent documents can be created and signed
- PDF generation works for consents
- Email service (Resend) is configured and working elsewhere
- "Enviar por Email" button renders but does nothing
- No email template for consent delivery

## Proposed Solution

### 1. Server Action for Email

```typescript
// actions/consents.ts
export const sendConsentEmail = withActionAuth(
  async ({ profile, supabase }, consentId: string) => {
    // Fetch consent with client info
    const { data: consent } = await supabase
      .from('consent_documents')
      .select(`
        *,
        pets (name, owner:profiles(email, full_name)),
        templates:consent_templates(name)
      `)
      .eq('id', consentId)
      .single();

    if (!consent) return actionError('Consentimiento no encontrado');

    // Generate PDF
    const pdfBuffer = await generateConsentPDF(consent);

    // Send email with attachment
    await sendEmail({
      to: consent.pets.owner.email,
      subject: `Documento de Consentimiento - ${consent.templates.name}`,
      template: 'consent-document',
      attachments: [{
        filename: `consentimiento-${consentId}.pdf`,
        content: pdfBuffer,
      }],
      data: {
        clientName: consent.pets.owner.full_name,
        petName: consent.pets.name,
        consentType: consent.templates.name,
        signedDate: formatDate(consent.signed_at),
      },
    });

    // Update consent record
    await supabase
      .from('consent_documents')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', consentId);

    return actionSuccess({ message: 'Email enviado correctamente' });
  },
  { requireStaff: true }
);
```

### 2. Email Template

```html
<!-- emails/consent-document.html -->
<h1>Documento de Consentimiento</h1>
<p>Estimado/a {{clientName}},</p>
<p>
  Adjunto encontrará el documento de consentimiento firmado para
  {{petName}} - {{consentType}}.
</p>
<p>Fecha de firma: {{signedDate}}</p>
<p>
  Este documento es para sus registros. Por favor guárdelo
  para futuras referencias.
</p>
```

### 3. UI Update

```typescript
// dashboard/consents/[id]/page.tsx
<Button
  onClick={async () => {
    const result = await sendConsentEmail(consent.id);
    if (result.success) {
      toast.success('Email enviado correctamente');
    } else {
      toast.error(result.error);
    }
  }}
  disabled={!consent.signed_at}
>
  <Mail className="h-4 w-4 mr-2" />
  Enviar por Email
</Button>
```

## Implementation Steps

1. [x] Create `sendConsentEmail` server action
2. [x] Create email template for consent documents
3. [x] Add `email_sent_at` column to consent_documents table (migration 063)
4. [x] Wire up button in consent detail page
5. [x] Add sent status indicator to UI
6. [x] Test email delivery with PDF attachment

## Acceptance Criteria

- [x] Email sends with consent PDF attached
- [x] Client receives professional Spanish email
- [x] Sent status shown in UI (email_sent_at timestamp)
- [x] Can resend if needed (button shows "Reenviar email")
- [x] Only signed consents can be emailed (validation check)
- [x] Error handling for invalid email addresses

## Implementation Notes

### Files Created/Modified:
- `web/db/migrations/063_consent_email_tracking.sql` - Added `email_sent_at` column
- `web/lib/email/client.ts` - Added attachment support to `sendEmail` function
- `web/app/api/consents/[id]/email/route.ts` - Enhanced with PDF generation and attachment
- `web/app/[clinic]/dashboard/consents/[id]/page.tsx` - Added email status indicator and button

### Features:
1. **PDF Attachment**: Consent document is automatically generated as PDF and attached
2. **Email Template**: Professional HTML email with clinic branding (lib/email/templates/consent-signed.ts)
3. **Status Tracking**: `email_sent_at` timestamp stored and displayed in UI
4. **Visual Feedback**: Button changes color and text after email is sent
5. **Audit Trail**: "sent" action logged in consent_audit_log
6. **Graceful Degradation**: If PDF generation fails, email sends without attachment

## Related Files

- `web/app/[clinic]/dashboard/consents/[id]/page.tsx:205` - TODO location
- `web/lib/email/` - Email service configuration
- `web/components/consent/consent-pdf.tsx` - PDF generation (if exists)

## Estimated Effort

- Server action: 2 hours
- Email template: 1 hour
- UI updates: 1 hour
- Testing: 1 hour
- **Total: 5 hours**

---
*Created: January 2026*
*Derived from INCOMPLETE_FEATURES_ANALYSIS.md*
