'use client'

import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { Species, SPECIES_CONFIG } from '@/lib/age-calculator/configs'

interface SpeciesSelectorProps {
  selected: Species
  onChange: (species: Species) => void
}

export function SpeciesSelector({ selected, onChange }: SpeciesSelectorProps) {
  const speciesConfig = SPECIES_CONFIG[selected]

  // Get icon component
  const getIcon = (name: string): React.ComponentType<{ className?: string }> => {
    const icon = (Icons as Record<string, unknown>)[name]
    return (typeof icon === 'function' ? icon : Icons.PawPrint) as React.ComponentType<{
      className?: string
    }>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          1. Tipo de mascota
        </label>
        <span className="text-xs text-gray-400">
          {speciesConfig.avgLifespan.min}-{speciesConfig.avgLifespan.max} años promedio
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {(Object.keys(SPECIES_CONFIG) as Species[]).map((s) => {
          const cfg = SPECIES_CONFIG[s]
          const IconComp = getIcon(cfg.icon)
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all sm:p-3 ${
                selected === s
                  ? 'bg-[var(--primary)]/5 border-[var(--primary)] text-[var(--primary)]'
                  : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
              }`}
              title={cfg.label}
            >
              <span className="text-lg sm:text-xl">{cfg.emoji}</span>
              <span className="w-full truncate text-center text-[10px] font-bold sm:text-xs">
                {cfg.label}
              </span>
              {selected === s && (
                <motion.div layoutId="species-check" className="absolute -right-1 -top-1">
                  <Icons.CheckCircle2 className="h-4 w-4 rounded-full bg-white text-[var(--primary)]" />
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
