'use client'

import type { JSX } from 'react'
import type { TemplateField } from './types'

interface CustomFieldsProps {
  fields: TemplateField[]
  values: Record<string, string | number | boolean | null | undefined>
  onChange: (fieldName: string, value: string | number | boolean | null) => void
}

export default function CustomFields({ fields, values, onChange }: CustomFieldsProps): JSX.Element {
  if (!fields || fields.length === 0) {
    return <></>
  }

  return (
    <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Información adicional
      </h3>
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              {field.field_label}
              {field.is_required && <span className="ml-1 text-red-600">*</span>}
            </label>

            {field.field_type === 'text' && (
              <input
                type="text"
                value={String(values[field.field_name] ?? '')}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            )}

            {field.field_type === 'textarea' && (
              <textarea
                value={String(values[field.field_name] ?? '')}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
                rows={4}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            )}

            {field.field_type === 'select' && field.field_options && (
              <select
                value={String(values[field.field_name] ?? '')}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">Seleccionar...</option>
                {field.field_options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {field.field_type === 'date' && (
              <input
                type="date"
                value={String(values[field.field_name] ?? '')}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            )}

            {field.field_type === 'number' && (
              <input
                type="number"
                value={String(values[field.field_name] ?? '')}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
