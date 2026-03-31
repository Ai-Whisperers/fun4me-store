/**
 * Roving Focus Hook Tests
 *
 * A11Y-002: Tests for keyboard navigation accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useRovingFocus,
  getGroupProps,
} from '../../../lib/hooks/use-roving-focus'

describe('useRovingFocus', () => {
  it('initializes with focusedIndex 0', () => {
    const { result } = renderHook(() => useRovingFocus())
    expect(result.current.focusedIndex).toBe(0)
  })

  it('returns getItemProps function', () => {
    const { result } = renderHook(() => useRovingFocus())
    expect(typeof result.current.getItemProps).toBe('function')
  })

  it('returns focusItem function', () => {
    const { result } = renderHook(() => useRovingFocus())
    expect(typeof result.current.focusItem).toBe('function')
  })

  describe('getItemProps', () => {
    it('returns correct tabIndex for focused item', () => {
      const { result } = renderHook(() => useRovingFocus())
      const props = result.current.getItemProps(0)
      expect(props.tabIndex).toBe(0)
    })

    it('returns tabIndex -1 for non-focused items', () => {
      const { result } = renderHook(() => useRovingFocus())
      const props = result.current.getItemProps(1)
      expect(props.tabIndex).toBe(-1)
    })

    it('returns onKeyDown handler', () => {
      const { result } = renderHook(() => useRovingFocus())
      const props = result.current.getItemProps(0)
      expect(typeof props.onKeyDown).toBe('function')
    })

    it('returns ref function', () => {
      const { result } = renderHook(() => useRovingFocus())
      const props = result.current.getItemProps(0)
      expect(typeof props.ref).toBe('function')
    })

    it('returns aria-selected', () => {
      const { result } = renderHook(() => useRovingFocus())
      const props = result.current.getItemProps(0)
      expect(props['aria-selected']).toBe(true)
    })
  })

  describe('horizontal navigation', () => {
    it('moves focus right on ArrowRight', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'horizontal' })
      )

      // Register mock items
      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      // Simulate ArrowRight
      const props = result.current.getItemProps(0)
      act(() => {
        props.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(1)
    })

    it('moves focus left on ArrowLeft', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'horizontal' })
      )

      // Set initial focus to index 1
      act(() => {
        result.current.setFocusedIndex(1)
      })

      // Register mock items
      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      // Simulate ArrowLeft
      const props = result.current.getItemProps(1)
      act(() => {
        props.onKeyDown({
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(0)
    })

    it('ignores ArrowUp in horizontal mode', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'horizontal' })
      )

      const items = [
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(0)
      const preventDefault = vi.fn()
      act(() => {
        props.onKeyDown({
          key: 'ArrowUp',
          preventDefault,
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(0)
      expect(preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('vertical navigation', () => {
    it('moves focus down on ArrowDown', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'vertical' })
      )

      const items = [
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(0)
      act(() => {
        props.onKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(1)
    })

    it('moves focus up on ArrowUp', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'vertical' })
      )

      act(() => {
        result.current.setFocusedIndex(1)
      })

      const items = [
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(1)
      act(() => {
        props.onKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(0)
    })

    it('ignores ArrowRight in vertical mode', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'vertical' })
      )

      const items = [
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(0)
      const preventDefault = vi.fn()
      act(() => {
        props.onKeyDown({
          key: 'ArrowRight',
          preventDefault,
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(0)
      expect(preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('both directions', () => {
    it('handles all arrow keys', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'both' })
      )

      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      // Test ArrowRight
      const props0 = result.current.getItemProps(0)
      act(() => {
        props0.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })
      expect(result.current.focusedIndex).toBe(1)

      // Test ArrowDown
      const props1 = result.current.getItemProps(1)
      act(() => {
        props1.onKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })
      expect(result.current.focusedIndex).toBe(2)
    })
  })

  describe('looping', () => {
    it('wraps from last to first with loop enabled', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'horizontal', loop: true })
      )

      act(() => {
        result.current.setFocusedIndex(2)
      })

      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(2)
      act(() => {
        props.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(0)
    })

    it('wraps from first to last with loop enabled', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'horizontal', loop: true })
      )

      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(0)
      act(() => {
        props.onKeyDown({
          key: 'ArrowLeft',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(2)
    })

    it('stops at boundaries with loop disabled', () => {
      const { result } = renderHook(() =>
        useRovingFocus({ direction: 'horizontal', loop: false })
      )

      act(() => {
        result.current.setFocusedIndex(2)
      })

      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(2)
      act(() => {
        props.onKeyDown({
          key: 'ArrowRight',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(2)
    })
  })

  describe('Home and End keys', () => {
    it('moves to first item on Home', () => {
      const { result } = renderHook(() => useRovingFocus())

      act(() => {
        result.current.setFocusedIndex(2)
      })

      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(2)
      act(() => {
        props.onKeyDown({
          key: 'Home',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(0)
    })

    it('moves to last item on End', () => {
      const { result } = renderHook(() => useRovingFocus())

      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      const props = result.current.getItemProps(0)
      act(() => {
        props.onKeyDown({
          key: 'End',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent)
      })

      expect(result.current.focusedIndex).toBe(2)
    })
  })

  describe('focusItem', () => {
    it('can set focus to specific index', () => {
      const { result } = renderHook(() => useRovingFocus())

      const items = [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ]
      items.forEach((item, index) => {
        item.focus = vi.fn()
        result.current.registerItem(item, index)
      })

      act(() => {
        result.current.focusItem(2)
      })

      expect(result.current.focusedIndex).toBe(2)
    })
  })
})

describe('getGroupProps', () => {
  it('returns horizontal orientation by default', () => {
    const props = getGroupProps()
    expect(props.role).toBe('group')
    expect(props['aria-orientation']).toBe('horizontal')
  })

  it('returns vertical orientation when specified', () => {
    const props = getGroupProps('vertical')
    expect(props.role).toBe('group')
    expect(props['aria-orientation']).toBe('vertical')
  })
})
