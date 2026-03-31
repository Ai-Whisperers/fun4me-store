'use client'

import { useRouter } from 'next/navigation'
import ClaimForm from '@/components/insurance/claim-form'
import { ArrowLeft } from 'lucide-react'

export default function NewClaimPage() {
  const router = useRouter()

  const handleSuccess = (claimId: string) => {
    router.push(`../claims/${claimId}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] p-6">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver
        </button>

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Nuevo Reclamo de Seguro
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Complete la información del reclamo para enviar a la aseguradora
            </p>
          </div>

          <ClaimForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
