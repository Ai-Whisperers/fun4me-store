'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'
import { requestAccess } from '@/app/actions/network-actions'
import { useToast } from '@/components/ui/Toast'

interface Props {
  petId: string
  clinicId: string
}

export default function PatientRequestButton({ petId, clinicId }: Props) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleRequest = async () => {
    if (!confirm('¿Solicitar acceso a este paciente? Esto registrará la actividad.')) return

    setLoading(true)
    const result = await requestAccess(petId, clinicId)
    setLoading(false)

    if (!result.success) {
      showToast({ title: 'Error solicitando acceso: ' + result.error, variant: 'error' })
    } else {
      // Success - page will likely revalidate
    }
  }

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="hover:bg-[var(--primary)]/5 flex items-center gap-2 rounded-xl border border-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary)] transition-colors disabled:opacity-50"
    >
      {loading ? (
        <>
          <Icons.Loader2 className="h-4 w-4 animate-spin" /> Procesando...
        </>
      ) : (
        <>
          <Icons.LockKeyhole className="h-4 w-4" /> Solicitar Acceso
        </>
      )}
    </button>
  )
}
