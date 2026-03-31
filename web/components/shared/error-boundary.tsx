import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showHomeLink?: boolean
  showRefreshButton?: boolean
  /** Context identifier for logging (e.g., "CartProvider", "BookingWizard") */
  context?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture in Sentry with context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'component')
      scope.setTag('context', this.props.context || 'unknown')
      scope.setExtra('componentStack', errorInfo.componentStack)
      Sentry.captureException(error)
    })

    // Log with structured logger
    logger.error('Component error caught by ErrorBoundary', {
      error: error.message,
      context: this.props.context,
      componentStack: errorInfo.componentStack?.slice(0, 500), // Limit stack size
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-error-bg)]">
            <AlertTriangle className="h-8 w-8 text-[var(--status-error)]" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Algo salió mal</h2>
            <p className="max-w-md text-[var(--text-secondary)]">
              Ocurrió un error inesperado. Por favor intenta de nuevo.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-[var(--status-error)]">
                  Detalles del error (desarrollo)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-[var(--status-error-bg)] p-2 font-mono text-xs text-[var(--status-error)]">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            {this.props.showRefreshButton !== false && (
              <Button
                onClick={this.handleReset}
                variant="primary"
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Intentar de nuevo
              </Button>
            )}
            {this.props.showHomeLink && (
              <Link href="/dashboard">
                <Button variant="outline" leftIcon={<Home className="h-4 w-4" />}>
                  Ir al inicio
                </Button>
              </Link>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
