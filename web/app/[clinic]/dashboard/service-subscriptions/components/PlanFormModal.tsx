'use client'

/**
 * Plan Form Modal Component
 *
 * REF-006: Extracted plan form modal from client component
 */

import { X } from 'lucide-react'
import type { Plan, PlanFormData, ServiceOption } from '../types'

interface PlanFormModalProps {
  editingPlan: Plan | null
  planForm: PlanFormData
  setPlanForm: React.Dispatch<React.SetStateAction<PlanFormData>>
  services: ServiceOption[]
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}

export function PlanFormModal({
  editingPlan,
  planForm,
  setPlanForm,
  services,
  submitting,
  onSubmit,
  onClose,
}: PlanFormModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-primary,#fff)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Nombre del plan *
            </label>
            <input
              type="text"
              value={planForm.name}
              onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
              placeholder="Ej: Baño Mensual Premium"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Descripción
            </label>
            <textarea
              value={planForm.description}
              onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Servicio *
            </label>
            <select
              value={planForm.service_id}
              onChange={(e) => setPlanForm((prev) => ({ ...prev, service_id: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
            >
              <option value="">Seleccionar servicio</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Precio *
              </label>
              <input
                type="number"
                value={planForm.price_per_period}
                onChange={(e) =>
                  setPlanForm((prev) => ({ ...prev, price_per_period: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
                placeholder="150000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Frecuencia cobro
              </label>
              <select
                value={planForm.billing_frequency}
                onChange={(e) =>
                  setPlanForm((prev) => ({ ...prev, billing_frequency: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Frecuencia servicio
              </label>
              <select
                value={planForm.service_frequency}
                onChange={(e) =>
                  setPlanForm((prev) => ({ ...prev, service_frequency: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Servicios/período
              </label>
              <input
                type="number"
                value={planForm.services_per_period}
                onChange={(e) =>
                  setPlanForm((prev) => ({ ...prev, services_per_period: e.target.value }))
                }
                min="1"
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="rounded-lg bg-[var(--bg-secondary,#f9fafb)] p-4">
            <h4 className="mb-3 font-medium text-[var(--text-primary)]">Transporte</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={planForm.includes_pickup}
                  onChange={(e) =>
                    setPlanForm((prev) => ({ ...prev, includes_pickup: e.target.checked }))
                  }
                  className="rounded border-[var(--border-light,#e5e7eb)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  Incluir opción de recogida
                </span>
              </label>
              {planForm.includes_pickup && (
                <div className="ml-6">
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">
                    Costo de recogida (Gs)
                  </label>
                  <input
                    type="number"
                    value={planForm.pickup_fee}
                    onChange={(e) =>
                      setPlanForm((prev) => ({ ...prev, pickup_fee: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-sm text-[var(--text-primary)]"
                  />
                </div>
              )}

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={planForm.includes_delivery}
                  onChange={(e) =>
                    setPlanForm((prev) => ({ ...prev, includes_delivery: e.target.checked }))
                  }
                  className="rounded border-[var(--border-light,#e5e7eb)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  Incluir opción de entrega
                </span>
              </label>
              {planForm.includes_delivery && (
                <div className="ml-6">
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">
                    Costo de entrega (Gs)
                  </label>
                  <input
                    type="number"
                    value={planForm.delivery_fee}
                    onChange={(e) =>
                      setPlanForm((prev) => ({ ...prev, delivery_fee: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-sm text-[var(--text-primary)]"
                  />
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={planForm.is_featured}
              onChange={(e) =>
                setPlanForm((prev) => ({ ...prev, is_featured: e.target.checked }))
              }
              className="rounded border-[var(--border-light,#e5e7eb)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">Destacar plan</span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--border-light,#e5e7eb)] px-4 py-2 font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={
              !planForm.name || !planForm.service_id || !planForm.price_per_period || submitting
            }
            className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
