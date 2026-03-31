'use client'

import { useState, createContext, useContext, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'

// Tab context for compound component pattern
interface TabsContextValue {
  activeTab: string
  setActiveTab: (id: string) => void
  variant: 'underline' | 'pills' | 'cards' | 'minimal'
  size: 'sm' | 'md' | 'lg'
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tab components must be used within a Tabs provider')
  }
  return context
}

// Main Tabs Container
interface TabsProps {
  /** Default active tab ID */
  defaultTab?: string
  /** Alias for defaultTab (shadcn compatibility) */
  defaultValue?: string
  variant?: 'underline' | 'pills' | 'cards' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  onChange?: (tabId: string) => void
  className?: string
  children: ReactNode
}

export function Tabs({
  defaultTab,
  defaultValue,
  variant = 'underline',
  size = 'md',
  onChange,
  className,
  children,
}: TabsProps): React.ReactElement {
  const initialTab = defaultTab ?? defaultValue ?? ''
  const [activeTab, setActiveTab] = useState(initialTab)

  const handleTabChange = (id: string): void => {
    setActiveTab(id)
    onChange?.(id)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange, variant, size }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

// Tab List (container for tab triggers)
interface TabListProps {
  className?: string
  children: ReactNode
  scrollable?: boolean
}

export function TabList({
  className,
  children,
  scrollable = false,
}: TabListProps): React.ReactElement {
  const { variant } = useTabsContext()
  const scrollRef = useRef<HTMLDivElement>(null)

  const variantStyles = {
    underline: 'border-b border-[var(--border)]',
    pills: 'bg-[var(--bg-subtle)] p-1 rounded-xl',
    cards: 'gap-2',
    minimal: '',
  }

  return (
    <div
      ref={scrollRef}
      role="tablist"
      className={cn(
        'flex',
        variantStyles[variant],
        scrollable && 'scrollbar-hide snap-x snap-mandatory overflow-x-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

// Individual Tab Trigger
interface TabTriggerProps {
  /** Tab ID */
  id?: string
  /** Alias for id (shadcn compatibility) */
  value?: string
  icon?: keyof typeof Icons
  count?: number
  disabled?: boolean
  className?: string
  children: ReactNode
}

export function TabTrigger({
  id,
  value,
  icon,
  count,
  disabled = false,
  className,
  children,
}: TabTriggerProps): React.ReactElement {
  const { activeTab, setActiveTab, variant, size } = useTabsContext()
  const tabId = id ?? value ?? ''
  const isActive = activeTab === tabId

  const IconComponent = icon ? (Icons[icon] as React.ComponentType<{ className?: string }>) : null

  const sizeStyles = {
    sm: { padding: 'px-3 py-1.5', text: 'text-xs', icon: 'w-3.5 h-3.5', gap: 'gap-1.5' },
    md: { padding: 'px-4 py-2.5', text: 'text-sm', icon: 'w-4 h-4', gap: 'gap-2' },
    lg: { padding: 'px-6 py-3', text: 'text-base', icon: 'w-5 h-5', gap: 'gap-2.5' },
  }

  const variantStyles = {
    underline: {
      base: 'border-b-2 -mb-px transition-colors',
      active: 'border-[var(--primary)] text-[var(--primary)]',
      inactive: 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border)]',
    },
    pills: {
      base: 'rounded-lg transition-all',
      active: 'bg-[var(--bg-default)] text-[var(--text-primary)] shadow-sm',
      inactive: 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
    },
    cards: {
      base: 'rounded-xl border transition-all',
      active: 'bg-[var(--bg-default)] border-[var(--primary)] text-[var(--primary)] shadow-md',
      inactive: 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-dark)] hover:bg-[var(--bg-default)]',
    },
    minimal: {
      base: 'transition-colors',
      active: 'text-[var(--primary)] font-bold',
      inactive: 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
    },
  }

  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${tabId}`}
      id={`tab-${tabId}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(tabId)}
      className={cn(
        'flex min-h-[44px] snap-start items-center whitespace-nowrap font-bold',
        sizes.padding,
        sizes.text,
        sizes.gap,
        styles.base,
        isActive ? styles.active : styles.inactive,
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {IconComponent && <IconComponent className={sizes.icon} />}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-xs font-bold',
            isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// Tab Panel (content container)
interface TabPanelProps {
  /** Panel ID */
  id?: string
  /** Alias for id (shadcn compatibility) */
  value?: string
  className?: string
  children: ReactNode
}

export function TabPanel({ id, value, className, children }: TabPanelProps): React.ReactElement | null {
  const { activeTab } = useTabsContext()
  const panelId = id ?? value ?? ''
  const isActive = activeTab === panelId

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      id={`panel-${panelId}`}
      aria-labelledby={`tab-${panelId}`}
      className={cn('animate-in fade-in-0 duration-200', className)}
    >
      {children}
    </div>
  )
}

// ============================================
// Pet Profile Specific Tab Components
// ============================================

interface PetProfileTab {
  id: string
  label: string
  icon: keyof typeof Icons
  count?: number
}

const DEFAULT_PET_TABS: PetProfileTab[] = [
  { id: 'timeline', label: 'Historial', icon: 'Activity' },
  { id: 'vaccines', label: 'Vacunas', icon: 'Syringe' },
  { id: 'prescriptions', label: 'Recetas', icon: 'Pill' },
  { id: 'lab', label: 'Laboratorio', icon: 'FlaskConical' },
  { id: 'attachments', label: 'Archivos', icon: 'Paperclip' },
]

interface PetProfileTabsProps {
  tabs?: PetProfileTab[]
  defaultTab?: string
  counts?: Record<string, number>
  variant?: 'underline' | 'pills' | 'cards'
  className?: string
  children: ReactNode
}

export function PetProfileTabs({
  tabs = DEFAULT_PET_TABS,
  defaultTab,
  counts = {},
  variant = 'pills',
  className,
  children,
}: PetProfileTabsProps): React.ReactElement {
  const activeTabs = tabs.filter((tab) => counts[tab.id] === undefined || counts[tab.id] > 0)
  const firstTab = defaultTab || activeTabs[0]?.id || 'timeline'

  return (
    <Tabs defaultTab={firstTab} variant={variant} className={className}>
      <TabList scrollable className="mb-6">
        {activeTabs.map((tab) => (
          <TabTrigger key={tab.id} id={tab.id} icon={tab.icon} count={counts[tab.id]}>
            {tab.label}
          </TabTrigger>
        ))}
      </TabList>
      {children}
    </Tabs>
  )
}

// Convenience export for tab panels
export { TabPanel as PetTabPanel }

// Shadcn-style aliases for compatibility
export { TabList as TabsList }
export { TabTrigger as TabsTrigger }
export { TabPanel as TabsContent }

// ============================================
// Dashboard Specific Tabs
// ============================================

interface DashboardTab {
  id: string
  label: string
  icon: keyof typeof Icons
  badge?: string | number
  badgeVariant?: 'default' | 'warning' | 'error' | 'success'
}

interface DashboardTabsProps {
  tabs: DashboardTab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
  children: ReactNode
}

export function DashboardTabs({
  tabs,
  defaultTab,
  onChange,
  className,
  children,
}: DashboardTabsProps): React.ReactElement {
  const firstTab = defaultTab || tabs[0]?.id

  return (
    <Tabs
      defaultTab={firstTab}
      variant="underline"
      size="lg"
      onChange={onChange}
      className={className}
    >
      <TabList className="mb-6 gap-4">
        {tabs.map((tab) => {
          const IconComponent = Icons[tab.icon] as React.ComponentType<{ className?: string }>
          return (
            <TabTrigger key={tab.id} id={tab.id} className="relative">
              <span className="flex items-center gap-2">
                {IconComponent && <IconComponent className="h-5 w-5" />}
                {tab.label}
              </span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'absolute -right-1 -top-1 min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold',
                    tab.badgeVariant === 'warning' && 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
                    tab.badgeVariant === 'error' && 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
                    tab.badgeVariant === 'success' && 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
                    (!tab.badgeVariant || tab.badgeVariant === 'default') &&
                      'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </TabTrigger>
          )
        })}
      </TabList>
      {children}
    </Tabs>
  )
}
