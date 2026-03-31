/**
 * Safe Map/Set Access Utilities
 *
 * Provides type-safe helpers for accessing Map and Set values
 * without needing non-null assertions or unsafe casts.
 */

/**
 * Get a value from a Map, throwing if not found
 * Use when you're certain the key exists (e.g., after checking .has())
 *
 * @example
 * const map = new Map([['key', 'value']])
 * const value = getOrThrow(map, 'key') // 'value'
 * const missing = getOrThrow(map, 'missing') // throws Error
 */
export function getOrThrow<K, V>(map: Map<K, V>, key: K, errorMessage?: string): V {
  const value = map.get(key)
  if (value === undefined) {
    throw new Error(errorMessage ?? `Key not found in Map: ${String(key)}`)
  }
  return value
}

/**
 * Get a value from a Map with a default fallback
 *
 * @example
 * const map = new Map([['key', 5]])
 * const value = getOrDefault(map, 'key', 0) // 5
 * const missing = getOrDefault(map, 'other', 0) // 0
 */
export function getOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
  const value = map.get(key)
  return value !== undefined ? value : defaultValue
}

/**
 * Get a value from a Map, computing and storing if not found
 * Useful for caching/memoization patterns
 *
 * @example
 * const cache = new Map<string, ExpensiveResult>()
 * const result = getOrCompute(cache, 'key', () => computeExpensiveResult())
 */
export function getOrCompute<K, V>(map: Map<K, V>, key: K, compute: () => V): V {
  const existing = map.get(key)
  if (existing !== undefined) {
    return existing
  }
  const computed = compute()
  map.set(key, computed)
  return computed
}

/**
 * Get a value from a Map, computing async and storing if not found
 */
export async function getOrComputeAsync<K, V>(
  map: Map<K, V>,
  key: K,
  compute: () => Promise<V>
): Promise<V> {
  const existing = map.get(key)
  if (existing !== undefined) {
    return existing
  }
  const computed = await compute()
  map.set(key, computed)
  return computed
}

/**
 * Create a lookup Map from an array using a key extractor
 *
 * @example
 * const users = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]
 * const byId = createLookup(users, u => u.id)
 * // Map { '1' => { id: '1', name: 'Alice' }, '2' => { id: '2', name: 'Bob' } }
 */
export function createLookup<T, K>(items: T[], keyExtractor: (item: T) => K): Map<K, T> {
  const map = new Map<K, T>()
  for (const item of items) {
    map.set(keyExtractor(item), item)
  }
  return map
}

/**
 * Create a grouped Map from an array
 *
 * @example
 * const pets = [
 *   { id: '1', ownerId: 'a' },
 *   { id: '2', ownerId: 'a' },
 *   { id: '3', ownerId: 'b' }
 * ]
 * const byOwner = groupBy(pets, p => p.ownerId)
 * // Map { 'a' => [pet1, pet2], 'b' => [pet3] }
 */
export function groupBy<T, K>(items: T[], keyExtractor: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyExtractor(item)
    const group = map.get(key)
    if (group) {
      group.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return map
}

/**
 * Safely access an array element by index
 * Returns undefined if index is out of bounds
 */
export function safeGet<T>(array: T[], index: number): T | undefined {
  if (index < 0 || index >= array.length) {
    return undefined
  }
  return array[index]
}

/**
 * Get array element or throw if out of bounds
 */
export function getAtOrThrow<T>(array: T[], index: number, errorMessage?: string): T {
  if (index < 0 || index >= array.length) {
    throw new Error(errorMessage ?? `Index out of bounds: ${index} (length: ${array.length})`)
  }
  return array[index]
}

/**
 * Get the first element of an array or throw if empty
 */
export function firstOrThrow<T>(array: T[], errorMessage?: string): T {
  if (array.length === 0) {
    throw new Error(errorMessage ?? 'Array is empty')
  }
  return array[0]
}

/**
 * Get the first element or undefined
 * Type-safe alternative to array[0]
 */
export function first<T>(array: T[]): T | undefined {
  return array.length > 0 ? array[0] : undefined
}

/**
 * Get the last element or undefined
 */
export function last<T>(array: T[]): T | undefined {
  return array.length > 0 ? array[array.length - 1] : undefined
}

/**
 * Get the last element or throw if empty
 */
export function lastOrThrow<T>(array: T[], errorMessage?: string): T {
  if (array.length === 0) {
    throw new Error(errorMessage ?? 'Array is empty')
  }
  return array[array.length - 1]
}

/**
 * Find element or throw if not found
 * Useful when you expect the element to exist
 */
export function findOrThrow<T>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
  errorMessage?: string
): T {
  const found = array.find(predicate)
  if (found === undefined) {
    throw new Error(errorMessage ?? 'Element not found in array')
  }
  return found
}

/**
 * Convert Record to Map
 */
export function recordToMap<K extends string | number | symbol, V>(
  record: Record<K, V>
): Map<K, V> {
  return new Map(Object.entries(record) as [K, V][])
}

/**
 * Convert Map to Record (only works with string keys)
 */
export function mapToRecord<V>(map: Map<string, V>): Record<string, V> {
  const record: Record<string, V> = {}
  map.forEach((value, key) => {
    record[key] = value
  })
  return record
}
