/**
 * Icon Loading Utilities
 *
 * This module provides optimized icon loading strategies to reduce bundle size.
 *
 * PERFORMANCE OPTIMIZATION:
 * - Instead of importing all icons from 'lucide-react', we use tree-shakeable imports
 * - Icons are organized into named sets for common use cases
 * - Dynamic loading utilities are provided for runtime icon selection
 *
 * USAGE PATTERNS:
 *
 * 1. Named Icon Sets (Recommended for static groups):
 *    import { BOOKING_ICONS, DASHBOARD_ICONS } from '@/lib/icons'
 *    const Icon = BOOKING_ICONS.calendar
 *
 * 2. Direct Tree-shakeable Import (Best for known icons):
 *    import { Calendar, Check } from '@/lib/icons'
 *    <Calendar className="w-5 h-5" />
 *
 * 3. Dynamic Icon Component (For JSON-driven UIs):
 *    import { DynamicIcon } from '@/lib/icons'
 *    <DynamicIcon name="Calendar" />
 *
 * NOTE: Async/lazy loading is not supported due to webpack limitations.
 */

import type { JSX } from 'react'

// Tree-shakeable icon imports - only bundle what's actually used
// NOTE: These use default exports from lucide-react ESM modules

// Import for local use in icon sets
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Clock from 'lucide-react/dist/esm/icons/clock'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Check from 'lucide-react/dist/esm/icons/check'
import Info from 'lucide-react/dist/esm/icons/info'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Loader2 from 'lucide-react/dist/esm/icons/loader-2'
import Download from 'lucide-react/dist/esm/icons/download'
import Layers from 'lucide-react/dist/esm/icons/layers'
import Dog from 'lucide-react/dist/esm/icons/dog'
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag'
import Zap from 'lucide-react/dist/esm/icons/zap'
import Syringe from 'lucide-react/dist/esm/icons/syringe'
import Stethoscope from 'lucide-react/dist/esm/icons/stethoscope'
import Scissors from 'lucide-react/dist/esm/icons/scissors'
import UserCircle from 'lucide-react/dist/esm/icons/user-circle'
import Activity from 'lucide-react/dist/esm/icons/activity'
import Heart from 'lucide-react/dist/esm/icons/heart'
import Microscope from 'lucide-react/dist/esm/icons/microscope'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles'
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Building2 from 'lucide-react/dist/esm/icons/building-2'
import Leaf from 'lucide-react/dist/esm/icons/leaf'
import PawPrint from 'lucide-react/dist/esm/icons/paw-print'
import Users from 'lucide-react/dist/esm/icons/users'
import Receipt from 'lucide-react/dist/esm/icons/receipt'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link'
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right'
import Minus from 'lucide-react/dist/esm/icons/minus'
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign'
import Bell from 'lucide-react/dist/esm/icons/bell'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import CalendarCheck from 'lucide-react/dist/esm/icons/calendar-check'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list'

// Re-export all icons for external use
export {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Check,
  Info,
  AlertCircle,
  Loader2,
  Download,
  Layers,
  Dog,
  ShoppingBag,
  Zap,
  Syringe,
  Stethoscope,
  Scissors,
  UserCircle,
  Activity,
  Heart,
  Microscope,
  Sparkles,
  FileText,
  Building2,
  Leaf,
  PawPrint,
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ArrowUpRight,
  Minus,
  DollarSign,
  Bell,
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
}

// Standard SVG props that Lucide icons accept
interface LucideIconProps {
  className?: string
  size?: number | string
  strokeWidth?: number | string
  color?: string
  absoluteStrokeWidth?: boolean
  'aria-hidden'?: boolean
  'aria-label'?: string
  role?: string
}

// Type definition for Lucide icon component
export type LucideIcon = React.ComponentType<LucideIconProps>

/**
 * NOTE: Dynamic icon loading via async imports is not currently supported
 * due to Next.js webpack configuration limitations with source maps.
 *
 * Instead, add new icons to the appropriate icon set or use direct imports.
 * See the icon sets below (BOOKING_ICONS, SERVICE_ICONS, etc.)
 */

/**
 * Pre-defined icon sets for common UI patterns
 * These sets provide type-safe access to commonly grouped icons
 */

// Booking/Appointment Icons
export const BOOKING_ICONS = {
  calendar: Calendar,
  clock: Clock,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  chevronRight: ChevronRight,
  check: Check,
  info: Info,
  alertCircle: AlertCircle,
  loader: Loader2,
  download: Download,
  layers: Layers,
  dog: Dog,
  shoppingBag: ShoppingBag,
  zap: Zap,
} as const

// Service Category Icons
export const SERVICE_ICONS = {
  syringe: Syringe,
  stethoscope: Stethoscope,
  scissors: Scissors,
  userCircle: UserCircle,
  activity: Activity,
  heart: Heart,
  microscope: Microscope,
  sparkles: Sparkles,
  fileText: FileText,
  building2: Building2,
  leaf: Leaf,
  pawPrint: PawPrint,
} as const

// Dashboard/Stats Icons
export const DASHBOARD_ICONS = {
  users: Users,
  calendar: Calendar,
  syringe: Syringe,
  receipt: Receipt,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  externalLink: ExternalLink,
  arrowUpRight: ArrowUpRight,
  minus: Minus,
  dollarSign: DollarSign,
  bell: Bell,
  alertTriangle: AlertTriangle,
  calendarCheck: CalendarCheck,
  clipboardList: ClipboardList,
  pawPrint: PawPrint,
  clock: Clock,
} as const

/**
 * Icon map for service categories (used in JSON config)
 * Maps string identifiers to icon components
 */
export const SERVICE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  Syringe,
  Stethoscope,
  Scissors,
  UserCircle,
  Activity,
  Heart,
  Microscope,
  Sparkles,
  FileText,
  Building2,
  Leaf,
  PawPrint,
}

/**
 * Dynamic Icon Component
 * Renders an icon by name with optional lazy loading
 *
 * @example
 * // Static rendering (icon must be in SERVICE_CATEGORY_ICONS)
 * <DynamicIcon name="Calendar" className="w-5 h-5" />
 *
 * // With fallback
 * <DynamicIcon name="UnknownIcon" fallback="PawPrint" />
 */
interface DynamicIconProps {
  name?: string
  fallback?: string
  className?: string
  size?: number
}

export function DynamicIcon({
  name,
  fallback = 'PawPrint',
  className,
  size,
}: DynamicIconProps): JSX.Element {
  // Normalize icon name to PascalCase
  const normalizedName = name
    ? name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    : fallback

  // Try to get icon from registry
  const Icon = SERVICE_CATEGORY_ICONS[normalizedName] || SERVICE_CATEGORY_ICONS[fallback]

  return <Icon className={className} size={size} />
}

/**
 * Migration helper: Get icon component from string name
 * Used to gradually migrate components from `import * as Icons` pattern
 *
 * @deprecated Use named imports or icon sets instead
 */
export function getIconByName(name: string): LucideIcon {
  return SERVICE_CATEGORY_ICONS[name] || SERVICE_CATEGORY_ICONS.PawPrint
}
