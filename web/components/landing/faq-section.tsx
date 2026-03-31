'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/whatsapp'

const faqs = [
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
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="relative overflow-hidden bg-slate-50 py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-black text-slate-900 md:text-4xl">
            Preguntas Frecuentes
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Todo lo que necesitas saber antes de empezar.
          </p>
        </div>

        {/* FAQ List */}
        <div className="mx-auto max-w-3xl">
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-teal-200"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-bold text-slate-900">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${
                      openIndex === idx ? 'rotate-180 text-teal-500' : ''
                    }`}
                  />
                </button>
                <div
                  className={`px-5 text-slate-600 transition-all duration-300 ${
                    openIndex === idx ? 'max-h-[200px] pb-5 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-slate-600">
            <HelpCircle className="h-5 w-5" />
            <span>¿Tenés otra pregunta?</span>
            <a
              href={getWhatsAppUrl()}
              className="font-bold text-teal-600 hover:underline inline-flex items-center gap-1"
            >
              Escribinos al WhatsApp
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
