'use client'

import type { JSX } from 'react'
import DOMPurify from 'dompurify'
import type { ConsentTemplate, Pet, Owner } from './types'

// SEC-005: Strict DOMPurify configuration to prevent XSS
// Only allow safe formatting tags for consent documents
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
  ],
  ALLOWED_ATTR: [
    'class', // Allow CSS classes for styling
  ],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'link', 'meta', 'object', 'embed'],
  FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur', 'href', 'src', 'action'],
}

interface ConsentPreviewProps {
  template: ConsentTemplate
  pet: Pet
  owner: Owner
  fieldValues: Record<string, string | number | boolean | null | undefined>
}

export default function ConsentPreview({
  template,
  pet,
  owner,
  fieldValues,
}: ConsentPreviewProps): JSX.Element {
  const renderContent = (): string => {
    let content = template.content

    // Replace pet placeholders
    content = content.replace(/{{pet_name}}/g, pet.name)
    content = content.replace(/{{pet_species}}/g, pet.species)
    content = content.replace(/{{pet_breed}}/g, pet.breed)

    // Replace owner placeholders
    content = content.replace(/{{owner_name}}/g, owner.full_name)
    content = content.replace(/{{owner_email}}/g, owner.email)
    content = content.replace(/{{owner_phone}}/g, owner.phone || '')

    // Replace custom field placeholders
    Object.keys(fieldValues).forEach((key) => {
      const value = fieldValues[key]
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''))
    })

    // Replace date placeholder
    content = content.replace(/{{date}}/g, new Date().toLocaleDateString('es-PY'))

    return content
  }

  return (
    <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Documento de consentimiento
      </h3>
      <div
        className="prose max-w-none text-[var(--text-primary)]"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderContent(), DOMPURIFY_CONFIG as Parameters<typeof DOMPurify.sanitize>[1]) }}
      />
    </div>
  )
}
