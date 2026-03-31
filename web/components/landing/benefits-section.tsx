'use client'

import {
  Building2,
  PawPrint,
  DollarSign,
  Clock,
  Shield,
  Zap,
  HeartHandshake,
  Smartphone,
  Bell,
  Star,
  QrCode,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  Award,
  Heart,
} from 'lucide-react'

const clinicBenefits = [
  {
    icon: TrendingUp,
    title: 'Mas Clientes Nuevos',
    description:
      'Aparece en Google cuando busquen "veterinaria cerca de mi". El 90% busca online antes de elegir.',
    highlight: '+30% consultas',
  },
  {
    icon: Clock,
    title: 'Ahorra Horas',
    description:
      'El sistema recibe reservas 24/7 mientras vos atendes pacientes. Basta de llamadas.',
    highlight: '5h/semana',
  },
  {
    icon: DollarSign,
    title: 'Precio Accesible',
    description:
      'Una fraccion del costo de un sitio desde cero. Se paga con 2-3 clientes nuevos al mes.',
    highlight: '90% menos',
  },
  {
    icon: Shield,
    title: 'Cero Tecnicismos',
    description:
      'Hosting, SSL, backups, actualizaciones, seguridad... Todo resuelto. Vos solo atendes animales.',
    highlight: 'Todo incluido',
  },
  {
    icon: Award,
    title: 'Imagen Profesional',
    description: 'Competi de igual a igual con las grandes cadenas. Tu clinica se ve profesional.',
    highlight: 'Primer nivel',
  },
  {
    icon: Zap,
    title: 'Online Rapido',
    description: 'No esperes meses. En una semana ya estas recibiendo clientes online.',
    highlight: '3-7 dias',
  },
]

const ownerBenefits = [
  {
    icon: Smartphone,
    title: 'Todo en tu Celular',
    description:
      'Historial medico, vacunas, recetas, facturas. Toda la info de tu mascota, accesible 24/7.',
    highlight: 'Siempre accesible',
  },
  {
    icon: Bell,
    title: 'Recordatorios',
    description:
      'Te avisamos por WhatsApp cuando se acerca la fecha de vacunacion. Mascota siempre protegida.',
    highlight: 'Automaticos',
  },
  {
    icon: Calendar,
    title: 'Agenda Sin Llamar',
    description: 'Elegi fecha, hora y veterinario desde el celular. Confirmacion instantanea.',
    highlight: 'Online 24/7',
  },
  {
    icon: QrCode,
    title: 'Tag de Identificacion',
    description: 'Tag QR unico. Si alguien encuentra tu mascota, escanea el codigo y te contacta.',
    highlight: 'Anti-perdida',
  },
  {
    icon: FileText,
    title: 'Documentos Digitales',
    description: 'Todas las recetas y facturas en tu celular. Todo listo para el seguro.',
    highlight: 'Organizados',
  },
  {
    icon: Star,
    title: 'Puntos de Lealtad',
    description: 'Acumula puntos en cada consulta y compra. Canjealos por descuentos.',
    highlight: 'Recompensas',
  },
]

export function BenefitsSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-dark)] py-16 md:py-24">
      {/* Decorative elements */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-10 text-center md:mb-14">
          <div className="bg-[var(--primary)]/10 border-[var(--primary)]/20 mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2">
            <Heart className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-sm font-bold text-[var(--primary)]">Beneficios</span>
          </div>
          <h2 className="mb-4 text-2xl font-black text-white sm:text-3xl md:mb-6 md:text-4xl lg:text-5xl">
            Todos ganan con Vetic
          </h2>
          <p className="mx-auto max-w-xl text-sm text-white/60 md:text-base lg:text-lg">
            No es solo un sitio web. Es una herramienta que genera resultados medibles.
          </p>
        </div>

        {/* Two-column benefits */}
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
          {/* For Clinics */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="shadow-[var(--primary)]/20 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-lg md:h-12 md:w-12">
                <Building2 className="h-5 w-5 text-[var(--bg-dark)] md:h-6 md:w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white md:text-xl">Para tu Clinica</h3>
                <p className="text-xs text-white/50 md:text-sm">
                  Crece y profesionaliza tu negocio
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {clinicBenefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="hover:border-[var(--primary)]/30 group flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.05]"
                >
                  <div className="bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:h-10 md:w-10">
                    <benefit.icon className="h-4 w-4 text-[var(--primary)] md:h-5 md:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white md:text-base">{benefit.title}</h4>
                      <span className="bg-[var(--primary)]/10 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium text-[var(--primary)] md:text-xs">
                        {benefit.highlight}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-white/50 md:text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For Pet Owners */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="shadow-[var(--secondary)]/20 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--secondary)] to-[var(--accent)] shadow-lg md:h-12 md:w-12">
                <PawPrint className="h-5 w-5 text-white md:h-6 md:w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white md:text-xl">Para los Dueños</h3>
                <p className="text-xs text-white/50 md:text-sm">Mejor cuidado para sus mascotas</p>
              </div>
            </div>

            <div className="space-y-3">
              {ownerBenefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="hover:border-[var(--secondary)]/30 group flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.05]"
                >
                  <div className="bg-[var(--secondary)]/10 group-hover:bg-[var(--secondary)]/20 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:h-10 md:w-10">
                    <benefit.icon className="h-4 w-4 text-[var(--secondary)] md:h-5 md:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white md:text-base">{benefit.title}</h4>
                      <span className="bg-[var(--secondary)]/10 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium text-[var(--secondary)] md:text-xs">
                        {benefit.highlight}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-white/50 md:text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom callout */}
        <div className="mt-10 text-center md:mt-14">
          <div className="from-[var(--primary)]/10 to-[var(--secondary)]/10 inline-flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r px-6 py-5 sm:flex-row sm:gap-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[var(--primary)]" />
              <div className="text-left">
                <p className="text-sm font-bold text-white">Clinicas mas eficientes</p>
                <p className="text-xs text-white/50">Menos admin, mas medicina</p>
              </div>
            </div>
            <div className="hidden h-10 w-px bg-white/10 sm:block" />
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-5 w-5 text-[var(--secondary)]" />
              <div className="text-left">
                <p className="text-sm font-bold text-white">Mascotas mejor cuidadas</p>
                <p className="text-xs text-white/50">Dueños mas informados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
