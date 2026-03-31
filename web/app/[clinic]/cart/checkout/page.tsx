// Server component wrapper for Checkout page
import CheckoutClient from '@/app/[clinic]/cart/checkout/client'
import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'

export const generateMetadata = async () => ({
  title: 'Checkout',
  description: 'Review and print your order',
  openGraph: { title: 'Checkout', description: 'Review and print your order' },
  twitter: { card: 'summary_large_image' },
})

export default async function CheckoutPage({
  params,
}: {
  readonly params: Promise<{ clinic: string }>
}) {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return notFound()

  return <CheckoutClient config={data.config} />
}
