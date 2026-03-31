/**
 * Query Library for TanStack React Query
 *
 * RES-001: React Query Migration
 *
 * This library provides:
 * - Centralized query key management
 * - Reusable query hooks
 * - Type-safe data fetching
 *
 * Usage:
 * ```typescript
 * import { queryKeys, useInventoryList } from '@/lib/queries'
 *
 * // Using a query hook
 * const { data, isLoading } = useInventoryList(clinic, { category: 'food' })
 *
 * // Invalidating queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
 * ```
 */

// Query keys
export { queryKeys, getAllKeysForDomain } from './keys'
export type {
  QueryKeys,
  DashboardQueryKeys,
  InventoryQueryKeys,
  AppointmentsQueryKeys,
  PetsQueryKeys,
  ClinicalQueryKeys,
  StoreQueryKeys,
} from './keys'

// Query utilities
export { createFetcher, createMutationFn, type FetcherOptions } from './utils'

// Domain-specific query hooks
export * from './inventory'
export * from './dashboard'
export * from './clinical'
export * from './appointments'
export * from './store'
export * from './pets'
