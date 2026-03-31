export { default as DashboardError } from './dashboard-error'
export { default as PortalError } from './portal-error'
export { default as PublicError } from './public-error'

// Client-side error handling components
export {
  ErrorBoundary,
  ErrorFallback,
  withErrorBoundary,
  classifyError,
  errorMessages,
} from './error-boundary'
export type { ErrorType } from './error-boundary'

// Offline detection
export { OfflineBanner, useOnlineStatus } from './offline-banner'
