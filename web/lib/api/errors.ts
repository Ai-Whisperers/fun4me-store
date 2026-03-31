/**
 * Standardized API error responses
 * ARCH-007: Standardize API Error Responses
 */

import { NextResponse } from 'next/server'

/**
 * Standard API error codes and messages (Spanish)
 */
export const API_ERRORS = {
  // Authentication errors
  UNAUTHORIZED: {
    error: 'No autorizado',
    code: 'AUTH_REQUIRED',
  },
  INVALID_CREDENTIALS: {
    error: 'Credenciales inválidas',
    code: 'INVALID_CREDENTIALS',
  },
  SESSION_EXPIRED: {
    error: 'Sesión expirada',
    code: 'SESSION_EXPIRED',
  },

  // Authorization errors
  FORBIDDEN: {
    error: 'Sin permisos para esta acción',
    code: 'FORBIDDEN',
  },
  INSUFFICIENT_ROLE: {
    error: 'Rol insuficiente para esta acción',
    code: 'INSUFFICIENT_ROLE',
  },

  // Resource errors
  NOT_FOUND: {
    error: 'Recurso no encontrado',
    code: 'NOT_FOUND',
  },
  ALREADY_EXISTS: {
    error: 'El recurso ya existe',
    code: 'ALREADY_EXISTS',
  },

  // Validation errors
  VALIDATION_ERROR: {
    error: 'Datos inválidos',
    code: 'VALIDATION_ERROR',
  },
  MISSING_FIELDS: {
    error: 'Campos requeridos faltantes',
    code: 'MISSING_FIELDS',
  },
  INVALID_FORMAT: {
    error: 'Formato de datos inválido',
    code: 'INVALID_FORMAT',
  },

  // Business logic errors
  CONFLICT: {
    error: 'Conflicto con datos existentes',
    code: 'CONFLICT',
  },
  RATE_LIMITED: {
    error: 'Demasiadas solicitudes. Intente más tarde.',
    code: 'RATE_LIMITED',
  },
  QUOTA_EXCEEDED: {
    error: 'Límite excedido',
    code: 'QUOTA_EXCEEDED',
  },

  // File errors
  FILE_TOO_LARGE: {
    error: 'Archivo muy grande',
    code: 'FILE_TOO_LARGE',
  },
  INVALID_FILE_TYPE: {
    error: 'Tipo de archivo no permitido',
    code: 'INVALID_FILE_TYPE',
  },
  UPLOAD_FAILED: {
    error: 'Error al subir archivo',
    code: 'UPLOAD_FAILED',
  },

  // Server errors
  SERVER_ERROR: {
    error: 'Error interno del servidor',
    code: 'SERVER_ERROR',
  },
  DATABASE_ERROR: {
    error: 'Error de base de datos',
    code: 'DATABASE_ERROR',
  },
  EXTERNAL_SERVICE_ERROR: {
    error: 'Error de servicio externo',
    code: 'EXTERNAL_SERVICE_ERROR',
  },

  // Payment errors
  PAYMENT_ERROR: {
    error: 'Error de pago',
    code: 'PAYMENT_ERROR',
  },
  DUPLICATE_ERROR: {
    error: 'Registro duplicado',
    code: 'DUPLICATE_ERROR',
  },
} as const

export type ApiErrorType = keyof typeof API_ERRORS

/**
 * Standard API error response shape
 */
export interface ApiErrorResponse {
  error: string
  code: string
  details?: Record<string, unknown>
  field_errors?: Record<string, string[]>
}

/**
 * Create a standardized API error response
 *
 * @param type - Error type from API_ERRORS
 * @param status - HTTP status code
 * @param details - Optional additional details
 * @returns NextResponse with error JSON
 *
 * @example
 * ```typescript
 * return apiError('UNAUTHORIZED', 401);
 * return apiError('VALIDATION_ERROR', 400, { field_errors: { email: ['Email inválido'] } });
 * ```
 */
export function apiError(
  type: ApiErrorType,
  status: number,
  details?: Partial<Omit<ApiErrorResponse, 'error' | 'code'>>
): NextResponse<ApiErrorResponse> {
  const errorInfo = API_ERRORS[type]
  return NextResponse.json(
    {
      ...errorInfo,
      ...details,
    },
    { status }
  )
}

/**
 * Create a validation error response with field-level errors
 *
 * @param fieldErrors - Object mapping field names to error messages
 * @returns NextResponse with validation error
 *
 * @example
 * ```typescript
 * return validationError({
 *   email: ['Email es requerido', 'Formato inválido'],
 *   password: ['Mínimo 8 caracteres'],
 * });
 * ```
 */
export function validationError(
  fieldErrors: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  return apiError('VALIDATION_ERROR', 400, { field_errors: fieldErrors })
}

/**
 * Standard success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

/**
 * Create a standardized success response
 *
 * @param data - Response data
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success JSON
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      ...(message && { message }),
    },
    { status }
  )
}

/**
 * HTTP status codes reference
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// =============================================================================
// ENHANCED ERROR HELPERS (Using Centralized Error Messages)
// =============================================================================

/**
 * Import centralized error messages
 * These provide more specific, consistent Spanish error messages
 */
import { ERROR_MESSAGES, SUCCESS_MESSAGES, COMMON_ERRORS } from '@/lib/i18n/errors';

/**
 * Create error response with detailed Spanish message
 * 
 * @example
 * ```typescript
 * return errorResponse('AUTH', 'UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED);
 * return errorResponse('NOT_FOUND', 'PET', HTTP_STATUS.NOT_FOUND);
 * return errorResponse('BUSINESS', 'OUT_OF_STOCK', HTTP_STATUS.CONFLICT);
 * ```
 */
export function errorResponse(
  category: keyof typeof ERROR_MESSAGES,
  key: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  const categoryMessages = ERROR_MESSAGES[category];
  const message = (categoryMessages as Record<string, string>)[key] || 'Error desconocido';
  
  return NextResponse.json(
    {
      error: message,
      code: `${category}_${key}`,
      ...details,
    },
    { status }
  );
}

/**
 * Common error response shortcuts
 * 
 * @example
 * ```typescript
 * return commonError('UNAUTHORIZED');
 * return commonError('NOT_FOUND');
 * return commonError('SERVER_ERROR');
 * ```
 */
export function commonError(
  key: keyof typeof COMMON_ERRORS,
  details?: Record<string, unknown>
): NextResponse {
  const statusMap: Record<keyof typeof COMMON_ERRORS, number> = {
    UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
    FORBIDDEN: HTTP_STATUS.FORBIDDEN,
    NOT_FOUND: HTTP_STATUS.NOT_FOUND,
    SERVER_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    VALIDATION_FAILED: HTTP_STATUS.BAD_REQUEST,
    SESSION_EXPIRED: HTTP_STATUS.UNAUTHORIZED,
    INVALID_CREDENTIALS: HTTP_STATUS.UNAUTHORIZED,
    FETCH_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    SAVE_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    UPDATE_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    DELETE_FAILED: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    OUT_OF_STOCK: HTTP_STATUS.CONFLICT,
    INVOICE_PAID: HTTP_STATUS.CONFLICT,
    SLOT_UNAVAILABLE: HTTP_STATUS.CONFLICT,
  };
  
  return NextResponse.json(
    {
      error: COMMON_ERRORS[key],
      code: key,
      ...details,
    },
    { status: statusMap[key] }
  );
}

/**
 * Success response with Spanish message
 * 
 * @example
 * ```typescript
 * return successResponse({ id: '123' }, 'SAVED');
 * return successResponse(invoice, 'INVOICE_SENT', HTTP_STATUS.OK);
 * ```
 */
export function successResponse<T>(
  data: T,
  messageKey: keyof typeof SUCCESS_MESSAGES,
  status: number = HTTP_STATUS.OK
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message: SUCCESS_MESSAGES[messageKey],
    },
    { status }
  );
}
