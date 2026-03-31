'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Wrench, Calculator, Apple, HelpCircle } from 'lucide-react'
import type { ClinicConfig } from '@/lib/clinics'

interface ToolsDropdownProps {
  clinic: string
  config: ClinicConfig
  isActive: (href: string) => boolean
  pathname: string
}

interface ToolItem {
  label: string
  href: string
  icon: typeof Calculator
}

export function ToolsDropdown({
  clinic,
  config,
  isActive,
  pathname,
}: Readonly<ToolsDropdownProps>) {
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const toolsMenuRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('nav')

  const toolsItems: ToolItem[] = [
    {
      label: config.ui_labels?.tools?.age_calculator?.title || t('ageCalculator'),
      href: `/${clinic}/tools/age-calculator`,
      icon: Calculator,
    },
    {
      label: config.ui_labels?.tools?.toxic_food?.title || t('toxicFood'),
      href: `/${clinic}/tools/toxic-food`,
      icon: Apple,
    },
    {
      label: config.ui_labels?.nav?.faq || t('faq'),
      href: `/${clinic}/faq`,
      icon: HelpCircle,
    },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setIsToolsOpen(false)
  }, [pathname])

  const isToolsActive =
    isToolsOpen ||
    pathname.includes('/tools') ||
    pathname.includes('/faq')

  return (
    <div ref={toolsMenuRef} className="relative">
      <button
        onClick={() => setIsToolsOpen(!isToolsOpen)}
        aria-expanded={isToolsOpen}
        aria-haspopup="true"
        aria-label={t('toolsMenu')}
        className={`group relative flex items-center gap-1 text-base font-bold uppercase tracking-wide transition-colors ${
          isToolsActive
            ? 'text-[var(--primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
        }`}
      >
        <Wrench className="h-4 w-4" aria-hidden="true" />
        {config.ui_labels?.nav?.tools || t('tools')}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isToolsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            role="menu"
            aria-label={t('toolsOptions')}
            className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-2 shadow-xl"
          >
            {toolsItems.map((tool) => {
              const ToolIcon = tool.icon
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setIsToolsOpen(false)}
                  role="menuitem"
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(tool.href)
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-[var(--primary)]'
                  }`}
                >
                  <ToolIcon className="h-4 w-4" aria-hidden="true" />
                  {tool.label}
                </Link>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
