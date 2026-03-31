export interface BlanketConsent {
  id: string
  consent_type: string
  scope: string
  conditions: string | null
  signature_data: string
  granted_at: string
  expires_at: string | null
  is_active: boolean
  revoked_at: string | null
  revocation_reason: string | null
  granted_by: {
    full_name: string
  }
}
