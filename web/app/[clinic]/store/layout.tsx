'use client'

import { WishlistProvider } from '@/context/wishlist-context'

/**
 * Store Layout - Adds wishlist context for store pages
 * This keeps the wishlist API calls scoped to store pages only,
 * avoiding unnecessary network requests on non-store pages.
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <WishlistProvider>{children}</WishlistProvider>
}
