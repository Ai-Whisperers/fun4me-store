'use client'

import { useState } from 'react'
import { X, Building2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface SupplierFormData {
  name: string
  legal_name: string
  tax_id: string
  contact_info: {
    email: string
    phone: string
    address: string
    city: string
    contact_person: string
  }
  supplier_type: 'products' | 'services' | 'both'
  minimum_order_amount: string
  payment_terms: string
  delivery_time_days: string
  notes: string
}

interface Supplier {
  id: string
  name: string
  legal_name: string | null
  tax_id: string | null
  contact_info: {
    email?: string
    phone?: string
    address?: string
    city?: string
    contact_person?: string
  } | null
  supplier_type: 'products' | 'services' | 'both'
  minimum_order_amount: number | null
  payment_terms: string | null
  delivery_time_days: number | null
  notes?: string | null
}

interface SupplierFormProps {
  supplier?: Supplier | null
  onClose: () => void
  onSuccess: () => void
}

export function SupplierForm({ supplier, onClose, onSuccess }: SupplierFormProps): React.ReactElement {
  const { toast } = useToast()
  const isEditing = !!supplier

  const [formData, setFormData] = useState<SupplierFormData>({
    name: supplier?.name || '',
    legal_name: supplier?.legal_name || '',
    tax_id: supplier?.tax_id || '',
    contact_info: {
      email: supplier?.contact_info?.email || '',
      phone: supplier?.contact_info?.phone || '',
      address: supplier?.contact_info?.address || '',
      city: supplier?.contact_info?.city || '',
      contact_person: supplier?.contact_info?.contact_person || '',
    },
    supplier_type: supplier?.supplier_type || 'products',
    minimum_order_amount: supplier?.minimum_order_amount?.toString() || '',
    payment_terms: supplier?.payment_terms || '',
    delivery_time_days: supplier?.delivery_time_days?.toString() || '',
    notes: supplier?.notes || '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (formData.contact_info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_info.email)) {
      newErrors.email = 'Email inválido'
    }

    if (formData.minimum_order_amount && isNaN(parseFloat(formData.minimum_order_amount))) {
      newErrors.minimum_order_amount = 'Monto inválido'
    }

    if (formData.delivery_time_days && isNaN(parseInt(formData.delivery_time_days))) {
      newErrors.delivery_time_days = 'Valor inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        legal_name: formData.legal_name.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        contact_info: {
          email: formData.contact_info.email.trim() || undefined,
          phone: formData.contact_info.phone.trim() || undefined,
          address: formData.contact_info.address.trim() || undefined,
          city: formData.contact_info.city.trim() || undefined,
          contact_person: formData.contact_info.contact_person.trim() || undefined,
        },
        supplier_type: formData.supplier_type,
        minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : undefined,
        payment_terms: formData.payment_terms.trim() || undefined,
        delivery_time_days: formData.delivery_time_days ? parseInt(formData.delivery_time_days) : undefined,
        notes: formData.notes.trim() || undefined,
      }

      const url = isEditing ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar proveedor')
      }

      toast({
        title: isEditing ? 'Proveedor actualizado' : 'Proveedor creado',
        description: `${formData.name} ha sido ${isEditing ? 'actualizado' : 'creado'} exitosamente`,
      })

      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al guardar proveedor',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const updateContactInfo = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        [field]: value,
      },
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
              <Building2 className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Modifica los datos del proveedor' : 'Agrega un nuevo proveedor a tu lista'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Información Básica</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nombre <span className="text-[var(--status-error)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                      errors.name ? 'border-[var(--status-error-border)] focus:border-[var(--status-error)]' : 'border-gray-200 focus:border-[var(--primary)]'
                    }`}
                    placeholder="Nombre comercial"
                  />
                  {errors.name && <p className="mt-1 text-xs text-[var(--status-error)]">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                    placeholder="Razón social legal"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    RUC
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                    placeholder="80012345-6"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tipo de Proveedor
                  </label>
                  <select
                    value={formData.supplier_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_type: e.target.value as 'products' | 'services' | 'both' }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="products">Productos</option>
                    <option value="services">Servicios</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Información de Contacto</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={formData.contact_info.contact_person}
                    onChange={(e) => updateContactInfo('contact_person', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_info.phone}
                    onChange={(e) => updateContactInfo('phone', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                    placeholder="+595 21 123 456"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_info.email}
                    onChange={(e) => updateContactInfo('email', e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                      errors.email ? 'border-[var(--status-error-border)] focus:border-[var(--status-error)]' : 'border-gray-200 focus:border-[var(--primary)]'
                    }`}
                    placeholder="contacto@proveedor.com"
                  />
                  {errors.email && <p className="mt-1 text-xs text-[var(--status-error)]">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.contact_info.city}
                    onChange={(e) => updateContactInfo('city', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                    placeholder="Asunción"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.contact_info.address}
                    onChange={(e) => updateContactInfo('address', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                    placeholder="Av. España 1234"
                  />
                </div>
              </div>
            </div>

            {/* Commercial Terms */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Condiciones Comerciales</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Monto Mínimo (₲)
                  </label>
                  <input
                    type="number"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_order_amount: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                      errors.minimum_order_amount ? 'border-[var(--status-error-border)] focus:border-[var(--status-error)]' : 'border-gray-200 focus:border-[var(--primary)]'
                    }`}
                    placeholder="500000"
                    min="0"
                  />
                  {errors.minimum_order_amount && <p className="mt-1 text-xs text-[var(--status-error)]">{errors.minimum_order_amount}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tiempo de Entrega (días)
                  </label>
                  <input
                    type="number"
                    value={formData.delivery_time_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_time_days: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                      errors.delivery_time_days ? 'border-[var(--status-error-border)] focus:border-[var(--status-error)]' : 'border-gray-200 focus:border-[var(--primary)]'
                    }`}
                    placeholder="3"
                    min="0"
                  />
                  {errors.delivery_time_days && <p className="mt-1 text-xs text-[var(--status-error)]">{errors.delivery_time_days}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Condiciones de Pago
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                    placeholder="30 días"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
                rows={3}
                placeholder="Notas adicionales sobre el proveedor..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
