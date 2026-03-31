import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Settings,
  Building2,
  Palette,
  ToggleRight,
  DollarSign,
  ArrowLeft,
  Bell,
  Gift,
  Receipt,
} from 'lucide-react'

interface SettingsLayoutProps {
  children: React.ReactNode
  params: Promise<{ clinic: string }>
}

const settingsNav = [
  {
    href: 'general',
    label: 'General',
    icon: Building2,
    description: 'Nombre, contacto, horarios',
  },
  {
    href: 'branding',
    label: 'Marca',
    icon: Palette,
    description: 'Logo, colores, tema',
  },
  {
    href: 'modules',
    label: 'Módulos',
    icon: ToggleRight,
    description: 'Activar/desactivar funciones',
  },
  {
    href: 'services',
    label: 'Servicios y Precios',
    icon: DollarSign,
    description: 'Catálogo de servicios',
  },
  {
    href: 'alerts',
    label: 'Alertas de Inventario',
    icon: Bell,
    description: 'Notificaciones de stock',
  },
  {
    href: 'referrals',
    label: 'Programa de Referidos',
    icon: Gift,
    description: 'Comparte y gana descuentos',
  },
  {
    href: 'billing',
    label: 'Facturación',
    icon: Receipt,
    description: 'Comisiones y pagos',
  },
]

export default async function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps): Promise<React.ReactElement> {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  // Check admin role
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  // Only admins of this clinic can access settings
  if (!profile || profile.role !== 'admin' || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/dashboard`)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${clinic}/dashboard`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <Settings className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configuración</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Administra la configuración de {clinicData.config.name}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Navigation + Content */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Settings Sidebar */}
        <nav className="flex-shrink-0 lg:w-64">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {settingsNav.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={`/${clinic}/dashboard/settings/${item.href}`}
                  className="group flex items-start gap-3 border-b border-gray-50 p-4 transition-colors last:border-b-0 hover:bg-gray-50"
                >
                  <div className="rounded-lg bg-gray-100 p-2 transition-colors group-hover:bg-[var(--primary)] group-hover:bg-opacity-10">
                    <Icon className="h-4 w-4 text-gray-500 group-hover:text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-[var(--primary)]">
                      {item.label}
                    </p>
                    <p className="truncate text-xs text-gray-500">{item.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
