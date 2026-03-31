'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PetSelector } from './pet-selector'
import { LineItems } from './line-items'
import { TotalsSummary } from './totals-summary'
import { createInvoice, updateInvoice } from '@/app/actions/invoices'
import { calculateLineTotal, type InvoiceFormData } from '@/lib/types/invoicing'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  photo_url?: string
  owner?: {
    id: string
    full_name: string
    phone?: string
    email?: string
  }
}

interface Service {
  id: string
  name: string
  base_price: number
  category?: string
}

interface LineItem {
  id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  line_total?: number
}

interface InvoiceFormProps {
  clinic: string
  pets: Pet[]
  services: Service[]
  initialData?: {
    id?: string
    pet_id?: string
    items?: LineItem[]
    notes?: string
    due_date?: string
    tax_rate?: number
  }
  mode?: 'create' | 'edit'
}

export function InvoiceForm({
  clinic,
  pets,
  services,
  initialData,
  mode = 'create',
}: InvoiceFormProps) {
  const t = useTranslations('invoices.form')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedPetId, setSelectedPetId] = useState<string | null>(initialData?.pet_id || null)
  const [items, setItems] = useState<LineItem[]>(initialData?.items || [])
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [dueDate, setDueDate] = useState(
    initialData?.due_date?.split('T')[0] ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const taxRate = initialData?.tax_rate || 10

  // Calculate line totals for items
  const itemsWithTotals = items.map((item) => ({
    ...item,
    line_total: calculateLineTotal(item.quantity, item.unit_price, item.discount_percent),
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // FORM-004: Prevent double-submit
    if (loading) return

    setLoading(true)
    setError(null)

    if (!selectedPetId) {
      setError(t('errorSelectPet'))
      setLoading(false)
      return
    }

    if (items.length === 0) {
      setError(t('errorAddItem'))
      setLoading(false)
      return
    }

    // Validate items
    const invalidItems = items.filter((i) => !i.description || i.unit_price <= 0)
    if (invalidItems.length > 0) {
      setError(t('errorItemValidation'))
      setLoading(false)
      return
    }

    // Build typed form data object
    const formData: InvoiceFormData = {
      pet_id: selectedPetId,
      items: itemsWithTotals.map((item) => ({
        service_id: item.service_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
      })),
      notes: notes || undefined,
      due_date: dueDate || undefined,
      tax_rate: taxRate,
    }

    try {
      let result
      if (mode === 'edit' && initialData?.id) {
        result = await updateInvoice(initialData.id, formData)
      } else {
        result = await createInvoice(formData)
      }

      if (!result.success) {
        setError(result.error || t('errorSaving'))
        setLoading(false)
        return
      }

      if (mode === 'create' && result.data?.id) {
        router.push(`/${clinic}/dashboard/invoices/${result.data.id}`)
      } else {
        router.push(`/${clinic}/dashboard/invoices`)
      }
    } catch (_e) {
      setError(t('errorSavingInvoice'))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* TICKET-A11Y-004: Added role="alert" for screen readers */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"
        >
          <Icons.AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Pet Selector */}
          <PetSelector
            pets={pets}
            selectedPetId={selectedPetId}
            onSelect={setSelectedPetId}
            disabled={loading}
          />

          {/* Due Date */}
          <div>
            <label
              htmlFor="due-date-field"
              className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
            >
              {t('dueDate')}{' '}
              <span className="text-red-600" aria-label={t('required')}>
                *
              </span>
            </label>
            <input
              id="due-date-field"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
              required
              aria-invalid={error && !dueDate ? 'true' : 'false'}
              aria-describedby={error && !dueDate ? 'due-date-error' : 'due-date-help'}
              className="focus:ring-[var(--primary)]/20 w-full rounded-lg border border-gray-200 p-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            />
            <p id="due-date-help" className="sr-only">
              {t('dueDateHelp')}
            </p>
            {error && !dueDate && (
              <p id="due-date-error" role="alert" className="mt-1 text-sm text-red-600">
                {t('errorSelectDueDate')}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes-field"
              className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
            >
              {t('notes')}
            </label>
            <textarea
              id="notes-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder={t('notesPlaceholder')}
              aria-invalid="false"
              aria-describedby="notes-help"
              className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-lg border border-gray-200 p-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            />
            <p id="notes-help" className="sr-only">
              {t('notesHelp')}
            </p>
          </div>
        </div>

        {/* Right Column - Totals */}
        <div>
          <TotalsSummary items={itemsWithTotals} taxRate={taxRate} />
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <LineItems items={items} services={services} onChange={setItems} disabled={loading} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="rounded-lg px-4 py-2 text-[var(--text-secondary)] transition-colors hover:bg-gray-100"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Icons.Save className="h-4 w-4" />
              {mode === 'edit' ? t('saveChanges') : t('createInvoice')}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
