/**
 * Scanner Mode Configuration
 *
 * Defines the available scanner modes and their UI properties.
 */

import { Package, PackagePlus, ClipboardList } from 'lucide-react'
import type { ScannerMode, ModeConfig } from './types'

export const MODE_CONFIG: Record<ScannerMode, ModeConfig> = {
  lookup: {
    label: 'Consultar',
    icon: Package,
    color: 'text-[var(--status-info)]',
    bgColor: 'bg-[var(--status-info-bg)]',
    description: 'Ver información del producto',
    actionLabel: 'Ver Detalles',
  },
  receive: {
    label: 'Recibir Stock',
    icon: PackagePlus,
    color: 'text-[var(--status-success)]',
    bgColor: 'bg-[var(--status-success-bg)]',
    description: 'Agregar unidades al inventario',
    actionLabel: 'Agregar Stock',
  },
  count: {
    label: 'Conteo Físico',
    icon: ClipboardList,
    color: 'text-[var(--primary)]',
    bgColor: 'bg-[var(--primary)]/10',
    description: 'Registrar conteo de inventario',
    actionLabel: 'Registrar Conteo',
  },
}
