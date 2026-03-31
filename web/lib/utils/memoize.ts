/**
 * Memoization Utility
 *
 * Provides function memoization with optional TTL and size limits.
 * Useful for caching expensive computations and API calls.
 */

export interface MemoizeOptions {
  /**
   * Maximum number of cached results (default: 100)
   * When exceeded, oldest entries are removed (FIFO)
   */
  maxSize?: number

  /**
   * Time-to-live in milliseconds (optional)
   * Cached results expire after this duration
   */
  ttlMs?: number

  /**
   * Custom key generator function (optional)
   * By default, uses JSON.stringify on arguments
   */
  keyGenerator?: (...args: unknown[]) => string
}

interface CacheEntry<T> {
  value: T
  timestamp: number
}

/**
 * Memoize a function with optional TTL and size limits
 *
 * @param fn - Function to memoize
 * @param options - Memoization options
 * @returns Memoized function
 *
 * @example
 * const expensiveCalculation = (a: number, b: number) => {
 *   // Expensive computation
 *   return a * b
 * }
 *
 * const memoized = memoize(expensiveCalculation, {
 *   maxSize: 50,
 *   ttlMs: 60000, // 1 minute
 * })
 *
 * memoized(5, 10) // Computed
 * memoized(5, 10) // Cached result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoize<T extends (...args: any[]) => any>(fn: T, options: MemoizeOptions = {}): T {
  const { maxSize = 100, ttlMs, keyGenerator } = options
  const cache = new Map<string, CacheEntry<ReturnType<T>>>()

  return ((...args: Parameters<T>): ReturnType<T> => {
    // Generate cache key
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    // Check if cached result exists
    const cached = cache.get(key)

    if (cached) {
      // Check if cached result is still valid (TTL)
      if (!ttlMs || Date.now() - cached.timestamp < ttlMs) {
        return cached.value
      }
      // Expired, remove from cache
      cache.delete(key)
    }

    // Compute result
    const result = fn(...args)

    // Enforce max size limit (FIFO)
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }

    // Store in cache
    cache.set(key, { value: result, timestamp: Date.now() })
    return result
  }) as T
}

/**
 * Memoize async function with optional TTL and size limits
 *
 * @param fn - Async function to memoize
 * @param options - Memoization options
 * @returns Memoized async function
 *
 * @example
 * const fetchUser = async (userId: string) => {
 *   const response = await fetch(`/api/users/${userId}`)
 *   return response.json()
 * }
 *
 * const memoized = memoizeAsync(fetchUser, {
 *   ttlMs: 300000, // 5 minutes
 * })
 *
 * await memoized('123') // Fetched from API
 * await memoized('123') // Cached result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: MemoizeOptions = {}
): T {
  const { maxSize = 100, ttlMs, keyGenerator } = options
  const cache = new Map<string, CacheEntry<Awaited<ReturnType<T>>>>()
  const pending = new Map<string, Promise<Awaited<ReturnType<T>>>>()

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    // Generate cache key
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    // Check if cached result exists
    const cached = cache.get(key)

    if (cached) {
      // Check if cached result is still valid (TTL)
      if (!ttlMs || Date.now() - cached.timestamp < ttlMs) {
        return cached.value
      }
      // Expired, remove from cache
      cache.delete(key)
    }

    // Check if there's a pending request for the same key
    const pendingRequest = pending.get(key)
    if (pendingRequest) {
      return pendingRequest
    }

    // Execute function and cache the promise
    const promise = fn(...args)
    pending.set(key, promise)

    try {
      const result = await promise

      // Enforce max size limit (FIFO)
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value
        if (firstKey) cache.delete(firstKey)
      }

      // Store in cache
      cache.set(key, { value: result, timestamp: Date.now() })
      return result
    } finally {
      // Remove from pending
      pending.delete(key)
    }
  }) as T
}

/**
 * Create a memoized version of a class method
 *
 * Use as a decorator (experimental) or manually
 *
 * @example
 * class Calculator {
 *   @Memoize({ ttlMs: 60000 })
 *   expensiveCalculation(a: number, b: number) {
 *     return a * b
 *   }
 * }
 */
export function Memoize(options: MemoizeOptions = {}): MethodDecorator {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    descriptor.value = memoize(originalMethod, options)
    return descriptor
  }
}

/**
 * Clear cache for a memoized function (if exposed)
 *
 * @example
 * const memoized = memoize(fn)
 * memoized.clear() // Clear cache
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MemoizedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>
  clear: () => void
  size: () => number
}

/**
 * Create a memoized function with cache control methods
 *
 * @param fn - Function to memoize
 * @param options - Memoization options
 * @returns Memoized function with cache control
 *
 * @example
 * const memoized = memoizeWithControl(expensiveFn, { maxSize: 10 })
 * memoized(1, 2)
 * console.log(memoized.size()) // 1
 * memoized.clear()
 * console.log(memoized.size()) // 0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoizeWithControl<T extends (...args: any[]) => any>(
  fn: T,
  options: MemoizeOptions = {}
): MemoizedFunction<T> {
  const { maxSize = 100, ttlMs, keyGenerator } = options
  const cache = new Map<string, CacheEntry<ReturnType<T>>>()

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    const cached = cache.get(key)

    if (cached) {
      if (!ttlMs || Date.now() - cached.timestamp < ttlMs) {
        return cached.value
      }
      cache.delete(key)
    }

    const result = fn(...args)

    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }

    cache.set(key, { value: result, timestamp: Date.now() })
    return result
  }) as MemoizedFunction<T>

  memoized.clear = () => cache.clear()
  memoized.size = () => cache.size

  return memoized
}
