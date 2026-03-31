'use client'

import { useState } from 'react'
import {
  Calendar,
  Users,
  ShoppingBag,
  FileText,
  BarChart3,
  Stethoscope,
  ClipboardList,
  PawPrint,
  Syringe,
  QrCode,
  Clock,
  Bell,
  Package,
  CreditCard,
  Receipt,
  TrendingUp,
  PieChart,
  Activity,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
  PageHeader,
  FeatureCard,
} from '@/components/landing'

const categories = [
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'pacientes', label: 'Pacientes', icon: PawPrint },
  { id: 'tienda', label: 'Tienda', icon: ShoppingBag },
  { id: 'facturacion', label: 'Facturación', icon: FileText },
  { id: 'reportes', label: 'Reportes', icon: BarChart3 },
]

const featuresByCategory = {
  agenda: [
    {
      icon: Calendar,
      title: 'Agenda Visual',
      description: 'Vista de día, semana y mes con código de colores por servicio y veterinario.',
      features: [
        'Arrastrar y soltar citas',
        'Bloqueo de horarios',
        'Vista por veterinario',
      ],
    },
    {
      icon: Clock,
      title: 'Reservas Online',
      description: 'Tus clientes agendan desde tu web 24/7. Sin llamadas, sin esperas.',
      features: [
        'Disponibilidad en tiempo real',
        'Confirmación automática',
        'Selección de veterinario',
      ],
    },
    {
      icon: Bell,
      title: 'Recordatorios Automáticos',
      description: 'WhatsApp y SMS automáticos para reducir faltas hasta un 60%.',
      features: [
        '24h y 2h antes de la cita',
        'Recordatorios de vacunas',
        'Confirmación por WhatsApp',
      ],
    },
    {
      icon: Users,
      title: 'Gestión de Horarios',
      description: 'Control completo de horarios del equipo, vacaciones y disponibilidad.',
      features: [
        'Horarios por día de semana',
        'Solicitudes de licencia',
        'Cobertura de turnos',
      ],
    },
  ],
  pacientes: [
    {
      icon: PawPrint,
      title: 'Fichas de Mascotas',
      description: 'Perfil completo con foto, raza, peso, alergias y condiciones especiales.',
      features: [
        'Múltiples mascotas por dueño',
        'Historial de pesos',
        'Alertas de alergias',
      ],
    },
    {
      icon: Stethoscope,
      title: 'Historial Clínico Digital',
      description: 'Consultas, diagnósticos y tratamientos organizados cronológicamente.',
      features: [
        'Búsqueda por fecha o tipo',
        'Archivos adjuntos (radiografías, labs)',
        'Notas privadas del veterinario',
      ],
    },
    {
      icon: Syringe,
      title: 'Carnet de Vacunas',
      description: 'Control de vacunación con alertas de próximas dosis y vencimientos.',
      features: [
        'Calendario de vacunas',
        'PDF descargable',
        'Alertas automáticas',
      ],
    },
    {
      icon: ClipboardList,
      title: 'Recetas Digitales',
      description: 'Genera recetas profesionales con firma digital en segundos.',
      features: [
        'Dosificación automática por peso',
        'Base de medicamentos',
        'Envío por WhatsApp',
      ],
    },
    {
      icon: QrCode,
      title: 'Tags QR de Identificación',
      description: 'Chapitas con QR que muestran datos de contacto si la mascota se pierde.',
      features: [
        'Perfil público configurable',
        'Alertas de escaneo',
        'Sin suscripción para el dueño',
      ],
    },
    {
      icon: Activity,
      title: 'Gráficos de Crecimiento',
      description: 'Seguimiento visual del peso con curvas de referencia por raza.',
      features: [
        'Percentiles por raza',
        'Alertas de peso anormal',
        'Histórico completo',
      ],
    },
  ],
  tienda: [
    {
      icon: ShoppingBag,
      title: 'Tienda Online',
      description: 'Vende alimentos, medicamentos y accesorios directamente desde tu web.',
      features: [
        'Catálogo con fotos',
        'Categorías personalizables',
        'Precios por cliente',
      ],
    },
    {
      icon: Package,
      title: 'Control de Inventario',
      description: 'Stock en tiempo real con alertas de reposición y vencimientos.',
      features: [
        'Alertas de stock bajo',
        'Lotes y vencimientos',
        'Código de barras',
      ],
    },
    {
      icon: CreditCard,
      title: 'Pagos Integrados',
      description: 'Acepta Bancard, Zimple, y transferencias sin complicaciones.',
      features: [
        'Checkout seguro',
        'Cuotas disponibles',
        'Comprobante automático',
      ],
    },
    {
      icon: Receipt,
      title: 'Pedidos Recurrentes',
      description: 'Suscripciones de alimento que generan ingresos predecibles.',
      features: [
        'Frecuencia personalizable',
        'Descuento por suscripción',
        'Gestión de entregas',
      ],
    },
  ],
  facturacion: [
    {
      icon: FileText,
      title: 'Facturación Electrónica SET',
      description: 'Genera facturas legales directamente desde el sistema.',
      features: [
        'Timbrado automático',
        'Envío a SET en tiempo real',
        'PDF y XML descargables',
      ],
    },
    {
      icon: CreditCard,
      title: 'Múltiples Formas de Pago',
      description: 'Efectivo, tarjeta, transferencia, QR, todo en un solo lugar.',
      features: [
        'Pagos parciales',
        'Crédito de clientes',
        'Cierre de caja diario',
      ],
    },
    {
      icon: Receipt,
      title: 'Notas de Crédito',
      description: 'Anulaciones y devoluciones con trazabilidad completa.',
      features: [
        'Vinculado a factura original',
        'Motivo de devolución',
        'Reporte de anulaciones',
      ],
    },
    {
      icon: TrendingUp,
      title: 'Cuentas por Cobrar',
      description: 'Seguimiento de deudas y recordatorios de pago automáticos.',
      features: [
        'Antigüedad de deuda',
        'Recordatorios por WhatsApp',
        'Estado de cuenta por cliente',
      ],
    },
  ],
  reportes: [
    {
      icon: BarChart3,
      title: 'Dashboard en Vivo',
      description: 'Métricas clave de tu clínica en una sola pantalla.',
      features: [
        'Ingresos del día/mes',
        'Citas programadas',
        'Productos más vendidos',
      ],
    },
    {
      icon: PieChart,
      title: 'Análisis de Servicios',
      description: 'Descubre qué servicios generan más ingresos y cuáles crecen.',
      features: [
        'Ingresos por servicio',
        'Tendencias mensuales',
        'Comparativo año a año',
      ],
    },
    {
      icon: Users,
      title: 'Reporte de Clientes',
      description: 'Identifica tus mejores clientes y los que no vuelven.',
      features: [
        'Frecuencia de visitas',
        'Valor de cliente',
        'Clientes inactivos',
      ],
    },
    {
      icon: Activity,
      title: 'Productividad del Equipo',
      description: 'Mide consultas por veterinario y utilización de agenda.',
      features: [
        'Citas por veterinario',
        'Tasa de ocupación',
        'Ingresos generados',
      ],
    },
  ],
}

export default function FuncionalidadesPage() {
  const [activeCategory, setActiveCategory] = useState('agenda')

  return (
    <main className="min-h-screen bg-slate-50">
      <LandingNav />

      <PageHeader
        badge="Plataforma Completa"
        title="Todo lo que necesitas"
        highlight="en un solo lugar."
        description="Desde la agenda hasta la facturación, Vetic tiene todas las herramientas para gestionar tu clínica veterinaria de forma profesional."
      />

      {/* Category Tabs */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeCategory === category.id
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuresByCategory[activeCategory as keyof typeof featuresByCategory].map(
              (feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  features={feature.features}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-teal-600 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center md:px-6">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            ¿Listo para ver Vetic en acción?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-teal-100">
            Agenda una demo personalizada y descubre cómo Vetic puede transformar tu clínica.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-teal-600 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              Ver Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/precios"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 bg-transparent px-8 py-4 text-base font-bold text-white transition-all hover:-translate-y-1 hover:bg-white/10"
            >
              Ver Precios
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
