import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Devolución | Fun4Me Store',
  description:
    'Conocé nuestra política de devoluciones y cambios. 7 días para devoluciones de productos sin abrir. Fun4Me Store, Asunción, Paraguay.',
  openGraph: {
    title: 'Política de Devolución | Fun4Me Store',
    description:
      'Política de devoluciones y cambios de Fun4Me Store. 7 días para devolver productos sin abrir.',
    url: 'https://fun4me.sunstein.cloud/devoluciones',
  },
};

export default function DevolucionesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <span className="text-foreground">Política de Devolución</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Política de Devolución</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 4 de abril de 2026
        </p>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          📝 Esta política está en revisión y puede ser actualizada próximamente.
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Overview */}
        <div className="mb-10 rounded-xl border bg-gradient-to-r from-rose-50 to-purple-50 p-6 dark:from-rose-950/20 dark:to-purple-950/20">
          <p className="text-sm leading-relaxed text-muted-foreground">
            En Fun4Me Store queremos que estés satisfecho/a con tu compra. Si por algún motivo
            necesitás devolver un producto, acá te explicamos cómo funciona nuestro proceso de
            devolución.
          </p>
        </div>

        {/* Plazo */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              ⏰
            </span>
            Plazo de Devolución
          </h2>
          <div className="mt-4 rounded-xl border bg-card p-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-rose-600">7 días</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Tenés <strong className="text-foreground">7 días corridos</strong> a partir de la
                fecha de recepción del producto para solicitar una devolución.
              </p>
            </div>
          </div>
        </section>

        {/* Condiciones */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              ✅
            </span>
            Condiciones para la Devolución
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex gap-3 rounded-xl border bg-card p-5">
              <span className="text-xl">📦</span>
              <div>
                <h3 className="font-semibold">Producto sin abrir</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  El producto debe estar en su empaque original, sin abrir, sin señales de uso y en
                  perfectas condiciones.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border bg-card p-5">
              <span className="text-xl">🏷️</span>
              <div>
                <h3 className="font-semibold">Empaque original completo</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Debe incluir todos los accesorios, manuales, etiquetas y materiales originales que
                  venían con el producto.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border bg-card p-5">
              <span className="text-xl">🧾</span>
              <div>
                <h3 className="font-semibold">Comprobante de compra</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Necesitás el número de pedido o alguna referencia de tu compra para procesar la
                  devolución.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Productos de higiene */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              ⚠️
            </span>
            Productos de Higiene
          </h2>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              <strong>Por razones de higiene y salud,</strong> los siguientes productos{' '}
              <strong>NO aceptan devolución</strong> una vez abiertos:
            </p>
            <ul className="mt-3 ml-4 list-disc space-y-1 text-sm text-amber-700 dark:text-amber-300">
              <li>Juguetes íntimos (vibradores, dildos, anillos, etc.)</li>
              <li>Lubricantes y geles</li>
              <li>Lencería (ropa interior)</li>
              <li>Preservativos y anticonceptivos</li>
              <li>Productos de cuidado íntimo</li>
            </ul>
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
              Estos productos solo se aceptan para devolución si el{' '}
              <strong>sello de seguridad está intacto</strong> y el producto no fue abierto.
            </p>
          </div>
        </section>

        {/* Motivos aceptados */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              📋
            </span>
            Motivos Aceptados para Devolución
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-green-500">✓</span>
              <span>Producto defectuoso o con fallas de fabricación</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-green-500">✓</span>
              <span>Producto diferente al solicitado</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-green-500">✓</span>
              <span>Producto dañado durante el envío</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-green-500">✓</span>
              <span>Producto sin abrir dentro del plazo de 7 días</span>
            </div>
          </div>
        </section>

        {/* Proceso */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              🔄
            </span>
            Proceso de Devolución
          </h2>
          <div className="mt-4 space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-sm font-bold text-white">
                1
              </div>
              <div>
                <h3 className="font-semibold">Contactanos por WhatsApp</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escribinos al{' '}
                  <a
                    href="https://wa.me/595976569739?text=%C2%A1Hola!%20Quiero%20solicitar%20una%20devoluci%C3%B3n."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-rose-500 hover:text-rose-600"
                  >
                    +595 976 569 739
                  </a>{' '}
                  indicando tu número de pedido y el motivo de la devolución.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-sm font-bold text-white">
                2
              </div>
              <div>
                <h3 className="font-semibold">Evaluación</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nuestro equipo evaluará tu solicitud y te confirmará si la devolución es
                  procedente dentro de las 24-48 horas.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-sm font-bold text-white">
                3
              </div>
              <div>
                <h3 className="font-semibold">Envío del producto</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Si se aprueba, te indicaremos cómo enviarnos el producto de vuelta. El costo de
                  envío de devolución corre por cuenta del cliente, salvo que el producto sea
                  defectuoso o incorrecto.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-sm font-bold text-white">
                4
              </div>
              <div>
                <h3 className="font-semibold">Reembolso o cambio</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Una vez recibido y verificado el producto, procesamos el reembolso o cambio en un
                  plazo de 5-7 días hábiles. El reembolso se realiza por el mismo medio de pago
                  utilizado en la compra.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Excepciones */}
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm text-rose-600 dark:bg-rose-900/30">
              🚫
            </span>
            No se Aceptan Devoluciones en estos Casos
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-red-500">✗</span>
              <span>Productos abiertos o usados (excepto defectos de fabricación)</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-red-500">✗</span>
              <span>Solicitudes después de los 7 días corridos</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-red-500">✗</span>
              <span>Productos de higiene con sello de seguridad roto</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
              <span className="text-red-500">✗</span>
              <span>Productos en liquidación o con descuento especial (salvo defectos)</span>
            </div>
          </div>
        </section>

        {/* Contacto */}
        <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 p-8 text-center text-white">
          <h2 className="text-xl font-bold">¿Necesitás hacer una devolución?</h2>
          <p className="mt-2 text-white/80">
            Contactanos por WhatsApp y te guiamos en el proceso.
          </p>
          <a
            href="https://wa.me/595976569739?text=%C2%A1Hola!%20Quiero%20solicitar%20una%20devoluci%C3%B3n."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-rose-600 hover:bg-white/90"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Solicitar Devolución
          </a>
        </div>
      </div>
    </div>
  );
}
