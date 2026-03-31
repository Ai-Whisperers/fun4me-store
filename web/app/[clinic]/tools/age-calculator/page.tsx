import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { AgeCalculator } from '@/components/tools/age-calculator'
import { Metadata } from 'next'
import {
  HowToSchema,
  WebApplicationSchema,
  BreadcrumbSchema,
} from '@/components/seo/structured-data'
import { getCanonicalUrl } from '@/lib/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clinic: string }>
}): Promise<Metadata> {
  const { clinic } = await params
  const data = await getClinicData(clinic)
  if (!data) return {}

  const title = `Calculadora de Edad de Mascotas | ${data.config.name}`
  const description =
    'Convierte la edad de tu perro o gato a años humanos con nuestra calculadora científica. Basada en estudios reales, no en el mito de los 7 años.'
  const canonicalUrl = getCanonicalUrl(clinic, '/tools/age-calculator')

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
      siteName: data.config.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function AgeCalculatorPage({
  params,
}: {
  params: Promise<{ clinic: string }>
}) {
  const { clinic } = await params
  const data = await getClinicData(clinic)

  if (!data || !data.config.settings?.modules?.age_calculator) {
    return notFound()
  }

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: 'Inicio', url: `/${clinic}` },
    { name: 'Herramientas', url: `/${clinic}/tools` },
    { name: 'Calculadora de Edad', url: `/${clinic}/tools/age-calculator` },
  ]

  // HowTo steps for the tool
  const howToSteps = [
    { text: 'Selecciona el tipo de mascota: perro o gato' },
    { text: 'Si es perro, selecciona su tamaño (pequeño, mediano, grande)' },
    { text: 'Ingresa la edad de tu mascota en años' },
    { text: 'Obtén la edad equivalente en años humanos basada en estudios científicos' },
  ]

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbSchema items={breadcrumbItems} />
      <HowToSchema
        name="Cómo calcular la edad de tu mascota en años humanos"
        description="Usa nuestra calculadora científica para convertir la edad de tu perro o gato a años humanos"
        steps={howToSteps}
        totalTime="PT30S"
      />
      <WebApplicationSchema
        name="Calculadora de Edad de Mascotas"
        description="Convierte la edad de tu perro o gato a años humanos basado en investigaciones científicas"
        url={`/${clinic}/tools/age-calculator`}
        applicationCategory="HealthApplication"
      />

      <div className="min-h-screen bg-[var(--bg-default)] pb-24">
        {/* Decorative Header */}
        <div className="relative overflow-hidden bg-[var(--primary)] pb-24 pt-32">
          <div className="absolute inset-0 bg-black/10" />
          <div className="container relative z-10 px-4 text-center text-white">
            <h1 className="font-heading mb-4 text-4xl font-black md:text-5xl">
              Calculadora de Edad
            </h1>
            <p className="text-xl opacity-90">¿Sabías que 1 año de perro NO son 7 años humanos?</p>
          </div>
        </div>

        <div className="container relative z-20 -mt-16 px-4">
          <AgeCalculator config={data.config} />
        </div>
      </div>
    </>
  )
}
