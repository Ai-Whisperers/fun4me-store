'use client'

/**
 * Portal Inventory Page Client
 *
 * Inventory management for clinic staff - update stock, prices, and product details.
 * Decomposed into smaller components in @/components/portal/inventory
 */

import { useParams } from 'next/navigation'
import { PortalInventoryClient } from '@/components/portal/inventory'

interface InventoryClientProps {
  googleSheetUrl: string | null
}

export default function InventoryClient({ googleSheetUrl }: InventoryClientProps) {
  const { clinic } = useParams() as { clinic: string }

  return <PortalInventoryClient clinic={clinic} googleSheetUrl={googleSheetUrl} />
}
