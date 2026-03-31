'use client'

import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  Species,
  DogSize,
  CatType,
  BirdCategory,
  TurtleType,
  FishType,
  DOG_SIZE_CONFIG,
  CAT_TYPE_CONFIG,
  BIRD_CONFIG,
} from '@/lib/age-calculator/configs'

interface SubSpeciesSelectorProps {
  species: Species
  dogSize: DogSize
  catType: CatType
  birdCategory: BirdCategory
  turtleType: TurtleType
  fishType: FishType
  onDogSizeChange: (size: DogSize) => void
  onCatTypeChange: (type: CatType) => void
  onBirdCategoryChange: (category: BirdCategory) => void
  onTurtleTypeChange: (type: TurtleType) => void
  onFishTypeChange: (type: FishType) => void
}

export function SubSpeciesSelector({
  species,
  dogSize,
  catType,
  birdCategory,
  turtleType,
  fishType,
  onDogSizeChange,
  onCatTypeChange,
  onBirdCategoryChange,
  onTurtleTypeChange,
  onFishTypeChange,
}: SubSpeciesSelectorProps) {
  return (
    <AnimatePresence mode="wait">
      {species === 'dog' && (
        <motion.div
          key="dog-options"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 overflow-hidden"
        >
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            2. Tamaño del perro
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(Object.keys(DOG_SIZE_CONFIG) as DogSize[]).map((size) => {
              const cfg = DOG_SIZE_CONFIG[size]
              return (
                <button
                  key={size}
                  onClick={() => onDogSizeChange(size)}
                  className={`rounded-xl border-2 px-2 py-3 text-center transition-all ${
                    dogSize === size
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-bold">{cfg.label}</span>
                  <span
                    className={`mt-0.5 block text-xs ${dogSize === size ? 'text-white/80' : 'text-gray-400'}`}
                  >
                    {cfg.weightRange}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="flex items-center justify-center gap-1 text-center text-xs text-gray-400">
            <Icons.Info className="h-3 w-3" />
            {DOG_SIZE_CONFIG[dogSize].description}
          </p>
        </motion.div>
      )}

      {species === 'cat' && (
        <motion.div
          key="cat-options"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 overflow-hidden"
        >
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            2. Estilo de vida
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CAT_TYPE_CONFIG) as CatType[]).map((type) => {
              const cfg = CAT_TYPE_CONFIG[type]
              const icons = {
                indoor: Icons.Home,
                outdoor: Icons.Trees,
                mixed: Icons.ArrowLeftRight,
              }
              const Icon = icons[type]
              return (
                <button
                  key={type}
                  onClick={() => onCatTypeChange(type)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-all ${
                    catType === type
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-bold">{cfg.label}</span>
                  <span
                    className={`text-center text-xs ${catType === type ? 'text-white/80' : 'text-gray-400'}`}
                  >
                    {cfg.description}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {species === 'bird' && (
        <motion.div
          key="bird-options"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 overflow-hidden"
        >
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            2. Tipo de ave
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(Object.keys(BIRD_CONFIG) as BirdCategory[]).map((cat) => {
              const cfg = BIRD_CONFIG[cat]
              return (
                <button
                  key={cat}
                  onClick={() => onBirdCategoryChange(cat)}
                  className={`rounded-xl border-2 px-2 py-3 text-center transition-all ${
                    birdCategory === cat
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-bold">{cfg.label}</span>
                  <span
                    className={`mt-0.5 block text-xs ${birdCategory === cat ? 'text-white/80' : 'text-gray-400'}`}
                  >
                    {cfg.avgLifespan.min}-{cfg.avgLifespan.max}a
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {species === 'turtle' && (
        <motion.div
          key="turtle-options"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 overflow-hidden"
        >
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            2. Tipo de tortuga
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['aquatic', 'terrestrial'] as TurtleType[]).map((type) => {
              const isAquatic = type === 'aquatic'
              return (
                <button
                  key={type}
                  onClick={() => onTurtleTypeChange(type)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                    turtleType === type
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{isAquatic ? '🐢' : '🐢'}</span>
                  <span className="font-bold">{isAquatic ? 'Acuática' : 'Terrestre'}</span>
                  <span
                    className={`text-xs ${turtleType === type ? 'text-white/80' : 'text-gray-400'}`}
                  >
                    {isAquatic ? 'Orejas rojas, pintadas' : 'Sulcata, mediterránea'}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {species === 'fish' && (
        <motion.div
          key="fish-options"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 overflow-hidden"
        >
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            2. Tipo de pez
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['tropical', 'goldfish', 'koi'] as FishType[]).map((type) => {
              const labels = { tropical: 'Tropical', goldfish: 'Pez Dorado', koi: 'Koi / Carpa' }
              const descs = {
                tropical: 'Betta, guppy, tetra',
                goldfish: 'Común, cometa',
                koi: 'Estanque',
              }
              return (
                <button
                  key={type}
                  onClick={() => onFishTypeChange(type)}
                  className={`rounded-xl border-2 px-2 py-3 text-center transition-all ${
                    fishType === type
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-bold">{labels[type]}</span>
                  <span
                    className={`mt-0.5 block text-xs ${fishType === type ? 'text-white/80' : 'text-gray-400'}`}
                  >
                    {descs[type]}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
