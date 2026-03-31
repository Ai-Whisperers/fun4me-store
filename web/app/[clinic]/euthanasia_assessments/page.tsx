import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import EuthanasiaAssessmentClient from './client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinic: string }>
}): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return {}
  return {
    title: `Evaluación de Eutanasia - ${data.config.name}`,
    description: 'Escala HHHHHMM de Calidad de Vida',
  }
}

export default async function EuthanasiaPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ pet_id?: string }>
}) {
  const { clinic } = await params
  const { pet_id } = await searchParams
  const data = await getClinicData(clinic)

  if (!data) notFound()

  return <EuthanasiaAssessmentClient clinic={clinic} initialPetId={pet_id} />
}
