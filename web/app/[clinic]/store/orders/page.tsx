import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import OrderHistoryClient from './client'

export const generateMetadata = async ({ params }: { params: Promise<{ clinic: string }> }) => {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  return {
    title: `Mis Pedidos - ${data?.config.name || 'Tienda'}`,
    description: 'Historial de pedidos y seguimiento',
  }
}

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function OrderHistoryPage({ params }: Props) {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data) {
    notFound()
  }

  return <OrderHistoryClient config={data.config} />
}
