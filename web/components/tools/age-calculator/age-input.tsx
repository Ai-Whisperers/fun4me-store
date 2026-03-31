'use client'

import { useMemo } from 'react'
import * as Icons from 'lucide-react'
import {
  Species,
  BirdCategory,
  TurtleType,
  FishType,
  getAgePresets,
} from '@/lib/age-calculator/configs'

interface AgeInputProps {
  species: Species
  birdCategory: BirdCategory
  turtleType: TurtleType
  fishType: FishType
  age: string
  ageUnit: 'years' | 'months'
  hasSubOptions: boolean
  onAgeChange: (age: string) => void
  onAgeUnitChange: (unit: 'years' | 'months') => void
  onCalculate: () => void
}

export function AgeInput({
  species,
  birdCategory,
  turtleType,
  fishType,
  age,
  ageUnit,
  hasSubOptions,
  onAgeChange,
  onAgeUnitChange,
  onCalculate,
}: AgeInputProps) {
  // Dynamic age presets based on species
  const agePresets = useMemo(() => {
    return getAgePresets(species, birdCategory, turtleType, fishType)
  }, [species, birdCategory, turtleType, fishType])

  // Handle preset click
  const handlePresetClick = (preset: { value: number; unit: string }) => {
    if (preset.unit === 'months') {
      onAgeUnitChange('months')
      onAgeChange(preset.value.toString())
    } else {
      onAgeUnitChange('years')
      onAgeChange(preset.value.toString())
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {hasSubOptions ? '3' : '2'}. Edad de tu mascota
      </label>

      {/* Quick presets */}
      <div className="flex flex-wrap justify-center gap-2">
        {agePresets.map((preset, i) => {
          const isActive =
            ageUnit === (preset.unit === 'months' ? 'months' : 'years') &&
            parseFloat(age) === preset.value
          return (
            <button
              key={i}
              onClick={() => handlePresetClick(preset)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {preset.unit === 'months' ? `${preset.value}m` : `${preset.value}a`}
            </button>
          )
        })}
      </div>

      {/* Age input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            placeholder="0"
            className="focus:ring-[var(--primary)]/10 w-full rounded-xl border-2 border-gray-200 p-4 pr-20 text-center text-3xl font-black outline-none transition-all focus:border-[var(--primary)] focus:ring-4 sm:text-4xl"
            min="0"
            max="200"
            step="0.1"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 rounded-lg bg-gray-100 p-0.5">
            <button
              onClick={() => onAgeUnitChange('years')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                ageUnit === 'years' ? 'bg-white text-[var(--primary)] shadow' : 'text-gray-500'
              }`}
            >
              Años
            </button>
            <button
              onClick={() => onAgeUnitChange('months')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                ageUnit === 'months' ? 'bg-white text-[var(--primary)] shadow' : 'text-gray-500'
              }`}
            >
              Meses
            </button>
          </div>
        </div>
        <button
          onClick={onCalculate}
          disabled={!age || parseFloat(age) <= 0}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:px-8"
        >
          <Icons.Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">Calcular</span>
        </button>
      </div>
    </div>
  )
}
