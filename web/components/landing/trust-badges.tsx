import { Shield, Lock, Database, Wifi } from 'lucide-react'

const trustItems = [
  {
    icon: Shield,
    title: 'Cumplimiento SET',
    description: 'Facturación electrónica',
  },
  {
    icon: Lock,
    title: 'Datos Encriptados',
    description: 'SSL 256-bit',
  },
  {
    icon: Database,
    title: 'Backup Diario',
    description: 'Tus datos seguros',
  },
  {
    icon: Wifi,
    title: 'Optimizado Tigo/Claro',
    description: 'Carga rápida',
  },
]

export function TrustBadges() {
  return (
    <section className="border-y border-slate-200 bg-white py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {trustItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50">
                <item.icon className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
