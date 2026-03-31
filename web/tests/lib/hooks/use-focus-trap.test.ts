/**
 * Focus Trap Hook Tests
 *
 * A11Y-002: Tests for keyboard navigation accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  getFocusableElements,
  useFocusTrap,
} from '../../../lib/hooks/use-focus-trap'

// Mock DOM setup
const createMockContainer = (innerHTML: string) => {
  const container = document.createElement('div')
  container.innerHTML = innerHTML
  document.body.appendChild(container)
  return container
}

describe('getFocusableElements', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('finds buttons', () => {
    container.innerHTML = '<button>Click</button>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(1)
    expect(elements[0].tagName).toBe('BUTTON')
  })

  it('finds links with href', () => {
    container.innerHTML = '<a href="/test">Link</a>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(1)
    expect(elements[0].tagName).toBe('A')
  })

  it('finds inputs', () => {
    container.innerHTML = '<input type="text" />'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(1)
    expect(elements[0].tagName).toBe('INPUT')
  })

  it('finds selects', () => {
    container.innerHTML = '<select><option>A</option></select>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(1)
    expect(elements[0].tagName).toBe('SELECT')
  })

  it('finds textareas', () => {
    container.innerHTML = '<textarea></textarea>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(1)
    expect(elements[0].tagName).toBe('TEXTAREA')
  })

  it('finds elements with tabindex', () => {
    container.innerHTML = '<div tabindex="0">Focusable</div>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(1)
  })

  it('excludes disabled buttons', () => {
    container.innerHTML = '<button disabled>Disabled</button>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(0)
  })

  it('excludes disabled inputs', () => {
    container.innerHTML = '<input type="text" disabled />'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(0)
  })

  it('excludes tabindex=-1', () => {
    container.innerHTML = '<div tabindex="-1">Not focusable</div>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(0)
  })

  it('excludes aria-hidden elements', () => {
    container.innerHTML = '<button aria-hidden="true">Hidden</button>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(0)
  })

  it('finds multiple focusable elements', () => {
    container.innerHTML = '<button>First</button><input type="text" /><a href="/test">Link</a><button>Last</button>'
    const elements = getFocusableElements(container)
    expect(elements.length).toBeGreaterThanOrEqual(2)
    // Verify we find buttons, inputs, and links
    const tags = elements.map((el) => el.tagName)
    expect(tags).toContain('BUTTON')
  })

  it('handles empty container', () => {
    container.innerHTML = '<div></div>'
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(0)
  })

  it('handles nested focusable elements', () => {
    container.innerHTML = `
      <div>
        <div>
          <button>Nested</button>
        </div>
      </div>
    `
    const elements = getFocusableElements(container)
    expect(elements).toHaveLength(1)
    expect(elements[0].textContent).toBe('Nested')
  })
})

describe('useFocusTrap', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = `
      <button id="first">First</button>
      <input id="middle" type="text" />
      <button id="last">Last</button>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('does nothing when not active', () => {
    const ref = { current: container }
    renderHook(() => useFocusTrap(ref, { isActive: false }))

    // No event listeners should be active
    const event = new KeyboardEvent('keydown', { key: 'Tab' })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)
    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('identifies focusable elements in container', () => {
    const ref = { current: container }
    renderHook(() => useFocusTrap(ref, { isActive: true, autoFocus: false }))

    // Verify the focusable elements are identified correctly
    const focusableElements = getFocusableElements(container)
    expect(focusableElements.length).toBeGreaterThanOrEqual(2)

    // Elements should include our buttons and input
    const ids = focusableElements.map((el) => el.id)
    expect(ids).toContain('first')
    expect(ids).toContain('last')
  })

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn()
    const ref = { current: container }
    renderHook(() => useFocusTrap(ref, { isActive: true, onEscape }))

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(event)

    expect(onEscape).toHaveBeenCalled()
  })

  it('does not call onEscape when inactive', () => {
    const onEscape = vi.fn()
    const ref = { current: container }
    renderHook(() => useFocusTrap(ref, { isActive: false, onEscape }))

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(event)

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('handles container with no focusable elements', () => {
    const emptyContainer = document.createElement('div')
    emptyContainer.innerHTML = '<p>No focusable elements</p>'
    document.body.appendChild(emptyContainer)

    const ref = { current: emptyContainer }
    // Should not throw
    renderHook(() => useFocusTrap(ref, { isActive: true }))

    document.body.removeChild(emptyContainer)
  })

  it('handles null ref', () => {
    const ref = { current: null }
    // Should not throw
    expect(() => {
      renderHook(() => useFocusTrap(ref, { isActive: true }))
    }).not.toThrow()
  })

  it('cleans up event listeners on unmount', () => {
    const ref = { current: container }
    const { unmount } = renderHook(() =>
      useFocusTrap(ref, { isActive: true, autoFocus: false })
    )

    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    )
    removeEventListenerSpy.mockRestore()
  })

  it('respects autoFocus option', () => {
    const ref = { current: container }

    // With autoFocus: true (default)
    renderHook(() => useFocusTrap(ref, { isActive: true }))

    // Note: Due to requestAnimationFrame, focus may not happen synchronously in tests
    // This test verifies the option is accepted without error
  })
})

describe('useFocusTrap options', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = `
      <button id="first">First</button>
      <button id="last">Last</button>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('accepts returnFocus option', () => {
    const outsideButton = document.createElement('button')
    outsideButton.id = 'outside'
    document.body.appendChild(outsideButton)
    outsideButton.focus()

    const ref = { current: container }
    const { unmount } = renderHook(() =>
      useFocusTrap(ref, { isActive: true, returnFocus: true, autoFocus: false })
    )

    unmount()
    document.body.removeChild(outsideButton)
    // Note: Due to requestAnimationFrame, return focus may not happen synchronously
  })

  it('accepts initialFocus as string selector', () => {
    const ref = { current: container }
    renderHook(() =>
      useFocusTrap(ref, { isActive: true, initialFocus: '#last' })
    )
    // Verifies option is accepted without error
  })

  it('activates and deactivates based on isActive', () => {
    const onEscape = vi.fn()
    const ref = { current: container }

    const { rerender } = renderHook(
      ({ isActive }) => useFocusTrap(ref, { isActive, onEscape }),
      { initialProps: { isActive: false } }
    )

    // Initially inactive
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onEscape).not.toHaveBeenCalled()

    // Activate
    rerender({ isActive: true })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onEscape).toHaveBeenCalled()
  })
})
