import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Fun4Me Store',
  description:
    'Conocé cómo Fun4Me Store protege tus datos personales. Política de privacidad, uso de cookies, seguridad y tus derechos como usuario.',
  openGraph: {
    title: 'Política de Privacidad | Fun4Me Store',
    description:
      'Tu privacidad es nuestra prioridad. Conocé cómo protegemos tus datos personales en Fun4Me Store.',
    url: 'https://fun4me.sunstein.cloud/privacidad',
  },
};

export default function PrivacidadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <span className="text-foreground">Política de Privacidad</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 4 de abril de 2026
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-sm mx-auto max-w-3xl dark:prose-invert">
        <div className="rounded-xl border bg-gradient-to-r from-rose-50 to-purple-50 p-6 dark:from-rose-950/20 dark:to-purple-950/20">
          <p className="text-sm leading-relaxed text-muted-foreground">
            En Fun4Me Store entendemos la importancia de tu privacidad, especialmente cuando se trata
            de productos de bienestar íntimo. Nos comprometemos a proteger tu información personal
            con los más altos estándares de seguridad y confidencialidad.
          </p>
        </div>

        {/* Section 1 */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              1
            </span>
            Datos que Recopilamos
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Recopilamos los siguientes tipos de información cuando usás nuestra tienda:</p>
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">Datos de identificación</h3>
                <p className="mt-1">
                  Nombre completo, número de teléfono, dirección de correo electrónico y dirección
                  de entrega que proporcionás al realizar un pedido.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">Datos de pedidos</h3>
                <p className="mt-1">
                  Historial de compras, productos seleccionados, montos pagados y estado de
                  entregas.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">Datos técnicos</h3>
                <p className="mt-1">
                  Dirección IP, tipo de navegador, dispositivo utilizado y páginas visitadas dentro
                  de nuestro sitio, recopilados de forma automática para mejorar tu experiencia.
                </p>
              </div>
            </div>
            <p>
              <strong className="text-foreground">Importante:</strong> Nunca solicitamos ni
              almacenamos datos de tarjetas de crédito o débito en nuestros servidores. Los pagos
              con tarjeta se procesan a través de plataformas seguras de terceros.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              2
            </span>
            Cómo Usamos tus Datos
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Utilizamos tu información personal exclusivamente para:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Procesar y entregar tus pedidos correctamente.</li>
              <li>Comunicarnos con vos sobre el estado de tus pedidos.</li>
              <li>Enviarte ofertas y novedades (solo si aceptaste recibirlas, y podés darte de baja en cualquier momento).</li>
              <li>Mejorar nuestro sitio web y la experiencia de compra.</li>
              <li>Cumplir con obligaciones legales y fiscales vigentes en Paraguay.</li>
              <li>Prevenir fraudes y proteger la seguridad de nuestros usuarios.</li>
            </ul>
            <p>
              <strong className="text-foreground">Nunca vendemos, alquilamos ni compartimos</strong>{' '}
              tu información personal con terceros para fines de marketing. Solo compartimos datos
              mínimos con servicios de logística para realizar la entrega de tus pedidos.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              3
            </span>
            Cookies
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Nuestro sitio web utiliza cookies para:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong className="text-foreground">Cookies esenciales:</strong> Mantener tu sesión
                activa y tu carrito de compras funcionando correctamente.
              </li>
              <li>
                <strong className="text-foreground">Cookies de análisis:</strong> Entender cómo los
                usuarios usan nuestro sitio para mejorar la experiencia (datos anonimizados).
              </li>
            </ul>
            <p>
              No utilizamos cookies de publicidad ni de seguimiento de terceros. Podés configurar tu
              navegador para bloquear cookies, aunque esto puede afectar el funcionamiento del
              carrito de compras.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              4
            </span>
            Seguridad
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Protegemos tu información con múltiples capas de seguridad:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Conexión encriptada SSL/TLS en todo el sitio web.</li>
              <li>Almacenamiento seguro de datos con encriptación en reposo.</li>
              <li>Acceso restringido a datos personales solo al personal autorizado.</li>
              <li>Monitoreo continuo de seguridad y actualizaciones periódicas.</li>
              <li>No almacenamos datos de tarjetas de crédito en nuestros servidores.</li>
            </ul>
            <p>
              En caso de cualquier incidente de seguridad que pueda afectar tus datos, te
              notificaremos de forma inmediata junto con las medidas tomadas.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              5
            </span>
            Derechos del Usuario
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Como usuario de Fun4Me Store, tenés derecho a:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">🔍 Acceso</h3>
                <p className="mt-1">
                  Solicitar una copia de todos los datos personales que tenemos sobre vos.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">✏️ Rectificación</h3>
                <p className="mt-1">
                  Corregir cualquier dato personal incorrecto o desactualizado.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">🗑️ Eliminación</h3>
                <p className="mt-1">
                  Solicitar la eliminación de tus datos personales y tu cuenta.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-foreground">🚫 Oposición</h3>
                <p className="mt-1">
                  Oponerte al tratamiento de tus datos para fines de marketing.
                </p>
              </div>
            </div>
            <p>
              Para ejercer cualquiera de estos derechos, contactanos a través de los canales
              indicados en la sección de Contacto. Procesaremos tu solicitud en un plazo máximo de
              15 días hábiles.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              6
            </span>
            Contacto
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Si tenés preguntas sobre esta política de privacidad o querés ejercer tus derechos,
              podés contactarnos por:
            </p>
            <div className="space-y-2 rounded-lg border p-4">
              <p>
                <strong className="text-foreground">Email:</strong>{' '}
                <a
                  href="mailto:contacto@fun4me.com"
                  className="text-rose-500 hover:text-rose-600"
                >
                  contacto@fun4me.com
                </a>
              </p>
              <p>
                <strong className="text-foreground">WhatsApp:</strong>{' '}
                <a
                  href="https://wa.me/595976569739"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-500 hover:text-rose-600"
                >
                  +595 976 569 739
                </a>
              </p>
              <p>
                <strong className="text-foreground">Ubicación:</strong> Asunción, Paraguay
              </p>
            </div>
          </div>
        </section>

        {/* Section 7 */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              7
            </span>
            Cambios en esta Política
          </h2>
          <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Nos reservamos el derecho de actualizar esta política de privacidad en cualquier
              momento. Cualquier cambio significativo será notificado a través de nuestro sitio web.
              Te recomendamos revisar esta página periódicamente. La fecha de última actualización
              aparece al inicio de este documento.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
