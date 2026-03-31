'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PasswordInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  error?: boolean
  showStrength?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showStrength = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [strength, setStrength] = useState(0)

    const calculateStrength = (password: string): number => {
      let score = 0
      if (password.length >= 8) score++
      if (password.length >= 12) score++
      if (/[A-Z]/.test(password)) score++
      if (/[a-z]/.test(password)) score++
      if (/[0-9]/.test(password)) score++
      if (/[^A-Za-z0-9]/.test(password)) score++
      return Math.min(score, 5)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (showStrength) {
        setStrength(calculateStrength(e.target.value))
      }
      props.onChange?.(e)
    }

    const strengthColors = [
      'bg-gray-200',
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
    ]

    const strengthLabels = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte']

    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'min-h-[48px] w-full rounded-xl border px-4 py-3 pr-12 outline-none transition-all',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'focus:ring-[var(--primary)]/20 border-gray-200 focus:border-[var(--primary)] focus:ring-2',
              className
            )}
            ref={ref}
            onChange={handleChange}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {showStrength && props.value && String(props.value).length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    level <= strength ? strengthColors[strength] : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
            {strength > 0 && (
              <p
                className={cn(
                  'text-xs font-medium',
                  strength <= 2
                    ? 'text-red-600'
                    : strength <= 3
                      ? 'text-yellow-600'
                      : 'text-green-600'
                )}
              >
                {strengthLabels[strength]}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
