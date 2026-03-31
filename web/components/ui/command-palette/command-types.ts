export interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
  category: 'actions' | 'navigation' | 'tools' | 'recent'
  keywords?: string[]
}

export interface RecentPatient {
  id: string
  name: string
  species: string
  ownerName: string
}

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export interface GroupedCommands {
  actions: CommandItem[]
  recent: CommandItem[]
  navigation: CommandItem[]
  tools: CommandItem[]
}

export const CATEGORY_LABELS: Record<string, string> = {
  actions: 'Acciones rápidas',
  recent: 'Pacientes recientes',
  navigation: 'Navegación',
  tools: 'Herramientas clínicas',
}
