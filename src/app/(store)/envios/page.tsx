import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Envíos y Entregas | Fun4Me Store',
  description:
    'Información sobre envíos discretos a todo Paraguay. Zonas de cobertura, tiempos de entrega y costos. Envío gratis en compras mayores a Gs 300.000.',
  openGraph: {
    title: 'Envíos y Entregas | Fun4Me Store',
    description:
      'Envíos discretos a todo Paraguay. Entrega el mismo día en Asunción. Envío gratis en compras mayores a Gs 300.000.',
    url: 'https://fun4me.sunstein.cloud/envios',
  },
};

const zones = [
  {
    name: 'Asunción',
    time: 'Mismo día',
    timeDetail: 'Pedidos antes de las 14:00 hs',
    price: 'Gs 15.000',
    icon: '🏙️',
    color: 'from-rose-500 to-pink-500',
  },
  {
    name: 'Gran Asunción',
    time: '1-2 días hábiles',
    timeDetail: 'Lambaré, Fernando de la Mora, San Lorenzo, Luque, etc.',
    price: 'Gs 25.000',
    icon: '🏘️',
    color: 'from-pink-500 to-purple-500',
  },
  {
    name: 'Interior del País',
    time: '2-5 días hábiles',
    timeDetail: 'Encarnación, Ciudad del Este, Pedro Juan Caballero, etc.',
    price: 'Gs 40.000',
    icon: '🗺️',
    color: 'from-purple-500 to-indigo-500',
  },
];

const shippingFAQ = [
  {
    question: '¿Cómo sé si mi zona es Asunción o Gran Asunción?',
    answer:
      'Asunción incluye todos los barrios dentro del municipio de Asunción. Gran Asunción incluye ciudades del departamento Central como Lambaré, San Lorenzo, Fernando de la Mora, Luque, Capiatá, Ñemby, San Antonio, Limpio, Mariano Roque Alonso y Villa Elisa.',
  },
  {
    question: '¿Qué pasa si mi pedido llega dañado?',
    answer:
      'Si tu pedido llega dañado, sacá fotos del paquete y del producto y contactanos inmediatamente por WhatsApp. Resolveremos tu caso con reenvío o reembolso sin costo adicional.',
  },
  {
    question: '¿Puedo cambiar la dirección de entrega después de hacer el pedido?',
    answer:
      'Sí, siempre que el pedido aún no haya sido despachado. Contactanos por WhatsApp lo antes posible para actualizar la dirección.',
  },
  {
    question: '¿Hacen envíos internacionales?',
    answer:
      'Por el momento solo realizamos envíos dentro de Paraguay. Estamos evaluando opciones para envíos internacionales en el futuro.',
  },
  {
    question: '¿Puedo programar la entrega para un horario específico?',
    answer:
      'Para envíos dentro de Asunción, podés indicar un rango horario preferido y haremos lo posible por coordinarlo. Para envíos al interior, los horarios dependen de la empresa de logística.',
  },
];

export default function EnviosPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <span className="text-foreground">Envíos y Entregas</span>
      </nav>

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Envíos y Entregas</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Realizamos envíos discretos a todo Paraguay. Tu privacidad es nuestra prioridad.
        </p>
      </div>

      {/* Free Shipping Banner */}
      <div className="mb-10 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 p-6 text-center text-white sm:p-8">
        <div className="text-4xl font-bold sm:text-5xl">🚚 ¡Envío GRATIS!</div>
        <p className="mt-3 text-lg text-white/90">
          En compras mayores a{' '}
          <span className="font-bold text-white">Gs 300.000</span>
        </p>
        <p className="mt-1 text-sm text-white/70">Válido para todo Paraguay</p>
      </div>

      {/* Zones Grid */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">Zonas y Tarifas</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {zones.map((zone) => (
            <div
              key={zone.name}
              className="relative overflow-hidden rounded-xl border bg-card p-6 text-center transition-all hover:shadow-lg"
            >
              <div className="text-4xl">{zone.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{zone.name}</h3>
              <div
                className={`mt-2 inline-block rounded-full bg-gradient-to-r ${zone.color} px-4 py-1 text-sm font-bold text-white`}
              >
                {zone.price}
              </div>
              <p className="mt-3 font-medium text-rose-600">{zone.time}</p>
              <p className="mt-1 text-xs text-muted-foreground">{zone.timeDetail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Discreet Packaging */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">Empaque 100% Discreto</h2>
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl border bg-card p-5">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="font-semibold">Paquete Neutro</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Todos los envíos van en cajas o sobres completamente neutros, sin logos, marcas ni
                  ninguna indicación del contenido.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border bg-card p-5">
              <span className="text-2xl">🏷️</span>
              <div>
                <h3 className="font-semibold">Remitente Genérico</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  El remitente aparece con un nombre comercial genérico. Nadie puede identificar que
                  el paquete viene de una tienda íntima.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border bg-card p-5">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-semibold">Sellado Seguro</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los paquetes van sellados de forma segura para que el contenido no sea visible ni
                  accesible durante el transporte.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border bg-card p-5">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="font-semibold">Notificación Privada</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Te notificamos por WhatsApp cuando tu pedido esté en camino. Solo vos recibís la
                  información de seguimiento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Times */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">Tiempos de Entrega</h2>
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold">Zona</th>
                <th className="px-4 py-3 text-left font-semibold">Tiempo Estimado</th>
                <th className="px-4 py-3 text-left font-semibold">Costo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3 font-medium">Asunción</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Mismo día (pedidos antes de 14:00)
                </td>
                <td className="px-4 py-3 font-semibold text-rose-600">Gs 15.000</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 font-medium">Gran Asunción</td>
                <td className="px-4 py-3 text-muted-foreground">1-2 días hábiles</td>
                <td className="px-4 py-3 font-semibold text-rose-600">Gs 25.000</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 font-medium">Interior</td>
                <td className="px-4 py-3 text-muted-foreground">2-5 días hábiles</td>
                <td className="px-4 py-3 font-semibold text-rose-600">Gs 40.000</td>
              </tr>
              <tr className="bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-950/20 dark:to-purple-950/20">
                <td className="px-4 py-3 font-bold" colSpan={2}>
                  Compras mayores a Gs 300.000
                </td>
                <td className="px-4 py-3 font-bold text-green-600">¡GRATIS!</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">
          * Los tiempos de entrega son estimados y pueden variar según condiciones climáticas o
          feriados. Los días hábiles no incluyen sábados, domingos ni feriados.
        </p>
      </div>

      {/* Shipping FAQ */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold">Preguntas sobre Envíos</h2>
        <div className="mx-auto max-w-3xl space-y-2 rounded-xl border bg-card">
          {shippingFAQ.map((item, idx) => (
            <details key={idx} className="group border-b last:border-b-0">
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
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-xl rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 p-8 text-center text-white">
        <h2 className="text-xl font-bold">¿Tenés dudas sobre tu envío?</h2>
        <p className="mt-2 text-white/80">
          Nuestro equipo está listo para ayudarte con cualquier consulta sobre envíos.
        </p>
        <a
          href="https://wa.me/595976569739?text=%C2%A1Hola!%20Tengo%20una%20consulta%20sobre%20env%C3%ADos."
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-rose-600 hover:bg-white/90"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Consultar por WhatsApp
        </a>
      </div>
    </div>
  );
}
