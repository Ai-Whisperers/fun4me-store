'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, CheckCircle, CreditCard, Smartphone } from 'lucide-react'
import { getPaymentService } from '@/lib/payments/service'
import type { Currency } from '@/lib/payments/types'
import { StripePaymentWrapper } from './StripePaymentWrapper'

// =============================================================================
// Provider-Agnostic Payment Wrapper
// =============================================================================

interface PaymentFormProps {
  onSuccess: () => void
  onCancel: () => void
  amount: number
  currency: string
  tenantId: string
}

function ProviderAgnosticPaymentForm({ onSuccess, onCancel, amount, currency, tenantId }: PaymentFormProps) {
  const [provider, setProvider] = useState<string>('')
  const [clientSecret, setClientSecret] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const paymentService = getPaymentService()
        
        // Create payment intent with the current tenant's preferred provider
        const result = await paymentService.createPaymentIntent({
          amount,
          currency: currency as Currency,
          tenantId,
          invoiceId: 'temp_id', // Add temporary invoice ID to satisfy interface
          description: 'Payment from checkout'
        })

        if (result.success && result.data) {
          setProvider(result.data.provider)
          setClientSecret(result.data.clientSecret || '')
        } else {
          setError(result.error?.message || 'Error al inicializar el pago')
        }
      } catch (err) {
        setError('Error al conectar con el procesador de pagos')
      } finally {
        setIsLoading(false)
      }
    }

    initializePayment()
  }, [amount, currency, tenantId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3">Cargando pasarela de pago...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-800">Error de Pago</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  // Render provider-specific payment form
  switch (provider) {
    case 'stripe':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Pago con Tarjeta</span>
          </div>
          {clientSecret && (
            <StripePaymentWrapper
              clientSecret={clientSecret}
              publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
              amount={amount}
              currency={currency}
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          )}
        </div>
      )
    
    case 'tigo_money':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Tigo Money QR</span>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-center text-sm text-gray-600">
              Escanea el código QR con tu aplicación de Tigo Money para completar el pago.
            </p>
            <div className="mt-4 flex justify-center">
              <div className="h-32 w-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">QR Code</span>
              </div>
            </div>
          </div>
        </div>
      )
    
    case 'bancard':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Bancard</span>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-center text-sm text-gray-600">
              Serás redirigido a la pasarela segura de Bancard para completar el pago.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => window.open('#', '_blank')}
                className="rounded-lg bg-purple-600 px-6 py-3 text-white font-medium hover:bg-purple-700"
              >
                Ir a Bancard
              </button>
            </div>
          </div>
        </div>
      )
    
    default:
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-center text-sm text-gray-600">
            Método de pago no configurado. Contacte al administrador.
          </p>
        </div>
      )
  }
}

// =============================================================================
// Exported Wrapper Component (Backward Compatible)
// =============================================================================

interface PaymentWrapperProps {
  tenantId: string
  amount: number
  currency: string
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentWrapper({ tenantId, amount, currency, onSuccess, onCancel }: PaymentWrapperProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Completar Pago</h2>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Pago Seguro
        </div>
      </div>

      <ProviderAgnosticPaymentForm
        tenantId={tenantId}
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />

      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Encriptación SSL
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Múltiples Pasarelas
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Legacy Export (Backward Compatibility)
// =============================================================================

export { StripePaymentWrapper }