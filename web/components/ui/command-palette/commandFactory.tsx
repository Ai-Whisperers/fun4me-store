'use client'

import {
  Plus,
  Command,
  Calendar,
  Users,
  FileText,
  Syringe,
  FlaskConical,
  Bed,
  Calculator,
  Stethoscope,
  TrendingUp,
  Heart,
  Baby,
  PawPrint,
  Clock,
  AlertCircle,
  Settings,
  User,
  TestTube,
} from 'lucide-react'
import type { CommandItem, RecentPatient } from './command-types'
import type { RecentItem } from '@/hooks/use-recent-items'

interface CreateCommandsProps {
  navigate: (path: string) => void
  navigateExternal: (href: string) => void
  recentPatients: RecentPatient[]
  localRecentItems: RecentItem[]
}

export function createCommands({
  navigate,
  navigateExternal,
  recentPatients,
  localRecentItems,
}: CreateCommandsProps): CommandItem[] {
  const items: CommandItem[] = [
    // Quick Actions
    {
      id: 'new-appointment',
      title: 'Nueva cita',
      subtitle: 'Agendar una nueva cita',
      icon: <Plus className="h-4 w-4" />,
      action: () => navigate('/dashboard/appointments?action=new'),
      category: 'actions',
      keywords: ['cita', 'agendar', 'appointment', 'nuevo'],
    },
    {
      id: 'new-invoice',
      title: 'Nueva factura',
      subtitle: 'Crear una factura',
      icon: <FileText className="h-4 w-4" />,
      action: () => navigate('/dashboard/invoices?action=new'),
      category: 'actions',
      keywords: ['factura', 'invoice', 'cobrar', 'nuevo'],
    },
    {
      id: 'new-patient',
      title: 'Nuevo paciente',
      subtitle: 'Registrar una mascota',
      icon: <PawPrint className="h-4 w-4" />,
      action: () => navigate('/dashboard/clients?action=new-pet'),
      category: 'actions',
      keywords: ['paciente', 'mascota', 'pet', 'registrar', 'nuevo'],
    },
    {
      id: 'new-vaccine',
      title: 'Registrar vacuna',
      subtitle: 'Agregar registro de vacunación',
      icon: <Syringe className="h-4 w-4" />,
      action: () => navigate('/dashboard/vaccines?action=new'),
      category: 'actions',
      keywords: ['vacuna', 'vaccine', 'inmunización', 'registrar'],
    },

    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Ir al panel principal',
      icon: <Command className="h-4 w-4" />,
      action: () => navigate('/dashboard'),
      category: 'navigation',
      keywords: ['inicio', 'home', 'panel'],
    },
    {
      id: 'nav-calendar',
      title: 'Calendario',
      subtitle: 'Ver agenda completa',
      icon: <Calendar className="h-4 w-4" />,
      action: () => navigate('/dashboard/calendar'),
      category: 'navigation',
      keywords: ['agenda', 'calendario', 'citas', 'horarios'],
    },
    {
      id: 'nav-appointments',
      title: 'Citas de hoy',
      subtitle: 'Ver cola de atención',
      icon: <Clock className="h-4 w-4" />,
      action: () => navigate('/dashboard/appointments'),
      category: 'navigation',
      keywords: ['citas', 'hoy', 'cola', 'atención'],
    },
    {
      id: 'nav-clients',
      title: 'Clientes',
      subtitle: 'Directorio de clientes',
      icon: <Users className="h-4 w-4" />,
      action: () => navigate('/dashboard/clients'),
      category: 'navigation',
      keywords: ['clientes', 'dueños', 'propietarios'],
    },
    {
      id: 'nav-vaccines',
      title: 'Control de vacunas',
      subtitle: 'Vacunas pendientes y vencidas',
      icon: <Syringe className="h-4 w-4" />,
      action: () => navigate('/dashboard/vaccines'),
      category: 'navigation',
      keywords: ['vacunas', 'vencidas', 'pendientes'],
    },
    {
      id: 'nav-hospital',
      title: 'Hospitalización',
      subtitle: 'Pacientes internados',
      icon: <Bed className="h-4 w-4" />,
      action: () => navigate('/dashboard/hospital'),
      category: 'navigation',
      keywords: ['hospital', 'internados', 'kennel'],
    },
    {
      id: 'nav-lab',
      title: 'Laboratorio',
      subtitle: 'Órdenes de laboratorio',
      icon: <FlaskConical className="h-4 w-4" />,
      action: () => navigate('/dashboard/lab'),
      category: 'navigation',
      keywords: ['lab', 'laboratorio', 'análisis', 'resultados'],
    },
    {
      id: 'nav-invoices',
      title: 'Facturas',
      subtitle: 'Facturación y cobros',
      icon: <FileText className="h-4 w-4" />,
      action: () => navigate('/dashboard/invoices'),
      category: 'navigation',
      keywords: ['facturas', 'cobros', 'pagos'],
    },
    {
      id: 'nav-products',
      title: 'Inventario',
      subtitle: 'Productos y stock',
      icon: <Settings className="h-4 w-4" />,
      action: () => navigate('/portal/inventory'),
      category: 'navigation',
      keywords: ['inventario', 'productos', 'stock'],
    },

    // Clinical Tools
    {
      id: 'tool-dosage',
      title: 'Calculadora de dosis',
      subtitle: 'Calcular dosis por peso',
      icon: <Calculator className="h-4 w-4" />,
      action: () => navigate('/drug_dosages'),
      category: 'tools',
      keywords: ['dosis', 'medicamento', 'calcular', 'peso'],
    },
    {
      id: 'tool-diagnosis',
      title: 'Códigos diagnóstico',
      subtitle: 'Buscar VeNom/SNOMED',
      icon: <Stethoscope className="h-4 w-4" />,
      action: () => navigate('/diagnosis_codes'),
      category: 'tools',
      keywords: ['diagnóstico', 'código', 'venom', 'snomed'],
    },
    {
      id: 'tool-growth',
      title: 'Curvas de crecimiento',
      subtitle: 'Estándares por raza',
      icon: <TrendingUp className="h-4 w-4" />,
      action: () => navigate('/growth_charts'),
      category: 'tools',
      keywords: ['crecimiento', 'peso', 'curva', 'raza'],
    },
    {
      id: 'tool-qol',
      title: 'Calidad de vida',
      subtitle: 'Escala HHHHHMM',
      icon: <Heart className="h-4 w-4" />,
      action: () => navigate('/euthanasia_assessments'),
      category: 'tools',
      keywords: ['calidad', 'vida', 'eutanasia', 'evaluación'],
    },
    {
      id: 'tool-reproductive',
      title: 'Ciclos reproductivos',
      subtitle: 'Seguimiento de celo',
      icon: <Baby className="h-4 w-4" />,
      action: () => navigate('/reproductive_cycles'),
      category: 'tools',
      keywords: ['celo', 'reproductivo', 'ciclo', 'gestación'],
    },
    {
      id: 'tool-reactions',
      title: 'Reacciones adversas',
      subtitle: 'Registrar reacciones a vacunas',
      icon: <AlertCircle className="h-4 w-4" />,
      action: () => navigate('/vaccine_reactions'),
      category: 'tools',
      keywords: ['reacción', 'adversa', 'vacuna', 'alergia'],
    },
  ]

  // Add localStorage recent items first (user's personally viewed items)
  localRecentItems.slice(0, 5).forEach((item) => {
    const iconMap: Record<string, React.ReactNode> = {
      patient: <PawPrint className="h-4 w-4" />,
      client: <User className="h-4 w-4" />,
      invoice: <FileText className="h-4 w-4" />,
      appointment: <Calendar className="h-4 w-4" />,
      'lab-order': <TestTube className="h-4 w-4" />,
    }

    items.push({
      id: `local-recent-${item.type}-${item.id}`,
      title: item.title,
      subtitle: item.subtitle,
      icon: iconMap[item.type] || <Clock className="h-4 w-4" />,
      action: () => navigateExternal(item.href),
      category: 'recent',
      keywords: [item.title.toLowerCase(), item.subtitle?.toLowerCase() || ''].filter(Boolean),
    })
  })

  // Add database recent patients if not already in localStorage recent
  const localRecentIds = new Set(
    localRecentItems.filter((i) => i.type === 'patient').map((i) => i.id)
  )

  recentPatients
    .filter((p) => !localRecentIds.has(p.id))
    .slice(0, 3)
    .forEach((patient) => {
      items.push({
        id: `recent-${patient.id}`,
        title: patient.name,
        subtitle: `${patient.species} · ${patient.ownerName}`,
        icon: <PawPrint className="h-4 w-4" />,
        action: () => navigate(`/portal/pets/${patient.id}`),
        category: 'recent',
        keywords: [patient.name.toLowerCase(), patient.ownerName.toLowerCase()],
      })
    })

  return items
}
