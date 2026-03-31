/**
 * Type Guards and Type Predicates
 *
 * Provides runtime type checking functions that narrow TypeScript types
 * without using unsafe casts like `as any` or `as unknown as`.
 */

/**
 * Check if a value is defined (not null or undefined)
 * Useful for filtering arrays: arr.filter(isDefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Check if a value is a non-empty array
 */
export function isNonEmptyArray<T>(value: T[] | null | undefined): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0
}

/**
 * Check if a value is a valid number (not NaN)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Check if a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return isValidNumber(value) && value > 0
}

/**
 * Check if value is a plain object (not array, null, etc.)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if an object has a specific property
 */
export function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return isPlainObject(obj) && key in obj
}

/**
 * Check if an object has required properties with correct types
 */
export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return isPlainObject(obj) && keys.every((key) => key in obj)
}

/**
 * Type guard for checking if a value matches a UserRole
 */
export function isUserRole(value: unknown): value is 'owner' | 'vet' | 'admin' {
  return value === 'owner' || value === 'vet' || value === 'admin'
}

/**
 * Type guard for checking if profile has staff role
 */
export function isStaffRole(role: unknown): role is 'vet' | 'admin' {
  return role === 'vet' || role === 'admin'
}

/**
 * Safely narrow array element type after filter
 * Use: arr.filter(isType(schema)) instead of arr.filter(...) as T[]
 */
export function isType<T>(validator: (value: unknown) => boolean): (value: unknown) => value is T {
  return (value: unknown): value is T => validator(value)
}

/**
 * Assert a value is defined, throwing if not
 * Useful when you're certain a value exists but TS can't infer it
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Expected value to be defined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }
}

/**
 * Assert a condition is true
 */
export function assert(condition: boolean, message = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Safely parse JSON with type validation
 */
export function safeJsonParse<T>(
  json: string,
  validator: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json)
    return validator(parsed) ? parsed : null
  } catch (_error: unknown) {
    return null
  }
}

/**
 * Create a type guard for Supabase joined data
 * Supabase returns objects for single relations, arrays for many relations
 */
export function isJoinedRecord(
  value: unknown,
  requiredKeys: string[]
): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false
  return requiredKeys.every((key) => key in value)
}

/**
 * Type guard for category join result
 */
export interface CategoryJoin {
  id: string
  name: string
  slug: string
}

export function isCategoryJoin(value: unknown): value is CategoryJoin {
  if (!isPlainObject(value)) return false
  return (
    'id' in value &&
    'name' in value &&
    'slug' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string'
  )
}

/**
 * Type guard for brand join result
 */
export interface BrandJoin {
  id: string
  name: string
}

export function isBrandJoin(value: unknown): value is BrandJoin {
  if (!isPlainObject(value)) return false
  return (
    'id' in value &&
    'name' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  )
}

/**
 * Narrow unknown to a specific type with fallback
 * Returns the validated value or the fallback
 */
export function narrowOrDefault<T>(
  value: unknown,
  validator: (v: unknown) => v is T,
  fallback: T
): T {
  return validator(value) ? value : fallback
}

/**
 * Filter and map in one pass with type narrowing
 * Avoids the `.filter(...).map(...)` pattern that loses types
 */
export function filterMap<T, U>(
  array: T[],
  fn: (item: T, index: number) => U | null | undefined
): U[] {
  const result: U[] = []
  for (let i = 0; i < array.length; i++) {
    const mapped = fn(array[i], i)
    if (mapped !== null && mapped !== undefined) {
      result.push(mapped)
    }
  }
  return result
}

/**
 * Type-safe Object.keys
 */
export function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[]
}

/**
 * Type-safe Object.entries
 */
export function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][]
}

/**
 * Exhaustive check for switch/if statements
 * Ensures all cases are handled at compile time
 */
export function exhaustive(value: never, message?: string): never {
  throw new Error(message ?? `Unhandled case: ${JSON.stringify(value)}`)
}
