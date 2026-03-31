/**
 * Core error handling service
 * Creates, transforms, and handles errors consistently across the application
 */

import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import type {
  AppError,
  ErrorCode,
  ErrorContext,
  ErrorResponse,
  SuccessResponse,
} from './types'
import { ERROR_CODES } from './types'

export class ErrorService {
  /**
   * Create a standardized application error
   */
  static create(
    code: ErrorCode,
    message?: string,
    context?: ErrorContext,
    cause?: Error
  ): AppError {
    const errorConfig = ERROR_CODES[code]

    return {
      name: 'AppError',
      message: message || errorConfig.message,
      code,
      category: errorConfig.category,
      severity: errorConfig.severity,
      statusCode: errorConfig.statusCode,
      details: context?.metadata,
      cause,
      timestamp: new Date(),
      requestId: context?.requestId || randomUUID(),
      userId: context?.userId,
      tenantId: context?.tenantId,
      stack: cause?.stack,
    }
  }

  /**
   * Create an error from an unknown error (handles various error types)
   */
  static fromUnknown(
    error: unknown,
    code: ErrorCode = 'SERVER_ERROR',
    context?: ErrorContext
  ): AppError {
    if (error instanceof Error) {
      return this.create(code, error.message, context, error)
    }

    if (typeof error === 'string') {
      return this.create(code, error, context)
    }

    return this.create(code, 'Unknown error occurred', context)
  }

  /**
   * Convert AppError to API response format
   */
  static toApiResponse(error: AppError): NextResponse<ErrorResponse> {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      request_id: error.requestId,
      ...(error.details && { details: error.details }),
      ...(error.fieldErrors && { field_errors: error.fieldErrors }),
    }

    return NextResponse.json(response, { status: error.statusCode })
  }

  /**
   * Convert AppError to action result format
   */
  static toActionResult(error: AppError): { success: false; error: string; code?: string } {
    return {
      success: false,
      error: error.message,
      code: error.code,
    }
  }

  /**
   * Create success response for API routes
   */
  static apiSuccess<T>(
    data: T,
    message?: string,
    status: number = 200,
    meta?: SuccessResponse['meta']
  ): NextResponse<SuccessResponse<T>> {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      ...(meta && { meta }),
    }

    return NextResponse.json(response, { status })
  }

  /**
   * Create success result for actions
   */
  static actionSuccess<T = void>(
    data?: T,
    message?: string
  ): { success: true; data?: T; message?: string } {
    return {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
    }
  }

  /**
   * Create error result for actions
   */
  static actionError(
    message: string,
    code?: string
  ): { success: false; error: string; code?: string } {
    return {
      success: false,
      error: message,
      ...(code && { code }),
    }
  }

  /**
   * Handle errors in API route handlers
   */
  static handleApiError(error: unknown, context?: ErrorContext): NextResponse<ErrorResponse> {
    const appError = this.fromUnknown(error, 'SERVER_ERROR', context)

    // Log critical errors
    if (appError.severity === 'critical' || appError.severity === 'high') {
      logger.error('[API] Critical error', {
        ...appError,
        stack: appError.stack,
      })
    } else {
      logger.warn('[API] Error', {
        code: appError.code,
        message: appError.message,
        requestId: appError.requestId,
      })
    }

    return this.toApiResponse(appError)
  }

  /**
   * Handle errors in server action handlers
   */
  static handleActionError(error: unknown, context?: ErrorContext) {
    const appError = this.fromUnknown(error, 'SERVER_ERROR', context)

    // Log critical errors
    if (appError.severity === 'critical' || appError.severity === 'high') {
      logger.error('[Action] Critical error', {
        ...appError,
        stack: appError.stack,
      })
    } else {
      logger.warn('[Action] Error', {
        code: appError.code,
        message: appError.message,
        requestId: appError.requestId,
      })
    }

    return this.actionError(appError.message, appError.code)
  }

  /**
   * Create validation error with field-level details
   */
  static validationError(fieldErrors: Record<string, string[]>, context?: ErrorContext): AppError {
    return {
      ...this.create('VALIDATION_ERROR', undefined, context),
      fieldErrors,
    }
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: AppError): boolean {
    return ['DATABASE_ERROR', 'EXTERNAL_SERVICE_ERROR', 'RATE_LIMITED'].includes(error.code)
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: AppError): string {
    // In production, you might want to map internal errors to user-friendly messages
    return error.message
  }

  /**
   * Sanitize error for client consumption (remove sensitive data)
   */
  static sanitize(error: AppError): Omit<AppError, 'stack' | 'cause' | 'userId' | 'tenantId'> {
    const { stack, cause, userId, tenantId, ...sanitized } = error
    return sanitized
  }
}
