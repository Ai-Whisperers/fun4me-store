'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { DashboardSidebar } from './dashboard-sidebar'
import { BottomNavigation } from './bottom-navigation'
import { QuickActionsHandler } from './quick-actions-handler'
import { CommandPalette, useCommandPalette } from '@/components/ui/command-palette'
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { RecentItemsProvider } from './recent-items-provider'
import {
  KeyboardShortcutsModal,
  useKeyboardShortcuts as useShortcutsModal,
} from './keyboard-shortcuts-modal'
import { DashboardLabelsProvider } from '@/lib/hooks/use-dashboard-labels'
import { TrialBanner } from './trial-banner'

// Pages that need full-bleed layout (no container padding)
const FULL_BLEED_PAGES = ['/calendar', '/hospital', '/lab']

interface DashboardShellProps {
  clinic: string
  clinicName: string
  isAdmin?: boolean
  children: React.ReactNode
}

export function DashboardShell({
  clinic,
  clinicName,
  isAdmin = false,
  children,
}: DashboardShellProps): React.ReactElement {
  const pathname = usePathname()
  const { isOpen, open, close } = useCommandPalette()
  const { isOpen: isShortcutsOpen, closeShortcuts, openShortcuts } = useShortcutsModal()

  // Check if current page needs full-bleed layout (no padding)
  const isFullBleed = FULL_BLEED_PAGES.some((page) => pathname.includes(page))

  // Enable global keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [commonShortcuts.openCommandPalette(open), { key: '?', action: openShortcuts }],
    enabled: true,
  })

  return (
    <DashboardLabelsProvider>
      <RecentItemsProvider clinic={clinic}>
        {/* Command Palette */}
        <CommandPalette isOpen={isOpen} onClose={close} />

        {/* Keyboard Shortcuts Modal (triggered by ?) */}
        <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />

        {/* Quick Actions Handler (slide-overs triggered by URL params) */}
        <Suspense fallback={null}>
          <QuickActionsHandler clinic={clinic} />
        </Suspense>

        <div className="flex min-h-screen bg-[var(--bg-subtle)]">
          {/* Desktop Sidebar */}
          <DashboardSidebar
            clinic={clinic}
            clinicName={clinicName}
            isAdmin={isAdmin}
            onOpenCommandPalette={open}
          />

          {/* Main Content - Full bleed pages get no padding */}
          <main className="flex-1 overflow-auto pb-20 lg:pb-0">
            {isFullBleed ? (
              <>
                <div className="px-4 pt-4 md:px-6 md:pt-6">
                  <TrialBanner clinic={clinic} />
                </div>
                {children}
              </>
            ) : (
              <div className="page-container-xl py-4 md:py-6">
                <TrialBanner clinic={clinic} />
                {children}
              </div>
            )}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation clinic={clinic} />
      </RecentItemsProvider>
    </DashboardLabelsProvider>
  )
}
