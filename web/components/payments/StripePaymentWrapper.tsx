'use client'

import { useState } from 'react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

// =============================================================================
// Stripe Initialization
// =============================================================================

let stripePromise: Promise<Stripe | null>

const getStripe = (publishableKey: string) => {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

// =============================================================================
// Payment Form Component
// =============================================================================

interface PaymentFormProps {
  onSuccess: () => void
  onCancel: () => void
  amount: number
  currency: string
}

function PaymentForm({ onSuccess, onCancel, amount, currency }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL is required by Stripe, but since we are using 
        // redirect: 'if_required', it might not be used for cards.
        return_url: `${window.location.origin}/payment-confirmation`,
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrorMessage(error.message || 'Ocurrió un error al procesar el pago.')
      setIsProcessing(false)
    } else {
      // Payment successful!
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Procesando...
            </>
          ) : (
            <>
              Pagar {new Intl.NumberFormat('es-PY', { style: 'currency', currency }).format(amount)}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancelar y pagar después
        </button>
      </div>
    </form>
  )
}

// =============================================================================
// Wrapper Component
// =============================================================================

interface StripePaymentWrapperProps {
  clientSecret: string
  publishableKey: string
  amount: number
  currency: string
  onSuccess: () => void
  onCancel: () => void
}

export function StripePaymentWrapper({
  clientSecret,
  publishableKey,
  amount,
  currency,
  onSuccess,
  onCancel,
}: StripePaymentWrapperProps) {
  const stripe = getStripe(publishableKey)

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0070f3', // Default Vete primary, can be customized
      },
    },
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Completar Pago</h2>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Pago Seguro con Stripe
        </div>
      </div>

      <Elements stripe={stripe} options={options}>
        <PaymentForm 
          onSuccess={onSuccess} 
          onCancel={onCancel} 
          amount={amount} 
          currency={currency} 
        />
      </Elements>

      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          Encriptación SSL
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          PCI Compliant
        </div>
      </div>
    </div>
  )
}
