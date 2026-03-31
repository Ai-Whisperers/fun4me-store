'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'

type Species = 'dog' | 'cat'

interface VaccineScheduleItem {
  n: number
  age: string
  vaccines?: string[]
  note?: string
}

interface VaccineScheduleConfig {
  title?: string
  subtitle?: string
  dog_label?: string
  cat_label?: string
  important_label?: string
  important_text?: string
  data?: {
    dog: VaccineScheduleItem[]
    cat: VaccineScheduleItem[]
  }
}

interface VaccineScheduleProps {
  config?: VaccineScheduleConfig
}

export function VaccineSchedule({ config }: VaccineScheduleProps) {
  const [species, setSpecies] = useState<Species>('dog')

  // Fallback if config isn't provided (for safety/backward compatibility)
  const safeConfig = config || {
    title: 'Calendario de Vacunación (Paraguay)',
    subtitle: 'Cronograma oficial recomendado por SENACSA.',
    dog_label: 'Perros',
    cat_label: 'Gatos',
    important_label: 'Importante:',
    important_text: 'Este es un esquema estándar.',
    data: { dog: [], cat: [] },
  }

  const schedules = safeConfig.data || { dog: [], cat: [] }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg">
      <div className="border-b border-gray-100 bg-[var(--bg-subtle)] p-6">
        <h3 className="font-heading mb-2 flex items-center gap-2 text-2xl font-black text-[var(--text-primary)]">
          <Icons.CalendarCheck className="h-6 w-6 text-[var(--primary)]" />
          {safeConfig.title}
        </h3>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">{safeConfig.subtitle}</p>

        <div className="flex w-fit rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setSpecies('dog')}
            className={`flex items-center gap-2 rounded-lg px-6 py-2 font-bold transition-all ${
              species === 'dog'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Icons.Dog className="h-4 w-4" /> {safeConfig.dog_label}
          </button>
          <button
            onClick={() => setSpecies('cat')}
            className={`flex items-center gap-2 rounded-lg px-6 py-2 font-bold transition-all ${
              species === 'cat'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Icons.Cat className="h-4 w-4" /> {safeConfig.cat_label}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {schedules[species]?.map((item: VaccineScheduleItem, idx: number) => (
            <div key={idx} className="group flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    item.age.includes('Anual')
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-[var(--primary)] text-white'
                  }`}
                >
                  {item.n}
                </div>
                {idx !== (schedules[species]?.length || 0) - 1 && (
                  <div className="group-hover:bg-[var(--primary)]/30 my-1 h-full w-0.5 bg-gray-100 transition-colors" />
                )}
              </div>
              <div className="pb-6">
                <h4 className="text-lg font-bold text-[var(--text-primary)]">{item.age}</h4>
                <div className="my-2 flex flex-wrap gap-2">
                  {item.vaccines?.map((v: string, i: number) => (
                    <span
                      key={i}
                      className="border-[var(--primary)]/10 inline-block rounded-md border bg-[var(--bg-subtle)] px-3 py-1 text-xs font-bold text-[var(--primary)]"
                    >
                      {v}
                    </span>
                  ))}
                </div>
                <p className="text-sm italic text-[var(--text-secondary)]">"{item.note}"</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3 rounded-xl border border-yellow-100 bg-yellow-50 p-4 text-sm text-yellow-800">
          <Icons.AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>
            <strong>{safeConfig.important_label}</strong> {safeConfig.important_text}
          </p>
        </div>
      </div>
    </div>
  )
}
