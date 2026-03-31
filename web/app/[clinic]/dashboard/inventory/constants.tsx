'use client'

/**
 * Inventory Client Constants
 *
 * REF-006: Constants extracted from client component
 */

import { Layers, Store, Globe } from 'lucide-react'
import type { ProductSource } from './types'

export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export interface SourceTabOption {
  value: ProductSource
  label: string
  icon: React.ReactNode
  description: string
}

export const sourceTabOptions: SourceTabOption[] = [
  {
    value: 'all',
    label: 'Todos',
    icon: <Layers className="h-4 w-4" />,
    description: 'Todos los productos',
  },
  {
    value: 'own',
    label: 'Mis Productos',
    icon: <Store className="h-4 w-4" />,
    description: 'Productos propios de la clínica',
  },
  {
    value: 'catalog',
    label: 'Del Catálogo',
    icon: <Globe className="h-4 w-4" />,
    description: 'Productos del catálogo global',
  },
]
