import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes | Fun4Me Store',
  description:
    'Respuestas a las preguntas más frecuentes sobre pedidos, envíos, pagos, productos y privacidad en Fun4Me Store. Tu tienda íntima en Paraguay.',
  openGraph: {
    title: 'Preguntas Frecuentes | Fun4Me Store',
    description:
      'Todo lo que necesitás saber sobre Fun4Me Store: envíos, pagos, productos y más.',
    url: 'https://fun4me.sunstein.cloud/faq',
  },
};

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: 'Pedidos y Envíos',
    icon: '📦',
    items: [
      {
        question: '¿Cómo hago un pedido?',
        answer:
          'Podés hacer tu pedido directamente desde nuestra tienda online. Elegí los productos que te gusten, agregalos al carrito y seguí los pasos del checkout. También podés hacer tu pedido por WhatsApp al +595 976 569 739.',
      },
      {
        question: '¿Cuánto tarda en llegar mi pedido?',
        answer:
          'Los tiempos de entrega dependen de tu zona: Asunción tiene entrega en el mismo día (pedidos antes de las 14:00), Gran Asunción tarda 1-2 días hábiles, y envíos al Interior del país tardan entre 2-5 días hábiles.',
      },
      {
        question: '¿Cuánto cuesta el envío?',
        answer:
          'El costo de envío varía según la zona: Asunción Gs 15.000, Gran Asunción Gs 25.000, Interior Gs 40.000. ¡Los envíos son GRATIS para compras mayores a Gs 300.000!',
      },
      {
        question: '¿El envío es discreto?',
        answer:
          'Sí, 100%. Todos nuestros envíos van en paquetes completamente neutros, sin logos, nombres ni ninguna referencia al contenido. El remitente aparece como un nombre genérico para proteger tu privacidad.',
      },
      {
        question: '¿Puedo hacer seguimiento de mi pedido?',
        answer:
          'Sí, una vez que tu pedido sea despachado te enviamos un mensaje por WhatsApp con los detalles del envío. Podés consultar el estado de tu pedido en cualquier momento escribiéndonos.',
      },
      {
        question: '¿Qué pasa si no estoy en mi casa cuando llega el pedido?',
        answer:
          'El delivery intentará contactarte al número de teléfono que proporcionaste. Si no hay nadie, coordinamos una nueva entrega sin costo adicional. También podés indicar una dirección alternativa o persona autorizada para recibir.',
      },
      {
        question: '¿Puedo retirar mi pedido personalmente?',
        answer:
          'Por el momento no contamos con local para retiro en persona, pero estamos trabajando en esa opción. Mientras tanto, realizamos envíos a todo Paraguay.',
      },
      {
        question: '¿Hacen envíos a todo Paraguay?',
        answer:
          'Sí, realizamos envíos a todo el territorio paraguayo. Los tiempos y costos varían según la zona. Consultanos si tenés alguna duda sobre envíos a tu ciudad.',
      },
    ],
  },
  {
    title: 'Productos',
    icon: '🎁',
    items: [
      {
        question: '¿Los productos son originales?',
        answer:
          'Sí, todos nuestros productos son 100% originales y de marcas reconocidas. Trabajamos directamente con distribuidores autorizados para garantizar la autenticidad y calidad de cada artículo.',
      },
      {
        question: '¿Los productos vienen con garantía?',
        answer:
          'Los juguetes electrónicos tienen garantía de 30 días por defectos de fabricación. Si tu producto presenta algún problema, contactanos por WhatsApp y lo resolvemos.',
      },
      {
        question: '¿Cómo sé qué producto elegir si soy principiante?',
        answer:
          'Cada producto tiene indicado su nivel de experiencia (principiante, intermedio o avanzado) para ayudarte a elegir. Además, podés escribirnos por WhatsApp y te asesoramos de forma personalizada y sin juicios.',
      },
      {
        question: '¿Los productos vienen con instrucciones?',
        answer:
          'Sí, todos los productos vienen con sus instrucciones originales de uso y cuidado. Si necesitás ayuda adicional, no dudes en consultarnos.',
      },
      {
        question: '¿Qué tipo de productos venden?',
        answer:
          'Tenemos una amplia variedad de productos de bienestar íntimo: vibradores, lubricantes, lencería, accesorios para parejas, productos de BDSM, y mucho más. Podés explorar nuestras categorías y encontrar lo que buscás.',
      },
    ],
  },
  {
    title: 'Pagos',
    icon: '💳',
    items: [
      {
        question: '¿Qué métodos de pago aceptan?',
        answer:
          'Aceptamos transferencia bancaria, giro de Tigo Money, pago con tarjeta de débito/crédito y pago contra entrega (solo en Asunción). Pronto habilitaremos más opciones.',
      },
      {
        question: '¿Es seguro pagar en la tienda online?',
        answer:
          'Sí, nuestro sitio usa conexión segura (HTTPS/SSL) para proteger todos tus datos. No almacenamos datos de tarjetas de crédito. Tu seguridad es nuestra prioridad.',
      },
      {
        question: '¿Puedo pagar contra entrega?',
        answer:
          'Sí, ofrecemos pago contra entrega para pedidos dentro de Asunción. Para Gran Asunción e Interior, se requiere pago anticipado por transferencia o giro.',
      },
      {
        question: '¿En el extracto bancario aparece el nombre de la tienda?',
        answer:
          'No. Los cargos aparecen con un nombre comercial genérico para mantener tu discreción. No aparecerá ninguna referencia a productos íntimos.',
      },
    ],
  },
  {
    title: 'Privacidad y Discreción',
    icon: '🔒',
    items: [
      {
        question: '¿Mis datos están seguros?',
        answer:
          'Absolutamente. Protegemos tus datos personales con encriptación de nivel bancario. Nunca compartimos tu información con terceros. Podés leer nuestra Política de Privacidad completa para más detalles.',
      },
      {
        question: '¿Alguien más puede ver lo que compré?',
        answer:
          'No. Tu historial de compras es completamente confidencial. Solo vos y nuestro equipo de logística tienen acceso a la información necesaria para procesar tu pedido, y ese acceso es limitado.',
      },
      {
        question: '¿El paquete dice qué contiene?',
        answer:
          'Nunca. Todos los envíos van en cajas o sobres neutros sin ninguna indicación del contenido. Ni el delivery ni nadie puede saber qué hay adentro.',
      },
      {
        question: '¿Puedo eliminar mi cuenta y mis datos?',
        answer:
          'Sí, tenés derecho a solicitar la eliminación de tu cuenta y todos tus datos personales en cualquier momento. Simplemente escribinos a contacto@fun4me.com o por WhatsApp y lo procesamos.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <span className="text-foreground">Preguntas Frecuentes</span>
      </nav>

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Preguntas Frecuentes</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Encontrá respuestas a las preguntas más comunes sobre nuestra tienda. Si no encontrás lo
          que buscás, escribinos por{' '}
          <a
            href="https://wa.me/595976569739?text=%C2%A1Hola!%20Tengo%20una%20consulta."
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-rose-500 underline hover:text-rose-600"
          >
            WhatsApp
          </a>
          .
        </p>
      </div>

      {/* FAQ Sections */}
      <div className="mx-auto max-w-3xl space-y-10">
        {faqSections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <span>{section.icon}</span>
              {section.title}
            </h2>
            <div className="space-y-2 rounded-xl border bg-card">
              {section.items.map((item, idx) => (
                <details
                  key={idx}
                  className="group border-b last:border-b-0"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                    <span className="pr-4">{item.question}</span>
                    <span className="flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="mx-auto mt-12 max-w-xl rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 p-8 text-center text-white">
        <h2 className="text-xl font-bold">¿No encontraste tu respuesta?</h2>
        <p className="mt-2 text-white/80">
          Nuestro equipo está disponible para ayudarte con cualquier consulta.
        </p>
        <a
          href="https://wa.me/595976569739?text=%C2%A1Hola!%20Tengo%20una%20consulta%20sobre%20Fun4Me%20Store."
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-rose-600 hover:bg-white/90"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Escribinos por WhatsApp
        </a>
      </div>
    </div>
  );
}
