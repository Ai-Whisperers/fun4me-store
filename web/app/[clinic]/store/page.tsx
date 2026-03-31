import { getClinicData, getClinicImageUrl } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import StorePageClient from '@/app/[clinic]/store/client'

export const generateMetadata = async ({ params }: { params: Promise<{ clinic: string }> }) => {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  return {
    title: `Store - ${data?.config.name || 'Adris'}`,
    description: 'Browse products and services',
  }
}

export default async function StorePage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data) notFound()

  // Get store hero image from images manifest
  const storeHeroImage = getClinicImageUrl(data.images, 'hero', 'store')

  return <StorePageClient config={data.config} heroImage={storeHeroImage} />
}
