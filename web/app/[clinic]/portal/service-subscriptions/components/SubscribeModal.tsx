'use client'

/**
 * Subscribe Modal Component
 *
 * REF-006: Extracted from client component
 */

import { X, Dog, Cat } from 'lucide-react'
import type { Plan, Pet, SubscribeFormData } from '../types'
import { WEEKDAY_OPTIONS, DAY_NAMES } from '../constants'
import { calculatePrice, formatPrice } from '../utils'

interface SubscribeModalProps {
  plan: Plan
  pets: Pet[]
  eligiblePets: Pet[]
  form: SubscribeFormData
  setForm: React.Dispatch<React.SetStateAction<SubscribeFormData>>
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}

export function SubscribeModal({
  plan,
  pets,
  eligiblePets,
  form,
  setForm,
  submitting,
  onSubmit,
  onClose,
}: SubscribeModalProps): React.ReactElement {
  const calculatedPrice = calculatePrice(plan, form.wantsPickup, form.wantsDelivery)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-primary,#fff)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Nueva Suscripción</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 rounded-lg bg-[var(--bg-secondary,#f9fafb)] p-4">
          <h3 className="font-medium text-[var(--text-primary)]">{plan.name}</h3>
          <p className="text-sm text-[var(--text-muted)]">{plan.service.name}</p>
        </div>

        {/* Pet Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Selecciona tu mascota
          </label>
          <div className="grid gap-2">
            {eligiblePets.length === 0 ? (
              <p className="text-sm text-[var(--status-error,#dc2626)]">
                No tienes mascotas elegibles para este plan
              </p>
            ) : (
              eligiblePets.map((pet) => (
                <label
                  key={pet.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    form.selectedPetId === pet.id
                      ? 'border-[var(--primary)] bg-[var(--primary-light,#e0e7ff)]'
                      : 'border-[var(--border-light,#e5e7eb)] hover:border-[var(--primary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="pet"
                    value={pet.id}
                    checked={form.selectedPetId === pet.id}
                    onChange={(e) => setForm((prev) => ({ ...prev, selectedPetId: e.target.value }))}
                    className="sr-only"
                  />
                  {pet.species === 'dog' ? (
                    <Dog className="h-5 w-5 text-[var(--text-muted)]" />
                  ) : (
                    <Cat className="h-5 w-5 text-[var(--text-muted)]" />
                  )}
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{pet.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {pet.breed || pet.species}
                      {pet.weight_kg && ` • ${pet.weight_kg}kg`}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Scheduling */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Día preferido</label>
            <select
              value={form.preferredDay}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredDay: Number(e.target.value) }))}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
            >
              {WEEKDAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {DAY_NAMES[day]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Horario preferido</label>
            <select
              value={form.preferredTime}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-[var(--text-primary)]"
            >
              <option value="morning">Mañana (8-12h)</option>
              <option value="afternoon">Tarde (12-18h)</option>
              <option value="evening">Noche (18-21h)</option>
            </select>
          </div>
        </div>

        {/* Pickup/Delivery Options */}
        {(plan.includes_pickup || plan.includes_delivery) && (
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">Servicios de transporte</p>

            {plan.includes_pickup && (
              <label className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.wantsPickup}
                  onChange={(e) => setForm((prev) => ({ ...prev, wantsPickup: e.target.checked }))}
                  className="mt-1 rounded border-[var(--border-light,#e5e7eb)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Recogida a domicilio
                    {plan.pickup_fee > 0 && (
                      <span className="ml-2 text-[var(--text-muted)]">+{formatPrice(plan.pickup_fee)}</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Recogemos a tu mascota en la dirección indicada</p>
                </div>
              </label>
            )}

            {form.wantsPickup && (
              <div className="mb-4 ml-6">
                <input
                  type="text"
                  value={form.pickupAddress}
                  onChange={(e) => setForm((prev) => ({ ...prev, pickupAddress: e.target.value }))}
                  placeholder="Dirección de recogida"
                  className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-sm text-[var(--text-primary)]"
                />
              </div>
            )}

            {plan.includes_delivery && (
              <label className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.wantsDelivery}
                  onChange={(e) => setForm((prev) => ({ ...prev, wantsDelivery: e.target.checked }))}
                  className="mt-1 rounded border-[var(--border-light,#e5e7eb)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Entrega a domicilio
                    {plan.delivery_fee > 0 && (
                      <span className="ml-2 text-[var(--text-muted)]">+{formatPrice(plan.delivery_fee)}</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Entregamos a tu mascota una vez finalizado el servicio
                  </p>
                </div>
              </label>
            )}

            {form.wantsDelivery && (
              <div className="mb-4 ml-6">
                <input
                  type="text"
                  value={form.deliveryAddress}
                  onChange={(e) => setForm((prev) => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="Dirección de entrega (si es diferente)"
                  className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-sm text-[var(--text-primary)]"
                />
              </div>
            )}
          </div>
        )}

        {/* Special Instructions */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Instrucciones especiales (opcional)
          </label>
          <textarea
            value={form.specialInstructions}
            onChange={(e) => setForm((prev) => ({ ...prev, specialInstructions: e.target.value }))}
            rows={2}
            placeholder="Notas para el equipo de servicio..."
            className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-2 text-sm text-[var(--text-primary)]"
          />
        </div>

        {/* Price Summary */}
        <div className="mb-6 rounded-lg bg-[var(--bg-secondary,#f9fafb)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Precio mensual</span>
            <span className="text-lg font-bold text-[var(--text-primary)]">{formatPrice(calculatedPrice)}</span>
          </div>
          {plan.first_month_discount > 0 && (
            <p className="mt-1 text-xs text-[var(--status-success,#16a34a)]">
              Con {plan.first_month_discount}% de descuento el primer mes
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--border-light,#e5e7eb)] px-4 py-2 font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary,#f3f4f6)]"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={!form.selectedPetId || submitting}
            className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Procesando...' : 'Confirmar Suscripción'}
          </button>
        </div>
      </div>
    </div>
  )
}
