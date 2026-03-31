/**
 * Standardized error types and messages for the Vete platform
 * All user-facing messages are in Spanish (Paraguay market)
 *
 * NOTE: For ActionResult type, import from '@/lib/types/action-result'
 */

/**
 * Common error types categorized by domain
 */
export const ErrorMessages = {
  // Authentication & Authorization
  AUTH: {
    UNAUTHORIZED: 'No autorizado. Por favor inicia sesión.',
    FORBIDDEN: 'No tienes permisos para realizar esta acción.',
    SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
    INVALID_CREDENTIALS: 'Credenciales inválidas.',
  },

  // Network & Connection
  NETWORK: {
    CONNECTION_ERROR: 'Error de conexión. Por favor verifica tu internet e intenta de nuevo.',
    TIMEOUT: 'La solicitud tardó demasiado. Por favor intenta de nuevo.',
    ABORTED: 'Solicitud cancelada.',
    SERVER_ERROR: 'Error del servidor. Por favor intenta más tarde.',
  },

  // Form Validation
  VALIDATION: {
    REQUIRED_FIELD: 'Este campo es requerido.',
    INVALID_FORMAT: 'Formato inválido.',
    INVALID_EMAIL: 'Email inválido.',
    INVALID_PHONE: 'Número de teléfono inválido.',
    MIN_LENGTH: 'Debe tener al menos {min} caracteres.',
    MAX_LENGTH: 'No puede exceder {max} caracteres.',
    NUMERIC_ONLY: 'Solo números permitidos.',
  },

  // File Upload
  FILE: {
    UPLOAD_FAILED: 'Error al subir el archivo. Por favor intenta de nuevo.',
    FILE_TOO_LARGE: 'El archivo es demasiado grande. Máximo {max}MB.',
    INVALID_TYPE: 'Tipo de archivo no permitido.',
    PHOTO_UPLOAD_FAILED: 'Error al subir la foto. Por favor intenta de nuevo.',
    PHOTO_DELETE_FAILED: 'Error al eliminar la foto.',
  },

  // Database Operations
  DB: {
    SAVE_FAILED: 'Error al guardar. Por favor intenta de nuevo.',
    UPDATE_FAILED: 'Error al actualizar. Por favor intenta de nuevo.',
    DELETE_FAILED: 'Error al eliminar. Por favor intenta de nuevo.',
    FETCH_FAILED: 'Error al cargar los datos. Por favor intenta de nuevo.',
    NOT_FOUND: 'Registro no encontrado.',
    DUPLICATE: 'Ya existe un registro con estos datos.',
  },

  // Business Logic
  BOOKING: {
    SLOT_UNAVAILABLE: 'Este horario ya no está disponible. Por favor selecciona otro.',
    INVALID_TIME: 'Horario inválido.',
    PAST_DATE: 'No puedes reservar en fechas pasadas.',
    MISSING_DETAILS: 'Faltan detalles para completar la reserva.',
    ALREADY_BOOKED: 'Ya tienes una cita reservada en este horario.',
  },

  PAYMENT: {
    PROCESSING_FAILED: 'Error al procesar el pago. Por favor intenta de nuevo.',
    INSUFFICIENT_FUNDS: 'Fondos insuficientes.',
    INVALID_CARD: 'Tarjeta inválida.',
    DECLINED: 'Pago rechazado.',
  },

  PET: {
    NOT_FOUND: 'Mascota no encontrada.',
    DELETE_FAILED: 'Error al eliminar la mascota.',
    UPDATE_FAILED: 'Error al actualizar los datos de la mascota.',
    PHOTO_REQUIRED: 'Se requiere una foto de la mascota.',
  },

  INVOICE: {
    GENERATION_FAILED: 'Error al generar la factura.',
    SEND_FAILED: 'Error al enviar la factura.',
    ALREADY_PAID: 'Esta factura ya fue pagada.',
    INVALID_AMOUNT: 'Monto inválido.',
  },

  LAB: {
    ORDER_FAILED: 'Error al crear la orden de laboratorio.',
    RESULT_SAVE_FAILED: 'Error al guardar los resultados.',
    INVALID_VALUE: 'Valor de resultado inválido.',
  },

  MESSAGING: {
    SEND_FAILED: 'Error al enviar el mensaje. Por favor intenta de nuevo.',
    INVALID_PHONE: 'Número de teléfono inválido.',
    ATTACHMENT_FAILED: 'Error al adjuntar el archivo.',
  },

  // Generic
  GENERIC: {
    UNKNOWN: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
    INVALID_INPUT: 'Datos inválidos.',
    OPERATION_FAILED: 'La operación falló. Por favor intenta de nuevo.',
  },
} as const

/**
 * Helper to create successful action result
 * Import ActionResult from '@/lib/types/action-result'
 */
export function successResult<T>(data?: T) {
  return {
    success: true,
    data,
  } as const
}

/**
 * Helper to create error action result
 * Import ActionResult from '@/lib/types/action-result'
 */
export function errorResult(error: string) {
  return {
    success: false,
    error,
  } as const
}

/**
 * Helper to create validation error result with field-level errors
 * Import ActionResult from '@/lib/types/action-result'
 */
export function validationErrorResult(fieldErrors: Record<string, string>) {
  return {
    success: false,
    error: 'Error de validación. Por favor revisa los campos.',
    fieldErrors,
  } as const
}

/**
 * Error type for identifying error categories
 */
export type ErrorCategory =
  | 'auth'
  | 'network'
  | 'validation'
  | 'file'
  | 'db'
  | 'business'
  | 'unknown'

/**
 * Custom error class with category
 */
export class AppError extends Error {
  category: ErrorCategory

  constructor(message: string, category: ErrorCategory = 'unknown') {
    super(message)
    this.name = 'AppError'
    this.category = category
  }
}

/**
 * Helper to determine error category from error instance
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof AppError) {
    return error.category
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'network'
    if (error.message.includes('fetch') || error.message.includes('network')) return 'network'
    if (error.message.includes('auth') || error.message.includes('autorizado')) return 'auth'
  }

  return 'unknown'
}

/**
 * Helper to get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return ErrorMessages.NETWORK.ABORTED
    }
    // Return the error message if it looks like a user-friendly Spanish message
    if (error.message.match(/^[A-ZÁÉÍÓÚÑ]/)) {
      return error.message
    }
  }

  return ErrorMessages.GENERIC.UNKNOWN
}
