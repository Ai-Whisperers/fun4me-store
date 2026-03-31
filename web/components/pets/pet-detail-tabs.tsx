'use client'

import { useState } from 'react'
import { LayoutDashboard, FileText, Syringe, FolderOpen, Calendar, CreditCard } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type TabId = 'summary' | 'history' | 'vaccines' | 'documents' | 'appointments' | 'finances'

interface Tab {
  id: TabId
  icon: React.ReactNode
}

const tabConfig: Tab[] = [
  { id: 'summary', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'history', icon: <FileText className="h-4 w-4" /> },
  { id: 'vaccines', icon: <Syringe className="h-4 w-4" /> },
  { id: 'documents', icon: <FolderOpen className="h-4 w-4" /> },
  { id: 'appointments', icon: <Calendar className="h-4 w-4" /> },
  { id: 'finances', icon: <CreditCard className="h-4 w-4" /> },
]

interface PetDetailTabsProps {
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}

export function PetDetailTabs({ activeTab, onTabChange }: PetDetailTabsProps) {
  const t = useTranslations('pets.detailTabs')

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
      {/* Desktop tabs */}
      <div className="hidden gap-1 md:flex">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {t(tab.id)}
          </button>
        ))}
      </div>

      {/* Mobile tabs - scrollable */}
      <div className="scrollbar-hide flex gap-1 overflow-x-auto pb-1 md:hidden">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {t(tab.id)}
          </button>
        ))}
      </div>
    </div>
  )
}

// Hook for managing tab state
export function usePetDetailTabs(initialTab: TabId = 'summary') {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  return { activeTab, setActiveTab }
}
