'use client'

import * as Icons from 'lucide-react'

interface HealthTipsProps {
  healthTips: string[]
}

export function HealthTips({ healthTips }: HealthTipsProps) {
  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 font-bold text-gray-700">
        <Icons.Lightbulb className="h-5 w-5 text-amber-500" />
        Recomendaciones específicas
      </h4>
      <ul className="space-y-2">
        {healthTips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
            <Icons.CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}
