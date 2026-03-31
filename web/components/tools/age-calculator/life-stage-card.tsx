'use client'

import * as Icons from 'lucide-react'
import { LifeStage } from '@/hooks/use-age-calculation'

interface LifeStageCardProps {
  lifeStage: LifeStage
}

export function LifeStageCard({ lifeStage }: LifeStageCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-[var(--bg-subtle)] p-5">
      <h4 className="mb-3 flex items-center gap-2 font-bold text-gray-800">
        <Icons.Stethoscope className="h-5 w-5 text-[var(--primary)]" />
        Etapa: {lifeStage.label}
      </h4>
      <p className="mb-4 text-sm text-gray-600">{lifeStage.description}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="mb-1 text-xs font-bold uppercase text-gray-500">Chequeos</p>
          <p className="text-sm text-gray-700">{lifeStage.checkupFrequency}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="mb-1 text-xs font-bold uppercase text-gray-500">Dieta</p>
          <p className="text-sm text-gray-700">{lifeStage.dietTips}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-3">
          <p className="mb-1 text-xs font-bold uppercase text-gray-500">Ejercicio</p>
          <p className="text-sm text-gray-700">{lifeStage.exerciseTips}</p>
        </div>
      </div>
    </div>
  )
}
