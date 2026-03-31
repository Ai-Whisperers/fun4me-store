/**
 * Domain Configuration Types
 * Type definitions for the multi-tenant domain management system
 *
 * @see /web/.content_data/domains.json - Domain registry
 * @see /scripts/domains.mjs - CLI management tool
 */

// ============================================================================
// Enums & Unions
// ============================================================================

/** Type of domain mapping */
export type DomainType = 'primary' | 'subdomain' | 'redirect' | 'tunnel'

/** Domain hosting provider */
export type DomainProvider = 'vercel' | 'cloudflare' | 'selfhosted'

/** Domain verification status */
export type DomainStatus = 'pending' | 'active' | 'verifying' | 'failed'

/** SSL certificate provider */
export type SSLProvider = 'letsencrypt' | 'cloudflare' | 'custom'

/** DNS record types */
export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT'

// ============================================================================
// SSL Configuration
// ============================================================================

export interface SSLConfig {
  /** Whether SSL is enabled for this domain */
  enabled: boolean
  /** Whether to automatically renew certificates */
  autoRenew?: boolean
  /** SSL certificate provider */
  provider?: SSLProvider
  /** Certificate expiration date (ISO 8601) */
  expiresAt?: string
}

// ============================================================================
// DNS Records
// ============================================================================

export interface DNSRecord {
  /** DNS record type */
  type: DNSRecordType
  /** Record name (@ for root, www for subdomain, etc.) */
  name: string
  /** Record value (IP address, CNAME target, etc.) */
  value: string
  /** TTL in seconds (optional, provider default used if not specified) */
  ttl?: number
}

// ============================================================================
// Domain Entry
// ============================================================================

export interface DomainEntry {
  /** Full domain name (e.g., "terrapet.com.py") */
  domain: string
  /** Tenant/clinic slug from .content_data (e.g., "terrapet") */
  tenant: string
  /** Type of domain mapping */
  type: DomainType
  /** Hosting provider handling this domain */
  provider?: DomainProvider
  /** SSL certificate configuration */
  ssl?: SSLConfig
  /** Current verification status */
  status: DomainStatus
  /** When DNS was verified (ISO 8601) */
  verifiedAt?: string
  /** Required DNS records for this domain */
  dnsRecords?: DNSRecord
  /** Target domain for redirect type (e.g., www -> apex) */
  redirectTo?: string
  /** Cloudflare-specific configuration */
  cloudflare?: {
    /** Cloudflare Tunnel UUID */
    tunnelId?: string
    /** Cloudflare Zone ID */
    zoneId?: string
  }
  /** Arbitrary metadata for custom use */
  metadata?: Record<string, unknown>
  /** When this entry was created (ISO 8601) */
  createdAt?: string
  /** When this entry was last updated (ISO 8601) */
  updatedAt?: string
}

// ============================================================================
// Cloudflare Tunnel
// ============================================================================

export interface CloudflareTunnel {
  /** Tunnel UUID */
  id: string
  /** Human-readable tunnel name */
  name: string
  /** When the tunnel was created (ISO 8601) */
  createdAt?: string
  /** Current tunnel status */
  status: 'active' | 'inactive'
}

// ============================================================================
// Main Configuration
// ============================================================================

export interface DomainsConfig {
  /** JSON Schema reference */
  $schema?: string
  /** Config version for migrations */
  version: string
  /** Default/fallback domain (e.g., "vetic.vercel.app") */
  defaultDomain: string
  /** All domain mappings */
  domains: DomainEntry[]
  /** Cloudflare configuration */
  cloudflare?: {
    /** Registered tunnels */
    tunnels: CloudflareTunnel[]
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/** Domain lookup result from getDomainMapping() */
export type DomainLookupResult = DomainEntry | null

/** Map of domain -> tenant for fast lookups */
export type DomainTenantMap = Map<string, DomainEntry>
