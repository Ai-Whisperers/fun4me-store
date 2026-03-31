'use client'

import { useState, useEffect } from 'react'
import { CartDrawer, FloatingCartButton } from './cart-drawer'
import { useCart } from '@/context/cart-context'

interface CartLayoutWrapperProps {
  /** Whether user is logged in (from server) */
  isLoggedIn: boolean
}

/**
 * Cart Layout Wrapper
 *
 * Client component that manages cart drawer state and visibility.
 * Only shows cart UI for logged-in users.
 */
export function CartLayoutWrapper({ isLoggedIn }: CartLayoutWrapperProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { itemCount, isLoggedIn: clientIsLoggedIn } = useCart()
  const [mounted, setMounted] = useState(false)
  const [hasAuthCookie, setHasAuthCookie] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Double-check auth cookie on client side
    const hasCookie = document.cookie.includes('sb-') && document.cookie.includes('-auth-token')
    setHasAuthCookie(hasCookie)
  }, [])

  // Don't render anything if not logged in (server OR client check)
  // This provides a failsafe against stale server-side auth
  if (!mounted || !isLoggedIn || !hasAuthCookie) {
    return null
  }

  return (
    <>
      {/* Floating Cart Button */}
      <FloatingCartButton onClick={() => setIsDrawerOpen(true)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
