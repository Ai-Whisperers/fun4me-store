'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

// Error classification based on error message/type
type ErrorType = 'network' | 'server' | 'validation' | 'notFound' | 'unauthorized' | 'unknown'

function classifyError(error?: Error): ErrorType {
  if (!error) return 'unknown'

  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Network errors
  if (
    name === 'typeerror' && message.includes('fetch') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('offline')
  ) {
    return 'network'
  }

  // Server errors (5xx)
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('server error') ||
    message.includes('internal error')
  ) {
    return 'server'
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'validation'
  }

  // Not found
  if (message.includes('404') || message.includes('not found')) {
    return 'notFound'
  }

  // Auth errors
  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('no autorizado')
  ) {
    return 'unauthorized'
  }

  return 'unknown'
}

const errorMessages: Record<ErrorType, { title: string; description: string; icon: typeof AlertTriangle }> = {
  network: {
    title: 'Error de conexión',
    description: 'No pudimos conectarnos al servidor. Verifica tu conexión a internet e intenta de nuevo.',
    icon: WifiOff,
  },
  server: {
    title: 'Error del servidor',
    description: 'Algo salió mal en nuestro servidor. Estamos trabajando para solucionarlo.',
    icon: AlertTriangle,
  },
  validation: {
    title: 'Datos inválidos',
    description: 'Algunos datos ingresados no son válidos. Por favor revisa la información.',
    icon: AlertTriangle,
  },
  notFound: {
    title: 'No encontrado',
    description: 'El recurso que buscas no existe o fue eliminado.',
    icon: AlertTriangle,
  },
  unauthorized: {
    title: 'Acceso denegado',
    description: 'No tienes permiso para acceder a este recurso. Inicia sesión para continuar.',
    icon: AlertTriangle,
  },
  unknown: {
    title: 'Algo salió mal',
    description: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
    icon: AlertTriangle,
  },
}

interface ErrorFallbackProps {
  error?: Error
  reset: () => void
  errorType?: ErrorType
}

/**
 * ErrorFallback - User-friendly error display component
 */
export function ErrorFallback({ error, reset, errorType: forcedType }: ErrorFallbackProps) {
  const errorType = forcedType ?? classifyError(error)
  const { title, description, icon: Icon } = errorMessages[errorType]

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <Icon className="h-8 w-8 text-red-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="max-w-md text-[var(--text-secondary)]">{description}</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recargar página
        </Button>
        <Button onClick={reset}>Intentar de nuevo</Button>
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-6 max-w-lg text-left">
          <summary className="cursor-pointer text-sm text-red-600">
            Detalles del error (desarrollo)
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-red-50 p-3 font-mono text-xs text-red-800">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Whether to show a compact inline error vs full-page */
  compact?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomError />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With error callback
 * <ErrorBoundary onError={(error) => reportToService(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to our logger
    logger.error('ErrorBoundary caught error', {
      message: error.message,
      stack: error.stack?.slice(0, 1000),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    })

    // Capture error in Sentry with context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'component')
      scope.setLevel('error')
      scope.setContext('componentStack', {
        componentStack: errorInfo.componentStack,
      })
      scope.setExtra('errorInfo', errorInfo)
      Sentry.captureException(error)
    })

    // Call optional callback
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          reset={this.reset}
        />
      )
    }

    return this.props.children
  }
}

/**
 * withErrorBoundary - HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

  return ComponentWithErrorBoundary
}

export { classifyError, errorMessages, type ErrorType }
