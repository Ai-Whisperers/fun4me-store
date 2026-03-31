'use client'

/**
 * ConsentToggle Component
 *
 * COMP-003: Toggle switch for individual consent preferences
 */

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lock } from 'lucide-react'

interface ConsentToggleProps {
  /** Unique identifier for the consent type */
  consentType: string
  /** Display label */
  label: string
  /** Description explaining the consent */
  description?: string
  /** Current consent state */
  checked: boolean
  /** Whether the consent is required (cannot be disabled) */
  required?: boolean
  /** Whether the toggle is disabled */
  disabled?: boolean
  /** Whether the toggle is loading */
  loading?: boolean
  /** Callback when consent changes */
  onChange: (granted: boolean) => void
}

export function ConsentToggle({
  consentType,
  label,
  description,
  checked,
  required = false,
  disabled = false,
  loading = false,
  onChange,
}: ConsentToggleProps) {
  const isDisabled = disabled || loading || (required && checked)

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-[var(--border-primary)] last:border-b-0">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`consent-${consentType}`}
            className="text-sm font-medium text-[var(--text-primary)] cursor-pointer"
          >
            {label}
          </Label>
          {required && (
            <Badge variant="outline" className="text-xs">
              <Lock className="w-3 h-3 mr-1" />
              Requerido
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
        )}
        <Switch
          id={`consent-${consentType}`}
          checked={checked}
          onCheckedChange={onChange}
          disabled={isDisabled}
          aria-describedby={description ? `consent-${consentType}-description` : undefined}
          aria-label={`${label}: ${checked ? 'activado' : 'desactivado'}`}
        />
      </div>
    </div>
  )
}
