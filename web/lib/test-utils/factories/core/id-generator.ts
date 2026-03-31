/**
 * Unified ID Generator for Test Factories
 *
 * Consolidates 3 different ID generation approaches:
 * - Sequential: test-1, test-2, ... (for deterministic unit tests)
 * - UUID: crypto.randomUUID() (for database-safe integration tests)
 *
 * @example
 * ```typescript
 * // Default UUID mode
 * const id = idGenerator.generate() // "a1b2c3d4-..."
 *
 * // Sequential mode for unit tests
 * idGenerator.setMode('sequential')
 * const id1 = idGenerator.generate() // "test-1"
 * const id2 = idGenerator.generate() // "test-2"
 * idGenerator.reset() // Back to test-1
 *
 * // With custom prefix
 * const id = idGenerator.generate('pet') // "pet-1" or UUID
 * ```
 */

import { randomUUID } from 'crypto'

export type IdMode = 'sequential' | 'uuid'

class IdGenerator {
  private mode: IdMode = 'uuid'
  private counter = 0
  private prefixCounters: Map<string, number> = new Map()

  /**
   * Set the ID generation mode
   */
  setMode(mode: IdMode): void {
    this.mode = mode
  }

  /**
   * Get current mode
   */
  getMode(): IdMode {
    return this.mode
  }

  /**
   * Generate a new ID
   * @param prefix Optional prefix for sequential IDs (e.g., 'pet', 'invoice')
   */
  generate(prefix?: string): string {
    if (this.mode === 'uuid') {
      return randomUUID()
    }

    // Sequential mode
    if (prefix) {
      const current = this.prefixCounters.get(prefix) ?? 0
      const next = current + 1
      this.prefixCounters.set(prefix, next)
      return `${prefix}-${next}`
    }

    this.counter++
    return `test-${this.counter}`
  }

  /**
   * Generate multiple IDs at once
   */
  generateBatch(count: number, prefix?: string): string[] {
    return Array.from({ length: count }, () => this.generate(prefix))
  }

  /**
   * Reset the counter(s) - typically called in beforeEach
   */
  reset(): void {
    this.counter = 0
    this.prefixCounters.clear()
  }

  /**
   * Reset and switch to sequential mode (common test setup pattern)
   */
  useSequentialMode(): void {
    this.setMode('sequential')
    this.reset()
  }

  /**
   * Reset and switch to UUID mode (common integration test pattern)
   */
  useUuidMode(): void {
    this.setMode('uuid')
    this.reset()
  }
}

// Singleton instance for global access
export const idGenerator = new IdGenerator()

// Convenience exports for backward compatibility
export function generateId(prefix?: string): string {
  return idGenerator.generate(prefix)
}

export function resetIdCounter(): void {
  idGenerator.reset()
}

// For tests that need isolated ID generation
export function createIdGenerator(): IdGenerator {
  return new IdGenerator()
}
