/**
 * Centralized Error Messages - Single Source of Truth
 *
 * All user-facing error messages in Spanish (Paraguay market).
 * Import from here instead of hardcoding strings.
 *
 * @example
 * ```typescript
 * import { ERROR_MESSAGES, VALIDATION_MESSAGES } from '@/lib/constants/messages'
 *
 * throw new Error(ERROR_MESSAGES.AUTH.UNAUTHORIZED)
 * // or for Zod schemas:
 * z.string().email(VALIDATION_MESSAGES.INVALID_EMAIL)
 * ```
 */

// =============================================================================
// AUTHENTICATION ERRORS
// =============================================================================

export const AUTH_MESSAGES = {
  UNAUTHORIZED: 'No autorizado.',
  LOGIN_REQUIRED: 'Debes iniciar sesion para realizar esta accion.',
  SESSION_EXPIRED: 'Tu sesion ha expirado. Por favor, inicia sesion nuevamente.',
  INVALID_CREDENTIALS: 'Credenciales invalidas.',
  ACCOUNT_DISABLED: 'Tu cuenta ha sido deshabilitada.',
  EMAIL_NOT_VERIFIED: 'Por favor, verifica tu correo electronico.',
  PASSWORD_RESET_REQUIRED: 'Debes restablecer tu contrasena.',
} as const

// =============================================================================
// AUTHORIZATION ERRORS
// =============================================================================

export const AUTHZ_MESSAGES = {
  FORBIDDEN: 'No tienes permisos para realizar esta accion.',
  ADMIN_REQUIRED: 'Solo los administradores pueden realizar esta accion.',
  STAFF_REQUIRED: 'Solo el personal puede realizar esta accion.',
  OWNER_REQUIRED: 'Solo el propietario puede realizar esta accion.',
  TENANT_MISMATCH: 'No tienes acceso a este recurso.',
} as const

// =============================================================================
// VALIDATION MESSAGES (For Zod schemas and form validation)
// =============================================================================

export const VALIDATION_MESSAGES = {
  // Required fields
  REQUIRED: 'Este campo es requerido.',
  REQUIRED_FIELD: 'Este campo es requerido.',

  // Email
  INVALID_EMAIL: 'Email invalido.',
  EMAIL_REQUIRED: 'El email es requerido.',

  // Phone
  INVALID_PHONE: 'Numero de telefono invalido.',
  PHONE_REQUIRED: 'El telefono es requerido.',

  // Password
  PASSWORD_REQUIRED: 'La contrasena es requerida.',
  PASSWORD_TOO_SHORT: 'La contrasena debe tener al menos 8 caracteres.',
  PASSWORD_TOO_WEAK: 'La contrasena debe incluir mayusculas, minusculas y numeros.',
  PASSWORDS_DONT_MATCH: 'Las contrasenas no coinciden.',

  // Names
  NAME_REQUIRED: 'El nombre es requerido.',
  NAME_TOO_SHORT: 'El nombre debe tener al menos 2 caracteres.',
  NAME_TOO_LONG: 'El nombre no puede exceder los 100 caracteres.',

  // Numbers
  MUST_BE_NUMBER: 'Debe ser un numero valido.',
  MUST_BE_POSITIVE: 'Debe ser un numero positivo.',
  MUST_BE_INTEGER: 'Debe ser un numero entero.',
  MIN_VALUE: (min: number) => `El valor minimo es ${min}.`,
  MAX_VALUE: (max: number) => `El valor maximo es ${max}.`,

  // Dates
  INVALID_DATE: 'Fecha invalida.',
  DATE_REQUIRED: 'La fecha es requerida.',
  DATE_IN_PAST: 'La fecha no puede ser en el pasado.',
  DATE_IN_FUTURE: 'La fecha no puede ser en el futuro.',

  // Length
  TOO_SHORT: (min: number) => `Debe tener al menos ${min} caracteres.`,
  TOO_LONG: (max: number) => `No puede exceder los ${max} caracteres.`,

  // Generic
  INVALID_FORMAT: 'Formato invalido.',
  INVALID_SELECTION: 'Seleccion invalida.',
  REVIEW_FIELDS: 'Por favor, revisa los campos marcados en rojo.',
} as const

// =============================================================================
// RESOURCE ERRORS
// =============================================================================

export const RESOURCE_MESSAGES = {
  NOT_FOUND: 'Recurso no encontrado.',
  ALREADY_EXISTS: 'El recurso ya existe.',
  CONFLICT: 'Conflicto con datos existentes.',
  DELETED: 'Este recurso ha sido eliminado.',
} as const

// =============================================================================
// PET-SPECIFIC MESSAGES
// =============================================================================

export const PET_MESSAGES = {
  NOT_FOUND: 'Mascota no encontrada.',
  NOT_YOURS: 'Esta mascota no te pertenece.',
  REQUIRED_SELECTION: 'Debes seleccionar una mascota.',
  INVALID_ID: 'El ID de la mascota es invalido.',
  ALREADY_HAS_TAG: 'Esta mascota ya tiene una etiqueta asignada.',
  DELETE_CONFIRM: 'Esta seguro de eliminar esta mascota? Esta accion no se puede deshacer.',
} as const

// =============================================================================
// APPOINTMENT-SPECIFIC MESSAGES
// =============================================================================

export const APPOINTMENT_MESSAGES = {
  NOT_FOUND: 'Cita no encontrada.',
  REQUIRED_DATETIME: 'La fecha y hora son obligatorias.',
  INVALID_DATETIME: 'La fecha y hora proporcionadas no son validas.',
  TOO_SOON: 'La cita debe ser al menos 15 minutos en el futuro.',
  IN_PAST: 'No se puede agendar una cita en el pasado.',
  SLOT_TAKEN: 'Este horario ya esta ocupado. Por favor, elige otro.',
  SAME_DAY_EXISTS: (petName: string, time: string) =>
    `${petName} ya tiene una cita para este dia a las ${time}.`,
  CANNOT_CANCEL: 'Esta cita no puede ser cancelada.',
  CANNOT_RESCHEDULE: 'Esta cita no puede ser reprogramada.',
  REQUIRED_REASON: 'El motivo de la consulta es obligatorio.',
  REASON_TOO_SHORT: 'Describe brevemente el motivo (minimo 3 caracteres).',
  REASON_TOO_LONG: 'El motivo no puede exceder los 200 caracteres.',
  NOTES_TOO_LONG: 'Las notas no pueden exceder los 1000 caracteres.',
  GENERIC_ERROR: 'No se pudo agendar la cita. Por favor, intenta de nuevo.',
} as const

// =============================================================================
// INVOICE-SPECIFIC MESSAGES
// =============================================================================

export const INVOICE_MESSAGES = {
  NOT_FOUND: 'Factura no encontrada.',
  ALREADY_PAID: 'Esta factura ya esta pagada.',
  ALREADY_VOID: 'Esta factura ya esta anulada.',
  CANNOT_EDIT: 'Esta factura no puede ser editada.',
  CANNOT_VOID: 'Esta factura no puede ser anulada.',
  CANNOT_DELETE: 'Esta factura no puede ser eliminada.',
  PAYMENT_EXCEEDS: 'El pago excede el monto pendiente.',
  NO_ITEMS: 'La factura debe tener al menos un item.',
  GENERIC_ERROR: 'Error al procesar la factura.',
} as const

// =============================================================================
// STORE/ORDER MESSAGES
// =============================================================================

export const STORE_MESSAGES = {
  PRODUCT_NOT_FOUND: 'Producto no encontrado.',
  OUT_OF_STOCK: 'Producto sin stock disponible.',
  INSUFFICIENT_STOCK: (available: number) => `Solo hay ${available} unidades disponibles.`,
  CART_EMPTY: 'El carrito esta vacio.',
  PRESCRIPTION_REQUIRED: 'Este producto requiere receta veterinaria.',
  COUPON_INVALID: 'Cupon invalido o expirado.',
  COUPON_ALREADY_USED: 'Este cupon ya fue utilizado.',
  MIN_ORDER_NOT_MET: (min: number) => `El pedido minimo es de Gs ${min.toLocaleString('es-PY')}.`,
  ORDER_ERROR: 'Error al procesar el pedido.',
} as const

// =============================================================================
// FILE/UPLOAD MESSAGES
// =============================================================================

export const FILE_MESSAGES = {
  TOO_LARGE: 'El archivo es muy grande.',
  MAX_SIZE: (sizeMB: number) => `El tamano maximo es ${sizeMB}MB.`,
  INVALID_TYPE: 'Tipo de archivo no permitido.',
  ALLOWED_TYPES: (types: string) => `Tipos permitidos: ${types}.`,
  UPLOAD_FAILED: 'Error al subir el archivo.',
  UPLOAD_SUCCESS: 'Archivo subido correctamente.',
} as const

// =============================================================================
// NETWORK/SERVER MESSAGES
// =============================================================================

export const NETWORK_MESSAGES = {
  CONNECTION_ERROR: 'Error de conexion. Por favor, verifica tu internet.',
  SERVER_ERROR: 'Error del servidor. Por favor, intenta mas tarde.',
  TIMEOUT: 'La solicitud tardo demasiado. Intenta de nuevo.',
  RATE_LIMITED: 'Demasiadas solicitudes. Espera un momento.',
  SERVICE_UNAVAILABLE: 'Servicio no disponible temporalmente.',
} as const

// =============================================================================
// SUCCESS MESSAGES
// =============================================================================

export const SUCCESS_MESSAGES = {
  SAVED: 'Guardado correctamente.',
  CREATED: 'Creado correctamente.',
  UPDATED: 'Actualizado correctamente.',
  DELETED: 'Eliminado correctamente.',
  SENT: 'Enviado correctamente.',
  CANCELLED: 'Cancelado correctamente.',
  CONFIRMED: 'Confirmado correctamente.',
} as const

// =============================================================================
// COMBINED ERROR_MESSAGES OBJECT (Backwards compatibility)
// =============================================================================

export const ERROR_MESSAGES = {
  // Authentication
  AUTH: AUTH_MESSAGES,
  ...AUTH_MESSAGES,

  // Authorization
  AUTHZ: AUTHZ_MESSAGES,
  ...AUTHZ_MESSAGES,

  // Validation
  VALIDATION: VALIDATION_MESSAGES,
  ...VALIDATION_MESSAGES,

  // Resources
  RESOURCE: RESOURCE_MESSAGES,
  ...RESOURCE_MESSAGES,

  // Domain-specific
  PET: PET_MESSAGES,
  APPOINTMENT: APPOINTMENT_MESSAGES,
  INVOICE: INVOICE_MESSAGES,
  STORE: STORE_MESSAGES,
  FILE: FILE_MESSAGES,
  NETWORK: NETWORK_MESSAGES,

  // Legacy keys (for backwards compatibility with existing code)
  REQUIRED_PET_SELECTION: PET_MESSAGES.REQUIRED_SELECTION,
  INVALID_PET_ID: PET_MESSAGES.INVALID_ID,
  REQUIRED_DATETIME: APPOINTMENT_MESSAGES.REQUIRED_DATETIME,
  INVALID_DATETIME: APPOINTMENT_MESSAGES.INVALID_DATETIME,
  APPOINTMENT_TOO_SOON: APPOINTMENT_MESSAGES.TOO_SOON,
  REQUIRED_REASON: APPOINTMENT_MESSAGES.REQUIRED_REASON,
  SHORT_REASON: APPOINTMENT_MESSAGES.REASON_TOO_SHORT,
  LONG_REASON: APPOINTMENT_MESSAGES.REASON_TOO_LONG,
  LONG_NOTES: APPOINTMENT_MESSAGES.NOTES_TOO_LONG,
  SLOT_ALREADY_TAKEN: APPOINTMENT_MESSAGES.SLOT_TAKEN,
  GENERIC_APPOINTMENT_ERROR: APPOINTMENT_MESSAGES.GENERIC_ERROR,
  LOGIN_REQUIRED: AUTH_MESSAGES.LOGIN_REQUIRED,
  REVIEW_FIELDS: VALIDATION_MESSAGES.REVIEW_FIELDS,
  PET_NOT_FOUND: PET_MESSAGES.NOT_FOUND,
  UNAUTHORIZED_PET_ACCESS: PET_MESSAGES.NOT_YOURS,
  CLINIC_IDENTIFICATION_FAILED: 'No se pudo identificar la clinica. Por favor, recarga la pagina.',
  APPOINTMENT_ON_SAME_DAY: APPOINTMENT_MESSAGES.SAME_DAY_EXISTS,
} as const

// =============================================================================
// HELPER FOR ZOD SCHEMAS
// =============================================================================

/**
 * Message helpers for Zod schema validation
 * @example
 * z.string().email(zodMsg.email())
 */
export const zodMsg = {
  required: () => VALIDATION_MESSAGES.REQUIRED,
  email: () => VALIDATION_MESSAGES.INVALID_EMAIL,
  phone: () => VALIDATION_MESSAGES.INVALID_PHONE,
  password: () => VALIDATION_MESSAGES.PASSWORD_TOO_SHORT,
  minLength: (min: number) => VALIDATION_MESSAGES.TOO_SHORT(min),
  maxLength: (max: number) => VALIDATION_MESSAGES.TOO_LONG(max),
  positive: () => VALIDATION_MESSAGES.MUST_BE_POSITIVE,
  integer: () => VALIDATION_MESSAGES.MUST_BE_INTEGER,
  date: () => VALIDATION_MESSAGES.INVALID_DATE,
}

// Type exports
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES
