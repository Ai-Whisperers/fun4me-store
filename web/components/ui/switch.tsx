'use client'

import * as React from 'react'

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Whether the switch is checked */
  checked?: boolean
  /** Callback when the switch value changes */
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked)
    }

    return (
      <label
        className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } ${checked ? 'bg-[var(--primary)]' : 'bg-gray-300'} ${className || ''}`}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
          {...props}
        />
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </label>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
