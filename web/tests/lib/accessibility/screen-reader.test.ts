/**
 * Screen Reader Utilities Tests
 *
 * A11Y-003: Tests for screen reader compatibility utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  announce,
  announceError,
  announceSuccess,
  announceLoading,
  generateA11yId,
  ARIA_ROLES,
  ARIA_LABELS,
  describeDataState,
  describePagination,
  describeSortState,
  buildAriaDescribedBy,
  buildAriaLabelledBy,
} from '../../../lib/accessibility/screen-reader'

describe('announce function', () => {
  beforeEach(() => {
    // Clear any existing announcers
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('creates a polite announcer element', () => {
    announce('Test message')
    vi.advanceTimersByTime(200)

    const announcer = document.getElementById('sr-announcer-polite')
    expect(announcer).toBeTruthy()
    expect(announcer?.getAttribute('aria-live')).toBe('polite')
    expect(announcer?.getAttribute('role')).toBe('status')
    expect(announcer?.getAttribute('aria-atomic')).toBe('true')
  })

  it('creates an assertive announcer element', () => {
    announce('Urgent message', { politeness: 'assertive' })
    vi.advanceTimersByTime(200)

    const announcer = document.getElementById('sr-announcer-assertive')
    expect(announcer).toBeTruthy()
    expect(announcer?.getAttribute('aria-live')).toBe('assertive')
  })

  it('sets message content after delay', () => {
    announce('Delayed message')

    // Before delay
    const announcerBefore = document.getElementById('sr-announcer-polite')
    expect(announcerBefore?.textContent).toBe('')

    // After delay
    vi.advanceTimersByTime(150)
    const announcerAfter = document.getElementById('sr-announcer-polite')
    expect(announcerAfter?.textContent).toBe('Delayed message')
  })

  it('respects custom delay option', () => {
    announce('Custom delay', { delay: 500 })

    vi.advanceTimersByTime(100)
    const announcerBefore = document.getElementById('sr-announcer-polite')
    expect(announcerBefore?.textContent).toBe('')

    vi.advanceTimersByTime(500)
    expect(announcerBefore?.textContent).toBe('Custom delay')
  })

  it('clears previous message when clearPrevious is true', () => {
    announce('First message')
    vi.advanceTimersByTime(150)

    announce('Second message', { clearPrevious: true })
    const announcer = document.getElementById('sr-announcer-polite')
    expect(announcer?.textContent).toBe('')

    vi.advanceTimersByTime(150)
    expect(announcer?.textContent).toBe('Second message')
  })

  it('reuses existing announcer elements', () => {
    announce('Message 1')
    vi.advanceTimersByTime(150)

    announce('Message 2')
    vi.advanceTimersByTime(150)

    const announcers = document.querySelectorAll('[id^="sr-announcer-polite"]')
    expect(announcers.length).toBe(1)
  })
})

describe('announceError function', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('uses assertive politeness', () => {
    announceError('Error message')
    vi.advanceTimersByTime(100)

    const announcer = document.getElementById('sr-announcer-assertive')
    expect(announcer).toBeTruthy()
    expect(announcer?.textContent).toBe('Error message')
  })

  it('uses shorter delay for errors', () => {
    announceError('Quick error')
    vi.advanceTimersByTime(60)

    const announcer = document.getElementById('sr-announcer-assertive')
    expect(announcer?.textContent).toBe('Quick error')
  })
})

describe('announceSuccess function', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('uses polite politeness', () => {
    announceSuccess('Success message')
    vi.advanceTimersByTime(150)

    const announcer = document.getElementById('sr-announcer-polite')
    expect(announcer).toBeTruthy()
    expect(announcer?.textContent).toBe('Success message')
  })
})

describe('announceLoading function', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('announces loading message when loading', () => {
    announceLoading(true, 'Cargando datos...')
    vi.advanceTimersByTime(50)

    const announcer = document.getElementById('sr-announcer-polite')
    expect(announcer?.textContent).toBe('Cargando datos...')
  })

  it('announces complete message when done', () => {
    announceLoading(false, 'Cargando...', 'Datos cargados')
    vi.advanceTimersByTime(150)

    const announcer = document.getElementById('sr-announcer-polite')
    expect(announcer?.textContent).toBe('Datos cargados')
  })

  it('uses default loading message', () => {
    announceLoading(true)
    vi.advanceTimersByTime(50)

    const announcer = document.getElementById('sr-announcer-polite')
    expect(announcer?.textContent).toBe('Cargando...')
  })
})

describe('generateA11yId function', () => {
  it('generates unique IDs with prefix', () => {
    const id1 = generateA11yId('test')
    const id2 = generateA11yId('test')

    expect(id1).toMatch(/^test-[a-z0-9]+$/)
    expect(id2).toMatch(/^test-[a-z0-9]+$/)
    expect(id1).not.toBe(id2)
  })

  it('uses provided prefix', () => {
    const id = generateA11yId('my-prefix')
    expect(id.startsWith('my-prefix-')).toBe(true)
  })
})

describe('ARIA_ROLES constant', () => {
  it('contains landmark roles', () => {
    expect(ARIA_ROLES.banner).toBeDefined()
    expect(ARIA_ROLES.navigation).toBeDefined()
    expect(ARIA_ROLES.main).toBeDefined()
    expect(ARIA_ROLES.search).toBeDefined()
  })

  it('contains widget roles', () => {
    expect(ARIA_ROLES.button).toBeDefined()
    expect(ARIA_ROLES.dialog).toBeDefined()
    expect(ARIA_ROLES.menu).toBeDefined()
    expect(ARIA_ROLES.tab).toBeDefined()
  })

  it('contains structural roles', () => {
    expect(ARIA_ROLES.table).toBeDefined()
    expect(ARIA_ROLES.row).toBeDefined()
    expect(ARIA_ROLES.cell).toBeDefined()
    expect(ARIA_ROLES.list).toBeDefined()
  })

  it('has Spanish descriptions', () => {
    expect(ARIA_ROLES.button).toBe('Boton')
    expect(ARIA_ROLES.navigation).toBe('Navegacion')
    expect(ARIA_ROLES.search).toBe('Busqueda')
  })
})

describe('ARIA_LABELS constant', () => {
  it('contains navigation labels', () => {
    expect(ARIA_LABELS.close).toBe('Cerrar')
    expect(ARIA_LABELS.back).toBe('Volver')
    expect(ARIA_LABELS.next).toBe('Siguiente')
    expect(ARIA_LABELS.previous).toBe('Anterior')
  })

  it('contains action labels', () => {
    expect(ARIA_LABELS.edit).toBe('Editar')
    expect(ARIA_LABELS.delete).toBe('Eliminar')
    expect(ARIA_LABELS.save).toBe('Guardar')
    expect(ARIA_LABELS.cancel).toBe('Cancelar')
  })

  it('contains media labels', () => {
    expect(ARIA_LABELS.play).toBe('Reproducir')
    expect(ARIA_LABELS.pause).toBe('Pausar')
    expect(ARIA_LABELS.mute).toBe('Silenciar')
  })

  it('contains pagination labels', () => {
    expect(ARIA_LABELS.firstPage).toBe('Primera pagina')
    expect(ARIA_LABELS.lastPage).toBe('Ultima pagina')
  })
})

describe('describeDataState function', () => {
  it('describes loading state', () => {
    const result = describeDataState({ isLoading: true })
    expect(result).toBe('Cargando elementos...')
  })

  it('describes loading state with custom item name', () => {
    const result = describeDataState({ isLoading: true, itemName: 'mascota', itemNamePlural: 'mascotas' })
    expect(result).toBe('Cargando mascotas...')
  })

  it('describes error state', () => {
    const result = describeDataState({ hasError: true })
    expect(result).toBe('Error al cargar elementos')
  })

  it('describes empty state', () => {
    const result = describeDataState({ isEmpty: true })
    expect(result).toBe('No hay elementos')
  })

  it('describes empty state with count', () => {
    const result = describeDataState({ count: 0 })
    expect(result).toBe('No hay elementos')
  })

  it('describes single item', () => {
    const result = describeDataState({ count: 1, itemName: 'mascota' })
    expect(result).toBe('1 mascota')
  })

  it('describes multiple items', () => {
    const result = describeDataState({ count: 5, itemName: 'mascota', itemNamePlural: 'mascotas' })
    expect(result).toBe('5 mascotas')
  })

  it('auto-pluralizes item name', () => {
    const result = describeDataState({ count: 3, itemName: 'producto' })
    expect(result).toBe('3 productos')
  })
})

describe('describePagination function', () => {
  it('describes basic pagination', () => {
    const result = describePagination({ currentPage: 2, totalPages: 5 })
    expect(result).toBe('Pagina 2 de 5')
  })

  it('describes pagination with item counts', () => {
    const result = describePagination({
      currentPage: 2,
      totalPages: 5,
      totalItems: 50,
      itemsPerPage: 10,
    })
    expect(result).toBe('Pagina 2 de 5. Mostrando 11 a 20 de 50 elementos')
  })

  it('handles last page correctly', () => {
    const result = describePagination({
      currentPage: 5,
      totalPages: 5,
      totalItems: 47,
      itemsPerPage: 10,
    })
    expect(result).toBe('Pagina 5 de 5. Mostrando 41 a 47 de 47 elementos')
  })

  it('handles first page', () => {
    const result = describePagination({
      currentPage: 1,
      totalPages: 3,
      totalItems: 25,
      itemsPerPage: 10,
    })
    expect(result).toBe('Pagina 1 de 3. Mostrando 1 a 10 de 25 elementos')
  })
})

describe('describeSortState function', () => {
  it('describes unsorted state', () => {
    const result = describeSortState({ column: 'Nombre', direction: 'none' })
    expect(result).toBe('Columna Nombre, no ordenada. Activar para ordenar')
  })

  it('describes ascending sort', () => {
    const result = describeSortState({ column: 'Fecha', direction: 'asc' })
    expect(result).toBe('Columna Fecha, ordenada ascendente. Activar para cambiar orden')
  })

  it('describes descending sort', () => {
    const result = describeSortState({ column: 'Precio', direction: 'desc' })
    expect(result).toBe('Columna Precio, ordenada descendente. Activar para cambiar orden')
  })
})

describe('buildAriaDescribedBy function', () => {
  it('joins valid IDs', () => {
    const result = buildAriaDescribedBy('id1', 'id2', 'id3')
    expect(result).toBe('id1 id2 id3')
  })

  it('filters out falsy values', () => {
    const result = buildAriaDescribedBy('id1', undefined, null, false, 'id2')
    expect(result).toBe('id1 id2')
  })

  it('returns undefined for all falsy', () => {
    const result = buildAriaDescribedBy(undefined, null, false)
    expect(result).toBeUndefined()
  })

  it('returns undefined for empty call', () => {
    const result = buildAriaDescribedBy()
    expect(result).toBeUndefined()
  })
})

describe('buildAriaLabelledBy function', () => {
  it('joins valid IDs', () => {
    const result = buildAriaLabelledBy('title-id', 'desc-id')
    expect(result).toBe('title-id desc-id')
  })

  it('filters out falsy values', () => {
    const result = buildAriaLabelledBy('id1', undefined, 'id2', null)
    expect(result).toBe('id1 id2')
  })

  it('returns undefined for all falsy', () => {
    const result = buildAriaLabelledBy(undefined, false)
    expect(result).toBeUndefined()
  })
})
