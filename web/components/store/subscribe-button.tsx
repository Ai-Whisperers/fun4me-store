'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toast'

interface SubscribeButtonProps {
  productId: string
  variantId?: string | null
  variantName?: string | null
  productName: string
  price: number
  disabled?: boolean
}

const frequencyOptions = [
  { value: 7, label: 'Cada semana', discount: '10%' },
  { value: 14, label: 'Cada 2 semanas', discount: '8%' },
  { value: 30, label: 'Cada mes', discount: '5%' },
  { value: 60, label: 'Cada 2 meses', discount: '3%' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SubscribeButton({
  productId,
  variantId,
  productName,
  price,
  disabled,
}: SubscribeButtonProps): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [frequency, setFrequency] = useState(30)
  const [quantity, setQuantity] = useState(1)

  const selectedOption = frequencyOptions.find((o) => o.value === frequency)

  const handleSubscribe = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/store/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic,
          product_id: productId,
          variant_id: variantId || null,
          quantity,
          frequency_days: frequency,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details?.message || 'Error al crear suscripción')
      }

      setSuccess(true)
      toast({
        title: '¡Suscripción creada!',
        description: data.message,
        variant: 'success',
      })

      // Close modal after success animation
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al crear suscripción',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        leftIcon={<RefreshCw className="h-4 w-4" />}
      >
        Suscribirse y Ahorrar
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Suscribirse al Producto"
        size="md"
      >
        <div className="space-y-6">
          {/* Product info */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="font-medium text-[var(--text-primary)]">{productName}</p>
            <p className="text-sm text-gray-500">{formatCurrency(price)} por unidad</p>
          </div>

          {/* Frequency selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Frecuencia de entrega
            </label>
            <div className="grid grid-cols-2 gap-2">
              {frequencyOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFrequency(option.value)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    frequency === option.value
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-[var(--text-primary)]">{option.label}</p>
                  <p className="text-sm text-[var(--status-success)]">Ahorra {option.discount}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Cantidad por entrega
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-lg font-bold hover:bg-gray-50"
              >
                −
              </button>
              <span className="min-w-[3rem] text-center text-lg font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-lg font-bold hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-[var(--primary)] bg-[var(--primary)]/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total por entrega</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(price * quantity)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Próxima entrega</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {new Date(Date.now() + frequency * 24 * 60 * 60 * 1000).toLocaleDateString(
                    'es-PY',
                    { day: 'numeric', month: 'short' }
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2 text-sm text-gray-600">
            <p>✓ Cancela cuando quieras</p>
            <p>✓ Omite entregas fácilmente</p>
            <p>✓ Modifica la cantidad en cualquier momento</p>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubscribe} isLoading={isSubmitting} disabled={success}>
            {success ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                ¡Suscrito!
              </>
            ) : (
              `Suscribirme ${selectedOption ? `(${selectedOption.discount} desc.)` : ''}`
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
