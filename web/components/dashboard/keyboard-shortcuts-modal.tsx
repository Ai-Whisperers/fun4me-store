'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Keyboard,
  Command,
  Search,
  Calendar,
  Users,
  Settings,
  Plus,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useModal } from '@/hooks/use-modal'
import { useState, useCallback, useMemo } from 'react'
import { ErrorBoundary } from '@/components/shared'

/**
 * Hook for managing keyboard shortcuts modal state
 */
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  const openShortcuts = useCallback(() => setIsOpen(true), [])
  const closeShortcuts = useCallback(() => setIsOpen(false), [])
  const toggleShortcuts = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, openShortcuts, closeShortcuts, toggleShortcuts }
}

interface ShortcutCategory {
  titleKey: string
  icon: React.ElementType
  shortcuts: {
    keys: string[]
    descriptionKey: string
  }[]
}

// Define shortcut categories with translation keys
const shortcutCategoryDefinitions: ShortcutCategory[] = [
  {
    titleKey: 'categories.generalNav',
    icon: Command,
    shortcuts: [
      { keys: ['Ctrl/⌘', 'K'], descriptionKey: 'shortcuts.openGlobalSearch' },
      { keys: ['Ctrl/⌘', '\\'], descriptionKey: 'shortcuts.toggleSidebar' },
      { keys: ['?'], descriptionKey: 'shortcuts.showShortcuts' },
      { keys: ['Esc'], descriptionKey: 'shortcuts.closeDialogs' },
      { keys: ['G', 'H'], descriptionKey: 'shortcuts.goToDashboard' },
      { keys: ['G', 'C'], descriptionKey: 'shortcuts.goToCalendar' },
      { keys: ['G', 'P'], descriptionKey: 'shortcuts.goToPatients' },
      { keys: ['G', 'I'], descriptionKey: 'shortcuts.goToInventory' },
      { keys: ['G', 'S'], descriptionKey: 'shortcuts.goToSettings' },
    ],
  },
  {
    titleKey: 'categories.searchFilters',
    icon: Search,
    shortcuts: [
      { keys: ['/'], descriptionKey: 'shortcuts.focusSearch' },
      { keys: ['Ctrl/⌘', 'F'], descriptionKey: 'shortcuts.searchInPage' },
      { keys: ['Alt', '1-9'], descriptionKey: 'shortcuts.quickFilter' },
    ],
  },
  {
    titleKey: 'categories.appointmentsCalendar',
    icon: Calendar,
    shortcuts: [
      { keys: ['N'], descriptionKey: 'shortcuts.newAppointment' },
      { keys: ['T'], descriptionKey: 'shortcuts.goToToday' },
      { keys: ['←'], descriptionKey: 'shortcuts.previousPeriod' },
      { keys: ['→'], descriptionKey: 'shortcuts.nextPeriod' },
      { keys: ['D'], descriptionKey: 'shortcuts.dayView' },
      { keys: ['W'], descriptionKey: 'shortcuts.weekView' },
      { keys: ['M'], descriptionKey: 'shortcuts.monthView' },
    ],
  },
  {
    titleKey: 'categories.clientsPatients',
    icon: Users,
    shortcuts: [
      { keys: ['Ctrl/⌘', 'N'], descriptionKey: 'shortcuts.newClient' },
      { keys: ['E'], descriptionKey: 'shortcuts.editSelected' },
      { keys: ['Enter'], descriptionKey: 'shortcuts.viewDetail' },
      { keys: ['↑', '↓'], descriptionKey: 'shortcuts.navigateList' },
    ],
  },
  {
    titleKey: 'categories.quickActions',
    icon: Plus,
    shortcuts: [
      { keys: ['Ctrl/⌘', 'Shift', 'C'], descriptionKey: 'shortcuts.quickNewAppointment' },
      { keys: ['Ctrl/⌘', 'Shift', 'R'], descriptionKey: 'shortcuts.newPrescription' },
      { keys: ['Ctrl/⌘', 'Shift', 'V'], descriptionKey: 'shortcuts.registerVaccine' },
      { keys: ['Ctrl/⌘', 'Shift', 'F'], descriptionKey: 'shortcuts.newInvoice' },
    ],
  },
  {
    titleKey: 'categories.other',
    icon: Settings,
    shortcuts: [
      { keys: ['Ctrl/⌘', 'S'], descriptionKey: 'shortcuts.saveChanges' },
      { keys: ['Ctrl/⌘', 'P'], descriptionKey: 'shortcuts.printExport' },
      { keys: ['Ctrl/⌘', 'Z'], descriptionKey: 'shortcuts.undo' },
      { keys: ['Ctrl/⌘', 'Shift', 'Z'], descriptionKey: 'shortcuts.redo' },
    ],
  },
]

export interface KeyboardShortcutsModalProps {
  trigger?: React.ReactNode
  /** Controlled mode: whether the modal is open */
  isOpen?: boolean
  /** Controlled mode: callback when modal should close */
  onClose?: () => void
}

export function KeyboardShortcutsModal({
  trigger,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: KeyboardShortcutsModalProps = {}): React.ReactElement {
  const internalModal = useModal()
  const t = useTranslations('dashboard.keyboardShortcuts')

  // Support both controlled and uncontrolled mode
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalModal.isOpen
  const close = controlledOnClose || internalModal.close
  const open = controlledOnClose ? undefined : internalModal.open

  // Build translated shortcut categories
  const shortcutCategories = useMemo(() => {
    return shortcutCategoryDefinitions.map((category) => ({
      title: t(category.titleKey),
      icon: category.icon,
      shortcuts: category.shortcuts.map((shortcut) => ({
        keys: shortcut.keys,
        description: t(shortcut.descriptionKey),
      })),
    }))
  }, [t])

  return (
    <ErrorBoundary>
      {trigger && open && (
        <div
          role="button"
          tabIndex={0}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              open()
            }
          }}
          className="cursor-pointer"
          aria-label={t('openShortcuts')}
        >
          {trigger}
        </div>
      )}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-50 bg-black/50"
              aria-hidden="true"
            />

            {/* Modal */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="keyboard-shortcuts-title"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl bg-[var(--bg-default)] shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[80vh] md:w-[800px] md:-translate-x-1/2 md:-translate-y-1/2"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,var(--primary))] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/20 p-2">
                    <Keyboard className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="keyboard-shortcuts-title" className="text-lg font-bold text-white">{t('title')}</h2>
                    <p className="text-sm text-white/70">{t('subtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30"
                  aria-label={t('close')}
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {shortcutCategories.map((category) => {
                    const Icon = category.icon
                    return (
                      <div key={category.title} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[var(--primary)]" />
                          <h3 className="text-sm font-semibold text-gray-700">{category.title}</h3>
                        </div>
                        <div className="space-y-2">
                          {category.shortcuts.map((shortcut, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                            >
                              <span className="text-sm text-gray-600">{shortcut.description}</span>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, keyIdx) => (
                                  <span key={keyIdx}>
                                    <kbd className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm">
                                      {key}
                                    </kbd>
                                    {keyIdx < shortcut.keys.length - 1 && (
                                      <span className="mx-1 text-gray-400">+</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <p className="text-center text-xs text-gray-500">
                  {t('pressToShow')}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  )
}
