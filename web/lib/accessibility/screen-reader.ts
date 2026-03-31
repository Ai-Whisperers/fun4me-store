/**
 * Screen Reader Accessibility Utilities
 *
 * A11Y-003: Screen reader compatibility support
 *
 * This module provides utilities for screen reader compatibility:
 * - Announcements (polite/assertive)
 * - Live region management
 * - ARIA label helpers
 * - Semantic structure helpers
 */

'use client'

/**
 * ARIA live region politeness levels
 */
export type AriaLive = 'off' | 'polite' | 'assertive'

/**
 * Announcement options
 */
export interface AnnouncementOptions {
  /** Politeness level (polite for normal updates, assertive for urgent) */
  politeness?: AriaLive
  /** Clear previous announcements before announcing */
  clearPrevious?: boolean
  /** Delay before announcement (ms) - helps with React state updates */
  delay?: number
}

/**
 * Default announcement options
 */
const DEFAULT_ANNOUNCEMENT_OPTIONS: Required<AnnouncementOptions> = {
  politeness: 'polite',
  clearPrevious: true,
  delay: 100,
}

/**
 * ID for the screen reader announcer element
 */
const ANNOUNCER_ID = 'sr-announcer'

/**
 * Get or create the announcer element
 */
function getAnnouncer(politeness: AriaLive): HTMLElement {
  const id = `${ANNOUNCER_ID}-${politeness}`
  let announcer = document.getElementById(id)

  if (!announcer) {
    announcer = document.createElement('div')
    announcer.id = id
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('aria-live', politeness)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    // Position off-screen but still readable
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
    document.body.appendChild(announcer)
  }

  return announcer
}

/**
 * Announce a message to screen readers
 *
 * @param message - The message to announce
 * @param options - Announcement options
 *
 * @example
 * ```tsx
 * // Polite announcement (default)
 * announce('Cita guardada exitosamente')
 *
 * // Assertive announcement for errors
 * announce('Error: No se pudo guardar', { politeness: 'assertive' })
 *
 * // Immediate announcement
 * announce('Cargando...', { delay: 0 })
 * ```
 */
export function announce(message: string, options: AnnouncementOptions = {}): void {
  if (typeof document === 'undefined') return

  const { politeness, clearPrevious, delay } = {
    ...DEFAULT_ANNOUNCEMENT_OPTIONS,
    ...options,
  }

  const announcer = getAnnouncer(politeness)

  // Clear previous message first to trigger re-read
  if (clearPrevious) {
    announcer.textContent = ''
  }

  // Slight delay ensures screen readers pick up the change
  setTimeout(() => {
    announcer.textContent = message
  }, delay)
}

/**
 * Announce an error message assertively
 *
 * @param message - The error message
 *
 * @example
 * ```tsx
 * announceError('Error al guardar: Campos requeridos incompletos')
 * ```
 */
export function announceError(message: string): void {
  announce(message, { politeness: 'assertive', delay: 50 })
}

/**
 * Announce a success message politely
 *
 * @param message - The success message
 *
 * @example
 * ```tsx
 * announceSuccess('Mascota registrada exitosamente')
 * ```
 */
export function announceSuccess(message: string): void {
  announce(message, { politeness: 'polite' })
}

/**
 * Announce a loading state
 *
 * @param isLoading - Whether loading is in progress
 * @param loadingMessage - Message when loading
 * @param completeMessage - Optional message when complete
 *
 * @example
 * ```tsx
 * announceLoading(isLoading, 'Cargando datos...', 'Datos cargados')
 * ```
 */
export function announceLoading(
  isLoading: boolean,
  loadingMessage: string = 'Cargando...',
  completeMessage?: string
): void {
  if (isLoading) {
    announce(loadingMessage, { delay: 0 })
  } else if (completeMessage) {
    announce(completeMessage)
  }
}

/**
 * Generate a unique ID for accessibility labeling
 *
 * @param prefix - ID prefix
 * @returns Unique ID string
 *
 * @example
 * ```tsx
 * const fieldId = generateA11yId('email-input')
 * // Returns: "email-input-abc123"
 * ```
 */
export function generateA11yId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${random}`
}

/**
 * ARIA role descriptions for common patterns
 */
export const ARIA_ROLES = {
  // Landmarks
  banner: 'Banner de sitio',
  complementary: 'Contenido complementario',
  contentinfo: 'Informacion de contenido',
  form: 'Formulario',
  main: 'Contenido principal',
  navigation: 'Navegacion',
  region: 'Region',
  search: 'Busqueda',

  // Interactive widgets
  alert: 'Alerta',
  alertdialog: 'Dialogo de alerta',
  button: 'Boton',
  checkbox: 'Casilla de verificacion',
  combobox: 'Cuadro combinado',
  dialog: 'Dialogo',
  grid: 'Cuadricula',
  listbox: 'Lista de opciones',
  menu: 'Menu',
  menubar: 'Barra de menu',
  option: 'Opcion',
  progressbar: 'Barra de progreso',
  radio: 'Boton de opcion',
  scrollbar: 'Barra de desplazamiento',
  searchbox: 'Cuadro de busqueda',
  slider: 'Control deslizante',
  spinbutton: 'Boton giratorio',
  status: 'Estado',
  switch: 'Interruptor',
  tab: 'Pestana',
  tablist: 'Lista de pestanas',
  tabpanel: 'Panel de pestana',
  textbox: 'Cuadro de texto',
  timer: 'Temporizador',
  tooltip: 'Sugerencia',
  tree: 'Arbol',
  treegrid: 'Cuadricula de arbol',

  // Structural
  article: 'Articulo',
  cell: 'Celda',
  columnheader: 'Encabezado de columna',
  definition: 'Definicion',
  directory: 'Directorio',
  document: 'Documento',
  feed: 'Feed',
  figure: 'Figura',
  group: 'Grupo',
  heading: 'Encabezado',
  img: 'Imagen',
  list: 'Lista',
  listitem: 'Elemento de lista',
  math: 'Formula matematica',
  note: 'Nota',
  presentation: 'Presentacion',
  row: 'Fila',
  rowgroup: 'Grupo de filas',
  rowheader: 'Encabezado de fila',
  separator: 'Separador',
  table: 'Tabla',
  term: 'Termino',
  toolbar: 'Barra de herramientas',
} as const

/**
 * Common ARIA labels for buttons without visible text
 */
export const ARIA_LABELS = {
  // Navigation
  close: 'Cerrar',
  back: 'Volver',
  next: 'Siguiente',
  previous: 'Anterior',
  menu: 'Menu',
  search: 'Buscar',
  home: 'Inicio',

  // Actions
  edit: 'Editar',
  delete: 'Eliminar',
  save: 'Guardar',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  submit: 'Enviar',
  refresh: 'Actualizar',
  expand: 'Expandir',
  collapse: 'Contraer',
  more: 'Mas opciones',
  download: 'Descargar',
  upload: 'Subir archivo',
  share: 'Compartir',
  copy: 'Copiar',
  print: 'Imprimir',

  // Media
  play: 'Reproducir',
  pause: 'Pausar',
  stop: 'Detener',
  mute: 'Silenciar',
  unmute: 'Activar sonido',
  fullscreen: 'Pantalla completa',
  exitFullscreen: 'Salir de pantalla completa',

  // Notifications
  notification: 'Notificacion',
  notifications: 'Notificaciones',
  clearNotifications: 'Limpiar notificaciones',
  markAsRead: 'Marcar como leido',

  // User
  profile: 'Perfil',
  settings: 'Configuracion',
  logout: 'Cerrar sesion',
  help: 'Ayuda',

  // Data
  filter: 'Filtrar',
  sort: 'Ordenar',
  sortAscending: 'Ordenar ascendente',
  sortDescending: 'Ordenar descendente',
  selectAll: 'Seleccionar todo',
  deselectAll: 'Deseleccionar todo',
  firstPage: 'Primera pagina',
  lastPage: 'Ultima pagina',

  // Loading
  loading: 'Cargando',
} as const

/**
 * Generate descriptive text for data states
 */
export function describeDataState(options: {
  isLoading?: boolean
  isEmpty?: boolean
  hasError?: boolean
  count?: number
  itemName?: string
  itemNamePlural?: string
}): string {
  const { isLoading, isEmpty, hasError, count, itemName = 'elemento', itemNamePlural } = options
  const plural = itemNamePlural || `${itemName}s`

  if (isLoading) {
    return `Cargando ${plural}...`
  }

  if (hasError) {
    return `Error al cargar ${plural}`
  }

  if (isEmpty || count === 0) {
    return `No hay ${plural}`
  }

  if (count !== undefined) {
    return count === 1 ? `1 ${itemName}` : `${count} ${plural}`
  }

  return ''
}

/**
 * Generate accessible label for pagination
 */
export function describePagination(options: {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
}): string {
  const { currentPage, totalPages, totalItems, itemsPerPage } = options

  let description = `Pagina ${currentPage} de ${totalPages}`

  if (totalItems !== undefined && itemsPerPage !== undefined) {
    const start = (currentPage - 1) * itemsPerPage + 1
    const end = Math.min(currentPage * itemsPerPage, totalItems)
    description += `. Mostrando ${start} a ${end} de ${totalItems} elementos`
  }

  return description
}

/**
 * Generate accessible description for sort state
 */
export function describeSortState(options: {
  column: string
  direction: 'asc' | 'desc' | 'none'
}): string {
  const { column, direction } = options

  if (direction === 'none') {
    return `Columna ${column}, no ordenada. Activar para ordenar`
  }

  const directionText = direction === 'asc' ? 'ascendente' : 'descendente'
  return `Columna ${column}, ordenada ${directionText}. Activar para cambiar orden`
}

/**
 * Build aria-describedby string from multiple IDs
 */
export function buildAriaDescribedBy(...ids: (string | undefined | null | false)[]): string | undefined {
  const validIds = ids.filter((id): id is string => Boolean(id))
  return validIds.length > 0 ? validIds.join(' ') : undefined
}

/**
 * Build aria-labelledby string from multiple IDs
 */
export function buildAriaLabelledBy(...ids: (string | undefined | null | false)[]): string | undefined {
  const validIds = ids.filter((id): id is string => Boolean(id))
  return validIds.length > 0 ? validIds.join(' ') : undefined
}
