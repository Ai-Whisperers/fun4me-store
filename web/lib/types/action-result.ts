/**
 * Field-level validation errors
 * Maps field names to their error messages
 */
export type FieldErrors = Record<string, string>

/**
 * Standardized result type for Server Actions
 *
 * This provides a consistent error handling pattern across all server actions.
 *
 * @example Success with data
 * ```ts
 * return { success: true, data: newPet }
 * ```
 *
 * @example Success without data
 * ```ts
 * return { success: true }
 * ```
 *
 * @example Success with warning (Epic 3.5)
 * ```ts
 * return { success: true, message: 'Guardado', warning: 'Email no enviado' }
 * ```
 *
 * @example General error
 * ```ts
 * return { success: false, error: 'No autorizado' }
 * ```
 *
 * @example Field-level errors
 * ```ts
 * return {
 *   success: false,
 *   error: 'Por favor corrige los errores del formulario',
 *   fieldErrors: { name: 'El nombre es obligatorio', weight: 'El peso debe ser mayor a 0' }
 * }
 * ```
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string; warning?: string }
  | { success: false; error: string; fieldErrors?: FieldErrors }

/**
 * Type guard to check if an action result is successful
 */
export function isSuccess<T>(
  result: ActionResult<T>
): result is { success: true; data?: T; message?: string; warning?: string } {
  return result.success === true
}

/**
 * Type guard to check if an action result is an error
 */
export function isError<T>(result: ActionResult<T>): result is { success: false; error: string } {
  return result.success === false
}
