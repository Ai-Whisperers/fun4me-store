/**
 * Centralized Error Messages (Spanish)
 * 
 * Single source of truth for all user-facing error messages.
 * All messages are in Spanish for the Paraguay market.
 * 
 * Usage:
 * ```typescript
 * import { ERROR_MESSAGES } from '@/lib/i18n/errors';
 * 
 * return apiError('UNAUTHORIZED', 401, { 
 *   details: { message: ERROR_MESSAGES.AUTH.UNAUTHORIZED } 
 * });
 * ```
 */

// =============================================================================
// AUTHENTICATION & AUTHORIZATION
// =============================================================================

export const AUTH_ERRORS = {
  UNAUTHORIZED: 'No autorizado. Por favor inicie sesión.',
  SESSION_EXPIRED: 'Su sesión ha expirado. Por favor inicie sesión nuevamente.',
  INVALID_CREDENTIALS: 'Credenciales inválidas.',
  INVALID_TOKEN: 'Token inválido o expirado.',
  PROFILE_NOT_FOUND: 'Perfil de usuario no encontrado.',
  INSUFFICIENT_ROLE: 'No tiene permisos suficientes para realizar esta acción.',
  ACCOUNT_DISABLED: 'Su cuenta ha sido deshabilitada. Contacte al administrador.',
  ACCOUNT_NOT_VERIFIED: 'Su cuenta no ha sido verificada. Revise su correo electrónico.',
  PASSWORD_MISMATCH: 'La contraseña actual es incorrecta.',
  PASSWORD_TOO_WEAK: 'La contraseña debe tener al menos 8 caracteres.',
  EMAIL_ALREADY_EXISTS: 'Este correo electrónico ya está registrado.',
  FORBIDDEN_TENANT: 'No puede acceder a datos de otra clínica.',
  OWNER_ONLY: 'Solo el dueño de la mascota puede realizar esta acción.',
  STAFF_ONLY: 'Esta acción solo está disponible para veterinarios y administradores.',
  ADMIN_ONLY: 'Esta acción solo está disponible para administradores.',
} as const;

// =============================================================================
// DATABASE & SERVER ERRORS
// =============================================================================

export const DATABASE_ERRORS = {
  CONNECTION_FAILED: 'Error de conexión con la base de datos.',
  QUERY_FAILED: 'Error al ejecutar la consulta.',
  TRANSACTION_FAILED: 'Error al procesar la transacción.',
  CONSTRAINT_VIOLATION: 'Error de integridad de datos.',
  DUPLICATE_ENTRY: 'Este registro ya existe.',
  FOREIGN_KEY_VIOLATION: 'No se puede eliminar este registro porque está siendo usado.',
  SERVER_ERROR: 'Error interno del servidor. Por favor intente nuevamente.',
  SERVICE_UNAVAILABLE: 'Servicio temporalmente no disponible.',
  TIMEOUT: 'La operación tomó demasiado tiempo. Por favor intente nuevamente.',
} as const;

// =============================================================================
// RESOURCE NOT FOUND
// =============================================================================

export const NOT_FOUND_ERRORS = {
  RESOURCE: 'Recurso no encontrado.',
  PET: 'Mascota no encontrada.',
  OWNER: 'Propietario no encontrado.',
  APPOINTMENT: 'Cita no encontrada.',
  INVOICE: 'Factura no encontrada.',
  PRODUCT: 'Producto no encontrado.',
  SERVICE: 'Servicio no encontrado.',
  MEDICAL_RECORD: 'Registro médico no encontrado.',
  PRESCRIPTION: 'Receta no encontrada.',
  VACCINE: 'Vacuna no encontrada.',
  LAB_ORDER: 'Orden de laboratorio no encontrada.',
  USER: 'Usuario no encontrado.',
  CLINIC: 'Clínica no encontrada.',
  VET: 'Veterinario no encontrado.',
  KENNEL: 'Jaula no encontrada.',
  HOSPITALIZATION: 'Hospitalización no encontrada.',
} as const;

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'Este campo es requerido.',
  INVALID_FORMAT: 'Formato inválido.',
  INVALID_EMAIL: 'Correo electrónico inválido.',
  INVALID_PHONE: 'Número de teléfono inválido.',
  INVALID_DATE: 'Fecha inválida.',
  INVALID_TIME: 'Hora inválida.',
  DATE_IN_PAST: 'La fecha debe ser futura.',
  DATE_IN_FUTURE: 'La fecha debe ser pasada.',
  INVALID_AMOUNT: 'Monto inválido.',
  AMOUNT_TOO_LOW: 'El monto es demasiado bajo.',
  AMOUNT_TOO_HIGH: 'El monto es demasiado alto.',
  INVALID_QUANTITY: 'Cantidad inválida.',
  QUANTITY_EXCEEDS_STOCK: 'Cantidad solicitada excede el stock disponible.',
  INVALID_STATUS: 'Estado inválido.',
  MISSING_REQUIRED_FIELDS: 'Faltan campos requeridos.',
  FILE_TOO_LARGE: 'El archivo es demasiado grande.',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido.',
  INVALID_RANGE: 'Rango de valores inválido.',
} as const;

// =============================================================================
// BUSINESS LOGIC ERRORS
// =============================================================================

export const BUSINESS_ERRORS = {
  // Appointments
  SLOT_NOT_AVAILABLE: 'Este horario no está disponible.',
  APPOINTMENT_CONFLICT: 'Ya existe una cita en este horario.',
  APPOINTMENT_TOO_SOON: 'La cita debe programarse con al menos 1 hora de anticipación.',
  APPOINTMENT_TOO_FAR: 'Las citas solo pueden programarse hasta 3 meses en adelante.',
  CANNOT_CANCEL_PAST: 'No se puede cancelar una cita pasada.',
  CANNOT_MODIFY_COMPLETED: 'No se puede modificar una cita completada.',
  
  // Inventory
  OUT_OF_STOCK: 'Producto sin stock disponible.',
  INSUFFICIENT_STOCK: 'Stock insuficiente.',
  STOCK_BELOW_MINIMUM: 'El stock está por debajo del mínimo requerido.',
  PRODUCT_EXPIRED: 'Este producto ha expirado.',
  PRODUCT_DISCONTINUED: 'Este producto ha sido descontinuado.',
  
  // Invoices & Payments
  INVOICE_ALREADY_PAID: 'Esta factura ya está pagada.',
  INVOICE_ALREADY_VOID: 'Esta factura ya está anulada.',
  PAYMENT_EXCEEDS_BALANCE: 'El pago excede el saldo pendiente.',
  PAYMENT_TOO_LOW: 'El pago es menor al mínimo requerido.',
  NEGATIVE_AMOUNT: 'El monto debe ser positivo.',
  INVALID_PAYMENT_METHOD: 'Método de pago inválido.',
  
  // Prescriptions
  PRESCRIPTION_EXPIRED: 'Esta receta ha expirado.',
  PRESCRIPTION_ALREADY_DISPENSED: 'Esta receta ya fue dispensada.',
  REFILLS_EXHAUSTED: 'No quedan recargas disponibles para esta receta.',
  REQUIRES_VET_APPROVAL: 'Requiere aprobación del veterinario.',
  
  // Hospitalization
  KENNEL_OCCUPIED: 'Esta jaula está ocupada.',
  KENNEL_UNAVAILABLE: 'Esta jaula no está disponible.',
  ALREADY_HOSPITALIZED: 'Esta mascota ya está hospitalizada.',
  NOT_HOSPITALIZED: 'Esta mascota no está hospitalizada.',
  CANNOT_DISCHARGE_CRITICAL: 'No se puede dar de alta a un paciente en estado crítico.',
  
  // Lab Orders
  LAB_ORDER_ALREADY_COMPLETED: 'Esta orden de laboratorio ya está completada.',
  LAB_ORDER_CANCELLED: 'Esta orden de laboratorio está cancelada.',
  RESULTS_NOT_READY: 'Los resultados aún no están disponibles.',
  
  // Cart & Checkout
  CART_EMPTY: 'El carrito está vacío.',
  CART_EXPIRED: 'Su carrito ha expirado.',
  PRODUCT_UNAVAILABLE: 'Producto no disponible.',
  MINIMUM_ORDER_NOT_MET: 'No se ha alcanzado el pedido mínimo.',
  
  // General Business Rules
  DUPLICATE_OPERATION: 'Esta operación ya fue realizada.',
  OPERATION_NOT_ALLOWED: 'Operación no permitida en el estado actual.',
  RATE_LIMIT_EXCEEDED: 'Ha excedido el límite de solicitudes. Por favor espere.',
  FEATURE_DISABLED: 'Esta función está deshabilitada.',
  MAINTENANCE_MODE: 'El sistema está en mantenimiento. Por favor intente más tarde.',
} as const;

// =============================================================================
// DATA ERRORS
// =============================================================================

export const DATA_ERRORS = {
  FETCH_FAILED: 'Error al cargar los datos.',
  SAVE_FAILED: 'Error al guardar los datos.',
  UPDATE_FAILED: 'Error al actualizar los datos.',
  DELETE_FAILED: 'Error al eliminar los datos.',
  EXPORT_FAILED: 'Error al exportar los datos.',
  IMPORT_FAILED: 'Error al importar los datos.',
  PARSE_FAILED: 'Error al procesar los datos.',
  INVALID_DATA: 'Datos inválidos.',
  DATA_CORRUPTED: 'Los datos están corruptos.',
} as const;

// =============================================================================
// FILE & UPLOAD ERRORS
// =============================================================================

export const FILE_ERRORS = {
  UPLOAD_FAILED: 'Error al subir el archivo.',
  DOWNLOAD_FAILED: 'Error al descargar el archivo.',
  FILE_NOT_FOUND: 'Archivo no encontrado.',
  FILE_TOO_LARGE: 'El archivo es demasiado grande (máximo 5MB).',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido.',
  CORRUPTED_FILE: 'El archivo está corrupto o dañado.',
  STORAGE_FULL: 'Espacio de almacenamiento lleno.',
} as const;

// =============================================================================
// COMBINED ERROR MESSAGES
// =============================================================================

export const ERROR_MESSAGES = {
  AUTH: AUTH_ERRORS,
  DATABASE: DATABASE_ERRORS,
  NOT_FOUND: NOT_FOUND_ERRORS,
  VALIDATION: VALIDATION_ERRORS,
  BUSINESS: BUSINESS_ERRORS,
  DATA: DATA_ERRORS,
  FILE: FILE_ERRORS,
} as const;

// =============================================================================
// HELPER TYPES
// =============================================================================

export type AuthErrorKey = keyof typeof AUTH_ERRORS;
export type DatabaseErrorKey = keyof typeof DATABASE_ERRORS;
export type NotFoundErrorKey = keyof typeof NOT_FOUND_ERRORS;
export type ValidationErrorKey = keyof typeof VALIDATION_ERRORS;
export type BusinessErrorKey = keyof typeof BUSINESS_ERRORS;
export type DataErrorKey = keyof typeof DATA_ERRORS;
export type FileErrorKey = keyof typeof FILE_ERRORS;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get error message by category and key
 * 
 * @example
 * ```typescript
 * getErrorMessage('AUTH', 'UNAUTHORIZED')
 * // Returns: 'No autorizado. Por favor inicie sesión.'
 * ```
 */
export function getErrorMessage(
  category: keyof typeof ERROR_MESSAGES,
  key: string
): string {
  const categoryMessages = ERROR_MESSAGES[category];
  return (categoryMessages as Record<string, string>)[key] || 'Error desconocido';
}

/**
 * Common error message shorthands for frequently used errors
 */
export const COMMON_ERRORS = {
  // Most frequently used
  UNAUTHORIZED: AUTH_ERRORS.UNAUTHORIZED,
  FORBIDDEN: AUTH_ERRORS.INSUFFICIENT_ROLE,
  NOT_FOUND: NOT_FOUND_ERRORS.RESOURCE,
  SERVER_ERROR: DATABASE_ERRORS.SERVER_ERROR,
  VALIDATION_FAILED: VALIDATION_ERRORS.MISSING_REQUIRED_FIELDS,
  
  // Auth
  SESSION_EXPIRED: AUTH_ERRORS.SESSION_EXPIRED,
  INVALID_CREDENTIALS: AUTH_ERRORS.INVALID_CREDENTIALS,
  
  // Data operations
  FETCH_FAILED: DATA_ERRORS.FETCH_FAILED,
  SAVE_FAILED: DATA_ERRORS.SAVE_FAILED,
  UPDATE_FAILED: DATA_ERRORS.UPDATE_FAILED,
  DELETE_FAILED: DATA_ERRORS.DELETE_FAILED,
  
  // Business
  OUT_OF_STOCK: BUSINESS_ERRORS.OUT_OF_STOCK,
  INVOICE_PAID: BUSINESS_ERRORS.INVOICE_ALREADY_PAID,
  SLOT_UNAVAILABLE: BUSINESS_ERRORS.SLOT_NOT_AVAILABLE,
} as const;

// =============================================================================
// SUCCESS MESSAGES
// =============================================================================

export const SUCCESS_MESSAGES = {
  // General
  OPERATION_SUCCESS: 'Operación realizada exitosamente.',
  SAVED: 'Guardado exitosamente.',
  UPDATED: 'Actualizado exitosamente.',
  DELETED: 'Eliminado exitosamente.',
  CREATED: 'Creado exitosamente.',
  
  // Auth
  LOGIN_SUCCESS: 'Inicio de sesión exitoso.',
  LOGOUT_SUCCESS: 'Sesión cerrada exitosamente.',
  PASSWORD_CHANGED: 'Contraseña cambiada exitosamente.',
  
  // Appointments
  APPOINTMENT_BOOKED: 'Cita agendada exitosamente.',
  APPOINTMENT_CANCELLED: 'Cita cancelada exitosamente.',
  APPOINTMENT_COMPLETED: 'Cita completada exitosamente.',
  
  // Payments
  PAYMENT_PROCESSED: 'Pago procesado exitosamente.',
  INVOICE_SENT: 'Factura enviada exitosamente.',
  
  // Files
  FILE_UPLOADED: 'Archivo subido exitosamente.',
  FILE_DELETED: 'Archivo eliminado exitosamente.',
  
  // Email
  EMAIL_SENT: 'Correo enviado exitosamente.',
  INVITATION_SENT: 'Invitación enviada exitosamente.',
} as const;

export default ERROR_MESSAGES;
