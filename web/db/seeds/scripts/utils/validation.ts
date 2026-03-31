/**
 * Validation Utility for Seed System
 *
 * Wraps Zod validation with helpful error formatting and batch validation.
 */

import { z, ZodError, ZodSchema, ZodType } from 'zod'

/**
 * Validation error with context
 */
export interface ValidationError {
  index: number
  field: string
  message: string
  value?: unknown
}

/**
 * Result of validating a batch of records
 */
export interface ValidationResult<T> {
  valid: T[]
  invalid: Array<{
    index: number
    record: unknown
    errors: ValidationError[]
  }>
  totalValid: number
  totalInvalid: number
}

/**
 * Validate a single record against a Zod schema
 */
export function validateRecord<T>(
  schema: ZodType<T, any, any>,
  record: unknown,
  index: number = 0
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  try {
    const data = schema.parse(record)
    return { success: true, data }
  } catch (e) {
    if (e instanceof ZodError) {
      // Zod v4 uses 'issues' property
      const zodIssues = e.issues || []
      const errors: ValidationError[] = zodIssues.map((issue) => {
        return {
          index,
          field: issue.path?.join('.') || 'unknown',
          message: issue.message || 'Validation failed',
          value: (record as Record<string, unknown>)?.[issue.path?.[0] as string],
        }
      })
      return { success: false, errors }
    }
    // Fallback for any other error type
    return {
      success: false,
      errors: [
        {
          index,
          field: 'unknown',
          message: e instanceof Error ? e.message : String(e),
        },
      ],
    }
  }
}

/**
 * Validate a batch of records against a Zod schema
 * Returns valid records and collects all validation errors
 */
export function validateBatch<T>(
  schema: ZodType<T, any, any>,
  records: unknown[]
): ValidationResult<T> {
  const result: ValidationResult<T> = {
    valid: [],
    invalid: [],
    totalValid: 0,
    totalInvalid: 0,
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const validation = validateRecord(schema, record, i)

    if (validation.success) {
      result.valid.push(validation.data)
      result.totalValid++
    } else {
      result.invalid.push({
        index: i,
        record,
        errors: validation.errors,
      })
      result.totalInvalid++
    }
  }

  return result
}

/**
 * Format validation errors for console output
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `  [${e.index}] ${e.field}: ${e.message}`).join('\n')
}

/**
 * Format validation result summary
 */
export function formatValidationSummary<T>(result: ValidationResult<T>): string {
  const lines: string[] = []

  lines.push(`Valid: ${result.totalValid}, Invalid: ${result.totalInvalid}`)

  if (result.invalid.length > 0) {
    lines.push('Validation errors:')
    for (const item of result.invalid.slice(0, 5)) {
      lines.push(`  Record #${item.index}:`)
      for (const err of item.errors) {
        lines.push(`    - ${err.field}: ${err.message}`)
      }
    }
    if (result.invalid.length > 5) {
      lines.push(`  ... and ${result.invalid.length - 5} more invalid records`)
    }
  }

  return lines.join('\n')
}

/**
 * Validate and transform a batch, throwing on any errors (strict mode)
 */
export function validateBatchStrict<T>(
  schema: ZodType<T, any, any>,
  records: unknown[],
  context?: string
): T[] {
  const result = validateBatch(schema, records)

  if (result.totalInvalid > 0) {
    const contextStr = context ? ` in ${context}` : ''
    const errorDetails = result.invalid
      .slice(0, 3)
      .map((item) =>
        item.errors.map((e) => `  [${item.index}] ${e.field}: ${e.message}`).join('\n')
      )
      .join('\n')

    throw new Error(
      `Validation failed${contextStr}: ${result.totalInvalid} invalid records\n${errorDetails}`
    )
  }

  return result.valid
}

/**
 * Safe parse with default on error
 */
export function safeParseWithDefault<T>(
  schema: ZodType<T, any, any>,
  value: unknown,
  defaultValue: T
): T {
  const result = schema.safeParse(value)
  return result.success ? result.data : defaultValue
}

/**
 * Create a partial schema for updates (all fields optional)
 */
export function createPartialSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> {
  return schema.partial()
}

/**
 * Create a schema that accepts undefined fields
 */
export function createInsertSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<T> {
  // For inserts, we typically want to strip extra fields
  return schema.strip() as z.ZodObject<T>
}
