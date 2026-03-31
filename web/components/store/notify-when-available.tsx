'use client'

import { useState, useCallback } from 'react'
import { Bell, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface NotifyWhenAvailableProps {
  /** Product ID */
  productId: string
  /** Clinic tenant ID */
  clinic: string
  /** Product name for display */
  productName?: string
  /** Compact mode for product cards */
  compact?: boolean
  /** Display variant - 'inline' maps to compact mode */
  variant?: 'default' | 'inline'
}

type NotifyStatus = 'idle' | 'submitting' | 'success' | 'error'

export function NotifyWhenAvailable({
  productId,
  clinic,
  productName,
  compact: compactProp = false,
  variant = 'default',
}: NotifyWhenAvailableProps) {
  // variant='inline' maps to compact mode
  const compact = compactProp || variant === 'inline'
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<NotifyStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!email || !email.includes('@')) {
        setError('Ingresa un email válido')
        return
      }

      setStatus('submitting')
      setError(null)

      try {
        const supabase = createClient()

        // Get current user if logged in
        const {
          data: { user },
        } = await supabase.auth.getUser()

        // Check if alert already exists
        const { data: existing } = await supabase
          .from('store_stock_alerts')
          .select('id')
          .eq('product_id', productId)
          .eq('email', email)
          .maybeSingle()

        if (existing) {
          setStatus('success')
          return
        }

        // Create stock alert
        const { error: insertError } = await supabase.from('store_stock_alerts').insert({
          tenant_id: clinic,
          product_id: productId,
          user_id: user?.id ?? null,
          email,
          notified: false,
        })

        if (insertError) {
          logger.error('Failed to create stock alert', {
            clinic,
            productId,
            error: insertError.message,
          })
          setError('Error al registrar. Intenta de nuevo.')
          setStatus('error')
          return
        }

        logger.info('Stock alert created', {
          clinic,
          productId,
          hasUser: !!user,
        })

        setStatus('success')
      } catch (err) {
        logger.error('Stock alert exception', {
          clinic,
          productId,
          error: err instanceof Error ? err.message : 'Unknown',
        })
        setError('Error inesperado. Intenta de nuevo.')
        setStatus('error')
      }
    },
    [email, productId, clinic]
  )

  // Success state
  if (status === 'success') {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-[var(--status-success)]`}>
        <Check className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        <span>¡Te avisaremos cuando llegue!</span>
      </div>
    )
  }

  // Compact mode - just a button that expands
  if (compact && !showForm) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowForm(true)}
        className="w-full text-xs"
      >
        <Bell className="mr-1 h-3 w-3" />
        Avisar cuando llegue
      </Button>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center gap-2 text-[var(--status-warning)]">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-medium">
            {productName ? `"${productName}" no está disponible` : 'Producto no disponible'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={`focus:ring-[var(--primary)]/20 flex-1 rounded-lg border border-gray-200 px-3 text-[var(--text-primary)] outline-none transition-all focus:border-[var(--primary)] focus:ring-2 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} `}
            disabled={status === 'submitting'}
          />
          <Button
            type="submit"
            size={compact ? 'sm' : 'md'}
            disabled={status === 'submitting'}
            className={compact ? 'px-2 text-xs' : ''}
          >
            {status === 'submitting' ? (
              <Loader2 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`} />
            ) : (
              'Avisar'
            )}
          </Button>
        </div>

        {error && (
          <div
            className={`flex items-center gap-1 text-[var(--status-error)] ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <AlertCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            <span>{error}</span>
          </div>
        )}

        {!compact && (
          <p className="text-xs text-gray-500">
            Te enviaremos un email cuando el producto vuelva a estar disponible
          </p>
        )}
      </form>

      {compact && showForm && (
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      )}
    </div>
  )
}
