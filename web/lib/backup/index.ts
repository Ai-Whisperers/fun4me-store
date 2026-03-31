/**
 * Backup Infrastructure
 *
 * DATA-001: Backup strategy utilities and verification tools
 *
 * This module provides utilities for backup verification, integrity checks,
 * and monitoring. The actual backup storage is handled by Supabase (primary)
 * and can be extended to S3 (secondary).
 */

export * from './verification'
export * from './integrity'
export * from './types'
