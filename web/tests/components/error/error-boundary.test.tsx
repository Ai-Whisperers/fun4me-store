import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ErrorBoundary, ErrorFallback, classifyError, withErrorBoundary, errorMessages } from '@/components/error/error-boundary'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  }
}))

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}))

// Component that throws an error for testing
function ThrowError({ shouldThrow = true, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div>Success</div>
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  // Mock console.error to avoid test noise
  vi.spyOn(console, 'error').mockImplementation(() => {})
  
  // Mock Sentry scope methods
  const mockScope = {
    setTag: vi.fn(),
    setLevel: vi.fn(),
    setContext: vi.fn(),
    setExtra: vi.fn(),
  }
  vi.mocked(Sentry.withScope).mockImplementation((callback) => callback(mockScope as any))
  vi.mocked(Sentry.captureException).mockImplementation(vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorFallback', () => {
  it('renders default error fallback with unknown error type', () => {
    const mockReset = vi.fn()
    render(<ErrorFallback reset={mockReset} />)
    
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('Ocurrió un error inesperado. Por favor intenta de nuevo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recargar página/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /intentar de nuevo/i })).toBeInTheDocument()
  })

  it('renders specific error type messages', () => {
    const mockReset = vi.fn()
    render(<ErrorFallback reset={mockReset} errorType="network" />)
    
    expect(screen.getByText('Error de conexión')).toBeInTheDocument()
    expect(screen.getByText(/no pudimos conectarnos al servidor/i)).toBeInTheDocument()
  })

  it('calls reset function when retry button is clicked', () => {
    const mockReset = vi.fn()
    render(<ErrorFallback reset={mockReset} />)
    
    fireEvent.click(screen.getByRole('button', { name: /intentar de nuevo/i }))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('reloads page when reload button is clicked', () => {
    // Mock window.location.reload
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    const mockReset = vi.fn()
    render(<ErrorFallback reset={mockReset} />)
    
    fireEvent.click(screen.getByRole('button', { name: /recargar página/i }))
    expect(mockReload).toHaveBeenCalledTimes(1)
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    const error = new Error('Test error with stack')
    error.stack = 'Error: Test error with stack\n    at test.js:1:1'
    
    const mockReset = vi.fn()
    render(<ErrorFallback error={error} reset={mockReset} />)
    
    expect(screen.getByText(/detalles del error/i)).toBeInTheDocument()
    
    // Click to expand details
    fireEvent.click(screen.getByText(/detalles del error/i))
    expect(screen.getByText(/test error with stack/i)).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })

  it('does not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const error = new Error('Test error')
    const mockReset = vi.fn()
    render(<ErrorFallback error={error} reset={mockReset} />)
    
    expect(screen.queryByText(/detalles del error/i)).not.toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })
})

describe('classifyError', () => {
  it('classifies network errors correctly', () => {
    expect(classifyError(new Error('Failed to fetch'))).toBe('network')
    expect(classifyError(new Error('Network request failed'))).toBe('network')
    expect(classifyError(new TypeError('fetch failed'))).toBe('network')
    expect(classifyError(new Error('offline'))).toBe('network')
  })

  it('classifies server errors correctly', () => {
    expect(classifyError(new Error('500 server error'))).toBe('server')
    expect(classifyError(new Error('502 Bad Gateway'))).toBe('server')
    expect(classifyError(new Error('Internal server error'))).toBe('server')
  })

  it('classifies validation errors correctly', () => {
    expect(classifyError(new Error('Validation failed'))).toBe('validation')
    expect(classifyError(new Error('Invalid input'))).toBe('validation')
    expect(classifyError(new Error('Required field missing'))).toBe('validation')
  })

  it('classifies not found errors correctly', () => {
    expect(classifyError(new Error('404 not found'))).toBe('notFound')
    expect(classifyError(new Error('Resource not found'))).toBe('notFound')
  })

  it('classifies unauthorized errors correctly', () => {
    expect(classifyError(new Error('401 Unauthorized'))).toBe('unauthorized')
    expect(classifyError(new Error('403 Forbidden'))).toBe('unauthorized')
    expect(classifyError(new Error('No autorizado'))).toBe('unauthorized')
  })

  it('returns unknown for unrecognized errors', () => {
    expect(classifyError(new Error('Some random error'))).toBe('unknown')
    expect(classifyError()).toBe('unknown')
  })

  it('handles case insensitive matching', () => {
    expect(classifyError(new Error('NETWORK ERROR'))).toBe('network')
    expect(classifyError(new Error('Server Error'))).toBe('server')
  })
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('catches errors and renders error fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Component error" />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error message</div>
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const mockOnError = vi.fn()
    
    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowError shouldThrow={true} errorMessage="Test error" />
      </ErrorBoundary>
    )
    
    expect(mockOnError).toHaveBeenCalledTimes(1)
    const [error, errorInfo] = mockOnError.mock.calls[0]
    expect(error.message).toBe('Test error')
    expect(errorInfo).toHaveProperty('componentStack')
  })

  it('logs error to logger and Sentry', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Log test error" />
      </ErrorBoundary>
    )
    
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith('ErrorBoundary caught error', expect.objectContaining({
      message: 'Log test error',
      stack: expect.any(String),
      componentStack: expect.any(String),
    }))
    
    expect(vi.mocked(Sentry.withScope)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(expect.any(Error))
  })

  it('resets error state when reset is called', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Error state - should show error fallback
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    
    // Click reset button
    fireEvent.click(screen.getByRole('button', { name: /intentar de nuevo/i }))
    
    // Should attempt to render children again (which will throw again, but that's the behavior)
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
  })

  it('truncates long stack traces in logs', () => {
    const error = new Error('Test error')
    // Create a very long stack trace
    error.stack = 'x'.repeat(2000)
    
    const ThrowLongStackError = () => {
      throw error
    }
    
    render(
      <ErrorBoundary>
        <ThrowLongStackError />
      </ErrorBoundary>
    )
    
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith('ErrorBoundary caught error', expect.objectContaining({
      stack: expect.stringMatching(/^x{1000}$/), // Should be truncated to 1000 chars
    }))
  })
})

describe('withErrorBoundary HOC', () => {
  function TestComponent({ title = 'Test Component' }: { title?: string }) {
    return <div>{title}</div>
  }

  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    
    render(<WrappedComponent title="Wrapped test" />)
    expect(screen.getByText('Wrapped test')).toBeInTheDocument()
  })

  it('catches errors in wrapped component', () => {
    function ErrorComponent() {
      throw new Error('HOC test error')
    }
    
    const WrappedErrorComponent = withErrorBoundary(ErrorComponent)
    
    render(<WrappedErrorComponent />)
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
  })

  it('passes error boundary props to HOC', () => {
    const customFallback = <div>Custom HOC fallback</div>
    const mockOnError = vi.fn()
    
    function ErrorComponent() {
      throw new Error('HOC props test')
    }
    
    const WrappedErrorComponent = withErrorBoundary(ErrorComponent, {
      fallback: customFallback,
      onError: mockOnError,
    })
    
    render(<WrappedErrorComponent />)
    expect(screen.getByText('Custom HOC fallback')).toBeInTheDocument()
    expect(mockOnError).toHaveBeenCalledTimes(1)
  })

  it('sets correct display name for wrapped component', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
  })

  it('handles components without display name', () => {
    const AnonymousComponent = () => <div>Anonymous</div>
    const WrappedComponent = withErrorBoundary(AnonymousComponent)
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(AnonymousComponent)')
  })
})

describe('errorMessages configuration', () => {
  it('has messages for all error types', () => {
    const errorTypes: Array<keyof typeof errorMessages> = [
      'network',
      'server',
      'validation',
      'notFound',
      'unauthorized',
      'unknown',
    ]
    
    errorTypes.forEach(type => {
      expect(errorMessages[type]).toBeDefined()
      expect(errorMessages[type].title).toBeDefined()
      expect(errorMessages[type].description).toBeDefined()
      expect(errorMessages[type].icon).toBeDefined()
    })
  })

  it('has Spanish language messages', () => {
    expect(errorMessages.network.title).toBe('Error de conexión')
    expect(errorMessages.server.title).toBe('Error del servidor')
    expect(errorMessages.unauthorized.description).toContain('No tienes permiso')
  })
})