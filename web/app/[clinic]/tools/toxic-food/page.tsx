import { ToxicFoodSearch } from '@/components/tools/toxic-food-search'
import { TOXIC_FOODS, SPECIES_LABELS } from '@/data/toxic-foods'
import { Info, AlertTriangle, Sparkles } from 'lucide-react'
import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  HowToSchema,
  WebApplicationSchema,
  BreadcrumbSchema,
} from '@/components/seo/structured-data'
import { getCanonicalUrl } from '@/lib/config'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  const title = `Verificador de Alimentos Tóxicos para Mascotas | ${clinicData?.config.name || 'Veterinaria'}`
  const description = `Verifica si un alimento es seguro para tu mascota. Base de datos con ${TOXIC_FOODS.length}+ alimentos tóxicos para perros, gatos, aves, conejos y más. Herramienta gratuita de ${clinicData?.config.name}.`
  const canonicalUrl = getCanonicalUrl(clinic, '/tools/toxic-food')

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: canonicalUrl,
      title,
      description,
      siteName: clinicData?.config.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export async function generateStaticParams(): Promise<{ clinic: string }[]> {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function ToxicFoodPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  // Check if module is enabled
  const modules = clinicData.config.modules || {}
  if (modules.toxicFoodChecker === false) {
    notFound()
  }

  // Stats for the header
  const highToxicity = TOXIC_FOODS.filter((f) => f.toxicity === 'Alta').length
  const speciesCount = Object.keys(SPECIES_LABELS).length

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: 'Inicio', url: `/${clinic}` },
    { name: 'Herramientas', url: `/${clinic}/tools` },
    { name: 'Alimentos Tóxicos', url: `/${clinic}/tools/toxic-food` },
  ]

  // HowTo steps for the tool
  const howToSteps = [
    { text: 'Escribe el nombre del alimento que quieres verificar en el buscador' },
    { text: 'Selecciona la especie de tu mascota (perro, gato, ave, conejo, etc.)' },
    { text: 'Revisa el nivel de toxicidad: Verde (seguro), Amarillo (precaución), Rojo (tóxico)' },
    { text: 'Lee los síntomas y qué hacer en caso de ingesta' },
  ]

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbSchema items={breadcrumbItems} />
      <HowToSchema
        name="Cómo verificar si un alimento es tóxico para tu mascota"
        description="Usa nuestro verificador gratuito para comprobar si un alimento es seguro para tu perro, gato u otra mascota"
        steps={howToSteps}
        totalTime="PT1M"
      />
      <WebApplicationSchema
        name="Verificador de Alimentos Tóxicos para Mascotas"
        description={`Base de datos con ${TOXIC_FOODS.length}+ alimentos para verificar toxicidad en mascotas`}
        url={`/${clinic}/tools/toxic-food`}
        applicationCategory="HealthApplication"
      />

      <div className="font-body min-h-screen bg-[var(--bg-default)]">
        {/* Header */}
        <div className="mb-8 border-b bg-gradient-to-b from-red-50 to-[var(--bg-paper)] pb-12 pt-20 text-center shadow-sm">
          <div className="container mx-auto px-4">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Herramienta de Seguridad
            </div>
            <h1 className="font-heading mb-4 text-3xl font-black text-[var(--primary)] md:text-5xl">
              Verificador de Alimentos Tóxicos
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[var(--text-secondary)]">
              Consulta nuestra base de datos con <strong>{TOXIC_FOODS.length}+ alimentos</strong>{' '}
              para verificar si son seguros para tu mascota.
            </p>

            {/* Stats */}
            <div className="mt-6 flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-black text-red-600">{highToxicity}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Alta Toxicidad</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl font-black text-[var(--primary)]">{speciesCount}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Especies</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl font-black text-purple-600">
                  <Sparkles className="inline h-6 w-6" />
                </p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Con IA</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 pb-20 md:px-6">
          {/* Search Component with full data */}
          <ToxicFoodSearch items={TOXIC_FOODS} />

          {/* Info Box */}
          <div className="mt-12 flex items-start gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-6 text-blue-900 shadow-sm">
            <Info className="mt-1 h-6 w-6 flex-shrink-0 text-blue-500" />
            <div>
              <p className="mb-1 font-bold">Nota Importante</p>
              <p className="leading-relaxed">
                Esta herramienta es solo orientativa y no sustituye el consejo veterinario
                profesional. Si sospechas que tu mascota ha ingerido algo tóxico, contacta a{' '}
                <strong>{clinicData.config.name}</strong> inmediatamente o acude a urgencias.
              </p>
              {clinicData.config.contact?.emergencyPhone && (
                <p className="mt-2 font-medium">
                  Emergencias: {clinicData.config.contact.emergencyPhone}
                </p>
              )}
            </div>
          </div>

          {/* Sources */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>Fuentes: ASPCA Poison Control, Pet Poison Helpline, FDA, literatura veterinaria.</p>
          </div>
        </div>
      </div>
    </>
  )
}
