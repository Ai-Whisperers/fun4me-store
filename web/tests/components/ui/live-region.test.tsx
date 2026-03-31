/**
 * Live Region Component Tests
 *
 * A11Y-003: Tests for screen reader live region component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LiveRegion, AlertLiveRegion, StatusLiveRegion, LoadingLiveRegion } from '../../../components/ui/live-region'

describe('LiveRegion component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with polite aria-live by default', () => {
    render(<LiveRegion message="Test message" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('renders with assertive aria-live when specified', () => {
    render(<LiveRegion message="Urgent message" politeness="assertive" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    const region = screen.getByRole('alert')
    expect(region).toHaveAttribute('aria-live', 'assertive')
  })

  it('renders message content', () => {
    render(<LiveRegion message="Hello screen reader" announceDelay={0} />)

    // With delay 0, content should be there after a small wait
    act(() => {
      vi.advanceTimersByTime(10)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Hello screen reader')
  })

  it('supports children instead of message', () => {
    render(
      <LiveRegion announceDelay={0}>
        <span>Child content</span>
      </LiveRegion>
    )

    act(() => {
      vi.advanceTimersByTime(10)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Child content')
  })

  it('applies aria-atomic attribute', () => {
    render(<LiveRegion message="Test" atomic={true} />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
  })

  it('applies aria-relevant attribute', () => {
    render(<LiveRegion message="Test" relevant="additions text" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveAttribute('aria-relevant', 'additions text')
  })

  it('uses sr-only class when visuallyHidden is true', () => {
    render(<LiveRegion message="Hidden" visuallyHidden={true} />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveClass('sr-only')
  })

  it('does not use sr-only when visuallyHidden is false', () => {
    render(<LiveRegion message="Visible" visuallyHidden={false} />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).not.toHaveClass('sr-only')
  })

  it('applies custom className', () => {
    render(<LiveRegion message="Test" className="custom-class" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveClass('custom-class')
  })

  it('respects custom announceDelay', () => {
    render(<LiveRegion message="Delayed" announceDelay={500} />)

    // Before delay
    expect(screen.getByRole('status')).toHaveTextContent('')

    // After partial delay
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.getByRole('status')).toHaveTextContent('')

    // After full delay
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Delayed')
  })

  it('updates when message changes', () => {
    const { rerender } = render(<LiveRegion message="First" announceDelay={50} />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByRole('status')).toHaveTextContent('First')

    rerender(<LiveRegion message="Second" announceDelay={50} />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Second')
  })
})

describe('AlertLiveRegion component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with assertive aria-live', () => {
    render(<AlertLiveRegion message="Error occurred" />)
    act(() => {
      vi.advanceTimersByTime(100)
    })

    const region = screen.getByRole('alert')
    expect(region).toHaveAttribute('aria-live', 'assertive')
  })

  it('uses alert role', () => {
    render(<AlertLiveRegion message="Critical" />)
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders message content', () => {
    render(<AlertLiveRegion message="Error message" />)
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Error message')
  })
})

describe('StatusLiveRegion component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with polite aria-live', () => {
    render(<StatusLiveRegion message="Status update" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('uses status role', () => {
    render(<StatusLiveRegion message="Update" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders message content', () => {
    render(<StatusLiveRegion message="Success!" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Success!')
  })
})

describe('LoadingLiveRegion component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces loading message when loading', () => {
    render(<LoadingLiveRegion isLoading={true} loadingMessage="Cargando datos..." />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Cargando datos...')
  })

  it('uses default loading message', () => {
    render(<LoadingLiveRegion isLoading={true} />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Cargando...')
  })

  it('announces complete message when done', () => {
    render(
      <LoadingLiveRegion
        isLoading={false}
        loadingMessage="Cargando..."
        completeMessage="Datos cargados"
      />
    )
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Datos cargados')
  })

  it('clears message when done without completeMessage', () => {
    render(<LoadingLiveRegion isLoading={false} />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('transitions from loading to complete', () => {
    const { rerender } = render(
      <LoadingLiveRegion
        isLoading={true}
        loadingMessage="Loading..."
        completeMessage="Done!"
      />
    )
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Loading...')

    rerender(
      <LoadingLiveRegion
        isLoading={false}
        loadingMessage="Loading..."
        completeMessage="Done!"
      />
    )
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Done!')
  })

  it('applies custom className', () => {
    render(<LoadingLiveRegion isLoading={true} className="my-class" />)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByRole('status')).toHaveClass('my-class')
  })
})
