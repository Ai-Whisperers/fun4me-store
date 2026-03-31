'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCart, CartItem } from '@/context/cart-context'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Check, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface AddToCartButtonProps {
  readonly item: Omit<CartItem, 'quantity'>
  readonly quantity?: number
  readonly className?: string
  readonly iconOnly?: boolean
  readonly label?: string
  readonly addedLabel?: string
  readonly stockLimitLabel?: string
}

export function AddToCartButton({
  item,
  quantity = 1,
  className,
  iconOnly = false,
  label,
  addedLabel,
  stockLimitLabel,
}: AddToCartButtonProps) {
  const t = useTranslations('cart')
  const resolvedLabel = label ?? t('add')
  const resolvedAddedLabel = addedLabel ?? t('added')
  const resolvedStockLimitLabel = stockLimitLabel ?? t('outOfStock')
  const { addItem } = useCart()
  const { showToast } = useToast()
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const clinic = params?.clinic as string

  const [success, setSuccess] = useState(false)
  const [stockWarning, setStockWarning] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const returnTo = encodeURIComponent(pathname || `/${clinic}/store`)
      router.push(`/${clinic}/portal/login?returnTo=${returnTo}`)
      return
    }

    // UX-005: Removed fake 500ms delay - addItem is synchronous
    const result = addItem(item, quantity)

    if (result.limitedByStock) {
      if (!result.success) {
        // Could not add any - show error
        setStockWarning(true)
        showToast(
          result.message ||
            t('stockInsufficient', { count: result.availableStock ?? 0 })
        )
        setTimeout(() => setStockWarning(false), 2000)
      } else {
        // Added partial quantity - show warning but also success
        setSuccess(true)
        showToast(result.message || t('stockLimited', { count: result.availableStock ?? 0 }))
        setTimeout(() => setSuccess(false), 2000)
      }
    } else {
      // Normal success
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={success || stockWarning}
      className={clsx(
        'flex items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70',
        stockWarning && '!border-amber-500 !bg-amber-500',
        className
      )}
    >
      {stockWarning ? (
        iconOnly ? (
          <AlertTriangle className="h-5 w-5" />
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" /> <span>{resolvedStockLimitLabel}</span>
          </>
        )
      ) : success ? (
        iconOnly ? (
          <Check className="h-5 w-5" />
        ) : (
          <>
            <Check className="h-4 w-4" /> <span>{resolvedAddedLabel}</span>
          </>
        )
      ) : iconOnly ? (
        <ShoppingBag className="h-5 w-5" />
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" /> <span>{resolvedLabel}</span>
        </>
      )}
    </button>
  )
}
