/**
 * Unified error handling system
 * Provides consistent error types and handling across API routes, actions, and components
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'business_logic'
  | 'infrastructure'
  | 'external_service'
  | 'unknown'

export interface AppError {
  name: string
  message: string
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  statusCode: number
  details?: Record<string, unknown>
  fieldErrors?: Record<string, string[]>
  cause?: Error
  timestamp: Date
  requestId?: string
  userId?: string
  tenantId?: string
  stack?: string
}

export interface ErrorContext {
  userId?: string
  tenantId?: string
  requestId?: string
  operation?: string
  resource?: string
  metadata?: Record<string, unknown>
}

export interface ErrorResponse {
  error: string
  code: string
  details?: Record<string, unknown>
  field_errors?: Record<string, string[]>
  request_id?: string
}

export interface SuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    request_id?: string
  }
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

// Predefined error codes with their properties
export const ERROR_CODES = {
  // Authentication (400s)
  UNAUTHORIZED: {
    message: 'No autorizado',
    category: 'authentication' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 401,
  },
  INVALID_CREDENTIALS: {
    message: 'Credenciales inválidas',
    category: 'authentication' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 401,
  },
  SESSION_EXPIRED: {
    message: 'Sesión expirada',
    category: 'authentication' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 401,
  },
  ACCOUNT_INACTIVE: {
    message: 'Cuenta inactiva',
    category: 'authentication' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 403,
  },

  // Authorization (400s)
  FORBIDDEN: {
    message: 'Sin permisos para esta acción',
    category: 'authorization' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 403,
  },
  INSUFFICIENT_ROLE: {
    message: 'Rol insuficiente para esta acción',
    category: 'authorization' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 403,
  },
  TENANT_MISMATCH: {
    message: 'Acceso denegado para este tenant',
    category: 'authorization' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 403,
  },

  // Validation (400s)
  VALIDATION_ERROR: {
    message: 'Datos inválidos',
    category: 'validation' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 400,
  },
  MISSING_FIELDS: {
    message: 'Campos requeridos faltantes',
    category: 'validation' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 400,
  },
  INVALID_FORMAT: {
    message: 'Formato de datos inválido',
    category: 'validation' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 400,
  },

  // Business Logic (400s)
  NOT_FOUND: {
    message: 'Recurso no encontrado',
    category: 'business_logic' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 404,
  },
  ALREADY_EXISTS: {
    message: 'El recurso ya existe',
    category: 'business_logic' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 409,
  },
  CONFLICT: {
    message: 'Conflicto con datos existentes',
    category: 'business_logic' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 409,
  },
  BUSINESS_RULE_VIOLATION: {
    message: 'Violación de regla de negocio',
    category: 'business_logic' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 422,
  },

  // Infrastructure (500s)
  SERVER_ERROR: {
    message: 'Error interno del servidor',
    category: 'infrastructure' as ErrorCategory,
    severity: 'high' as ErrorSeverity,
    statusCode: 500,
  },
  DATABASE_ERROR: {
    message: 'Error de base de datos',
    category: 'infrastructure' as ErrorCategory,
    severity: 'high' as ErrorSeverity,
    statusCode: 500,
  },
  EXTERNAL_SERVICE_ERROR: {
    message: 'Error de servicio externo',
    category: 'infrastructure' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 502,
  },

  // Rate Limiting (400s)
  RATE_LIMITED: {
    message: 'Demasiadas solicitudes. Intente más tarde.',
    category: 'infrastructure' as ErrorCategory,
    severity: 'low' as ErrorSeverity,
    statusCode: 429,
  },
  QUOTA_EXCEEDED: {
    message: 'Límite excedido',
    category: 'infrastructure' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    statusCode: 429,
  },
} as const

export type ErrorCode = keyof typeof ERROR_CODES
