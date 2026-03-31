import type { ActionResult, FieldErrors } from '@/lib/types/action-result'

export function actionSuccess<T = void>(data?: T): ActionResult<T> {
  return { success: true, data }
}

export function actionError<T = void>(error: string, fieldErrors?: FieldErrors): ActionResult<T> {
  return { success: false, error, fieldErrors }
}
