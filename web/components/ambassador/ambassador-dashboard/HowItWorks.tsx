/**
 * How It Works Component
 *
 * Explains the referral process in 3 steps.
 */

'use client'

interface HowItWorksProps {
  commissionRate: number
}

export function HowItWorks({ commissionRate }: HowItWorksProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="font-semibold text-gray-900">¿Cómo funciona?</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
            1
          </div>
          <div>
            <p className="font-medium text-gray-900">Comparte tu código</p>
            <p className="text-sm text-gray-500">
              Envíalo a veterinarias que conozcas
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
            2
          </div>
          <div>
            <p className="font-medium text-gray-900">Ellos se registran</p>
            <p className="text-sm text-gray-500">
              Con tu código obtienen 2 meses extra de prueba
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
            3
          </div>
          <div>
            <p className="font-medium text-gray-900">Gana comisión</p>
            <p className="text-sm text-gray-500">
              {commissionRate}% del primer año cuando se suscriben
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
