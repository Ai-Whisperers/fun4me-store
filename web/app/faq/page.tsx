'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
  PageHeader,
} from '@/components/landing'
import { getWhatsAppUrl, supportMessages } from '@/lib/whatsapp'

// FAQ categories with their questions
const faqCategories = [
  {
    id: 'general',
    title: 'General',
    faqs: [
      {
        question: '¿Cuánto tiempo tarda en estar listo mi sitio?',
        answer:
          'Generalmente entre 3 a 5 días hábiles una vez que recibimos tu logo y la información de tu clínica. Nosotros nos encargamos de toda la configuración técnica.',
      },
      {
        question: '¿Es difícil de usar el sistema?',
        answer:
          'Para nada. Está diseñado para ser tan fácil como usar Facebook o WhatsApp. Además, te damos una capacitación inicial gratuita para vos y tu equipo.',
      },
      {
        question: '¿Puedo usar mi propio dominio (.com.py)?',
        answer:
          'Sí, absolutamente. Si ya tenés un dominio, lo conectamos gratis. Si no, te ayudamos a registrarlo o te damos una dirección Vetic.com gratuita.',
      },
      {
        question: '¿Mis datos están seguros?',
        answer:
          'Sí, utilizamos encriptación de nivel bancario y backups automáticos diarios. Tus datos y los de tus pacientes son 100% privados y confidenciales.',
      },
      {
        question: '¿Ofrecen soporte técnico?',
        answer:
          'Sí, soporte local vía WhatsApp. No hablamos con robots ni tickets eternos; hablás con personas reales que conocen tu negocio.',
      },
    ],
  },
  {
    id: 'precios',
    title: 'Precios y Pagos',
    faqs: [
      {
        question: '¿Puedo cambiar de plan después?',
        answer:
          'Sí, puedes subir o bajar de plan en cualquier momento. Los cambios se aplican al siguiente período de facturación. Si subes de plan, pagarás la diferencia prorrateada.',
      },
      {
        question: '¿Hay costo de instalación o setup?',
        answer:
          'No, no hay costos ocultos. El precio mensual incluye todo: configuración inicial, migración de datos, capacitación y soporte continuo.',
      },
      {
        question: '¿Qué métodos de pago aceptan?',
        answer:
          'Aceptamos Bancard (débito y crédito), Zimple, transferencia bancaria y depósito. Para planes anuales ofrecemos descuento del 15% y para planes de 2 años descuento del 33%.',
      },
      {
        question: '¿Puedo cancelar cuando quiera?',
        answer:
          'Sí, no hay contratos de permanencia. Puedes cancelar en cualquier momento y seguirás teniendo acceso hasta el final del período pagado.',
      },
      {
        question: '¿Qué opciones de facturación tienen?',
        answer:
          'Ofrecemos 3 opciones: mensual, anual (15% descuento) y bienal de 2 años (33% descuento). Los planes anuales y de 2 años incluyen más llamadas de onboarding personalizado.',
      },
    ],
  },
  {
    id: 'garantia',
    title: 'Garantía ROI',
    faqs: [
      {
        question: '¿En qué consiste la Garantía ROI?',
        answer:
          'Si no conseguís al menos 6 clientes nuevos verificables a través de tu sitio Vetic en los primeros 6 meses, te damos los siguientes 6 meses GRATIS. Es nuestra forma de compartir el riesgo contigo.',
      },
      {
        question: '¿Cómo se verifican los clientes nuevos?',
        answer:
          'Los clientes nuevos se rastrean automáticamente a través de reservas online, formularios de contacto y mensajes de WhatsApp que llegan desde tu sitio Vetic. Todo queda registrado en tu dashboard.',
      },
      {
        question: '¿Aplica para todos los planes?',
        answer:
          'La Garantía ROI aplica para los planes Profesional y Clínica. El plan gratuito no incluye esta garantía.',
      },
      {
        question: '¿Cómo reclamo la garantía?',
        answer:
          'Simplemente contactanos por WhatsApp después del sexto mes y verificamos tus métricas. Si no llegaste a 6 clientes nuevos, activamos los 6 meses gratis automáticamente.',
      },
    ],
  },
  {
    id: 'embajadores',
    title: 'Embajadores',
    faqs: [
      {
        question: '¿Qué es el programa de embajadores?',
        answer:
          'Es un programa donde estudiantes de veterinaria, asistentes y profesionales pueden ganar comisiones por referir nuevas clínicas a Vetic. Ganas hasta 40% de comisión en efectivo por cada clínica que se registre con tu código.',
      },
      {
        question: '¿Cómo me convierto en embajador?',
        answer:
          'Visitá la página /ambassador y completá el formulario. Recibiras tu código único en menos de 24 horas. No hay costos ni requisitos previos.',
      },
      {
        question: '¿Cuánto puedo ganar como embajador?',
        answer:
          'Ganas hasta Gs 100.000 por cada clínica referida que se active en un plan pago. Si referís 10 clínicas al mes, podés ganar Gs 1.000.000. No hay límite de referidos.',
      },
      {
        question: '¿Cómo recibo mis comisiones?',
        answer:
          'Las comisiones se pagan mensualmente via transferencia bancaria o depósito. Podés ver tus referidos y comisiones en tiempo real desde tu dashboard de embajador.',
      },
      {
        question: '¿Puedo ser embajador si ya soy cliente?',
        answer:
          'Sí, los clientes existentes también pueden ser embajadores. De hecho, son los mejores embajadores porque conocen el producto de primera mano.',
      },
    ],
  },
  {
    id: 'reclamo',
    title: 'Reclamar Sitio',
    faqs: [
      {
        question: '¿Qué significa "reclamar un sitio"?',
        answer:
          'En algunos casos, generamos sitios web de muestra para clínicas usando información pública. Si ves un sitio con el nombre de tu clínica en vetic.com, podés reclamarlo para obtener acceso completo y personalizarlo.',
      },
      {
        question: '¿Cómo sé si hay un sitio pre-generado para mi clínica?',
        answer:
          'Visitá vetic.com/reclamar e ingresá el slug o nombre de tu clínica. Si existe un sitio disponible, podrás reclamarlo inmediatamente.',
      },
      {
        question: '¿Tiene algún costo reclamar un sitio?',
        answer:
          'No, reclamar tu sitio es 100% gratuito. Además, recibís 3 meses del plan Profesional sin costo para que pruebes todas las funcionalidades.',
      },
      {
        question: '¿Qué pasa si no quiero el sitio pre-generado?',
        answer:
          'Si no te interesa, simplemente no lo reclames. Los sitios no reclamados se eliminan automáticamente después de 30 días. No aparecerán en buscadores.',
      },
      {
        question: '¿Puedo editar toda la información del sitio?',
        answer:
          'Sí, una vez que reclames el sitio tenés control total. Podés cambiar colores, logo, servicios, precios, y toda la información de tu clínica.',
      },
    ],
  },
  {
    id: 'demo',
    title: 'Demo y Prueba',
    faqs: [
      {
        question: '¿Qué voy a ver en la demo?',
        answer:
          'Te mostraremos las funcionalidades principales: agenda, historial clínico, tienda online y facturación. Personalizamos la demo según el tipo de clínica que tengas.',
      },
      {
        question: '¿Necesito preparar algo para la demo?',
        answer:
          'No necesitás preparar nada. Solo tené a mano una idea de cuántos pacientes atendés por mes y cuántas personas trabajan en tu clínica para personalizar mejor la demo.',
      },
      {
        question: '¿Puedo invitar a mi equipo a la demo?',
        answer:
          '¡Claro! Mientras más personas de tu equipo participen, mejor podrán evaluar si Vetic es la solución correcta.',
      },
      {
        question: '¿La demo es por videollamada?',
        answer:
          'Sí, usamos Google Meet o WhatsApp videollamada, lo que te sea más cómodo. Te enviamos el link después de agendar.',
      },
      {
        question: '¿Cuánto dura el periodo de prueba gratis?',
        answer:
          'Ofrecemos 90 días de prueba gratuita con acceso completo al plan Profesional. Sin tarjeta de crédito requerida.',
      },
    ],
  },
]

function FAQAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg-white)]"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <span className="font-medium text-[var(--landing-text-primary)]">{faq.question}</span>
            {openIndex === index ? (
              <ChevronUp className="h-5 w-5 flex-shrink-0 text-[var(--landing-text-light)]" />
            ) : (
              <ChevronDown className="h-5 w-5 flex-shrink-0 text-[var(--landing-text-light)]" />
            )}
          </button>
          {openIndex === index && (
            <div className="border-t border-[var(--landing-border-light)] px-6 py-4">
              <p className="text-[var(--landing-text-secondary)]">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function FAQPage(): React.ReactElement {
  const [activeCategory, setActiveCategory] = useState('general')

  return (
    <main className="min-h-screen bg-[var(--landing-bg)]">
      <LandingNav />

      <PageHeader
        badge="Centro de Ayuda"
        title="Preguntas"
        highlight="Frecuentes"
        description="Todo lo que necesitas saber sobre Vetic. Si no encontrás tu respuesta, escribinos por WhatsApp."
      />

      {/* Category Tabs */}
      <section className="border-b border-[var(--landing-border-light)] bg-[var(--landing-bg-white)]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex gap-2 overflow-x-auto py-4 md:justify-center">
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium transition-all ${
                  activeCategory === category.id
                    ? 'bg-[var(--landing-primary)] text-white'
                    : 'bg-[var(--landing-bg-muted)] text-[var(--landing-text-secondary)] hover:bg-[var(--landing-primary-lighter)] hover:text-[var(--landing-primary)]'
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl">
            {faqCategories.map((category) =>
              category.id === activeCategory ? (
                <div key={category.id}>
                  <h2 className="mb-8 text-2xl font-bold text-[var(--landing-text-primary)]">
                    {category.title}
                  </h2>
                  <FAQAccordion faqs={category.faqs} />
                </div>
              ) : null
            )}
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="bg-[var(--landing-bg-white)] py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--landing-primary-lighter)]">
              <HelpCircle className="h-8 w-8 text-[var(--landing-primary)]" />
            </div>
            <h2 className="mb-4 text-2xl font-bold text-[var(--landing-text-primary)]">
              ¿No encontraste tu respuesta?
            </h2>
            <p className="mb-8 text-[var(--landing-text-secondary)]">
              Nuestro equipo está disponible para ayudarte con cualquier consulta.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <a
                href={getWhatsAppUrl(supportMessages.question())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-primary)] px-8 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--landing-primary-hover)]"
              >
                <MessageCircle className="h-5 w-5" />
                Escribir por WhatsApp
              </a>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-full border-2 border-[var(--landing-border)] px-8 py-4 font-bold text-[var(--landing-text-primary)] transition-all hover:border-[var(--landing-primary)] hover:text-[var(--landing-primary)]"
              >
                Agendar una Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
