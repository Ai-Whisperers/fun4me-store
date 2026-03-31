import { requireStaff } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getClinicData } from '@/lib/clinics'
import { requireFeature } from '@/lib/features/server'
import { UpgradePromptServer } from '@/components/dashboard/upgrade-prompt-server'
import OrdersClient from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams(): Promise<Array<{ clinic: string }>> {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function OrdersPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params

  // SEC-006: Require staff authentication with tenant verification
  const { profile } = await requireStaff(clinic)

  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  // Feature gate: Orders requires 'ecommerce' feature
  const featureError = await requireFeature(profile.tenant_id, 'ecommerce')
  if (featureError) {
    return (
      <UpgradePromptServer
        feature="ecommerce"
        title="Tienda en Línea"
        description="Vende productos y gestiona pedidos de tu tienda en línea integrada."
        clinic={clinic}
      />
    )
  }

  return <OrdersClient clinic={clinic} />
}
