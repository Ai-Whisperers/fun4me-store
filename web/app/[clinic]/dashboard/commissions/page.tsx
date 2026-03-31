import { requireStaff } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getClinicData } from '@/lib/clinics'
import Link from 'next/link'
import { ArrowLeft, Percent } from 'lucide-react'
import { CommissionDashboard } from '@/components/dashboard/commission-dashboard'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams(): Promise<Array<{ clinic: string }>> {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function CommissionsPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params

  await requireStaff(clinic)

  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${clinic}/dashboard`}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
        </Link>
        <div className="rounded-lg bg-blue-100 p-2">
          <Percent className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Comisiones de Tienda</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Gestiona tus comisiones por ventas en la tienda online
          </p>
        </div>
      </div>

      {/* Commission Dashboard */}
      <CommissionDashboard clinic={clinic} />
    </div>
  )
}
