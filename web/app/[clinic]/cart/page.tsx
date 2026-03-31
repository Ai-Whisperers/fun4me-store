// Server component wrapper for Cart page
import CartPageClient from '@/app/[clinic]/cart/client'
import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'

export const generateMetadata = async () => ({
  title: 'Cart',
  // ...
})

export default async function CartPage({
  params,
}: {
  readonly params: Promise<{ clinic: string }>
}) {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return notFound()

  return <CartPageClient config={data.config} />
}
