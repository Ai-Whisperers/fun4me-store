import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { PaymentGatewaySettings } from './payment-gateway-settings'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams() {
  return [
    { clinic: 'terrapet' },
    { clinic: 'petlife' },
  ]
}

export default async function PaymentGatewaysPage({ params }: Props) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)
  
  if (!clinicData) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Pasarelas de Pago
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Configure las pasarelas de pago para su clínica
          </p>
        </div>
      </div>

      <PaymentGatewaySettings clinicSlug={clinic} />
    </div>
  )
}