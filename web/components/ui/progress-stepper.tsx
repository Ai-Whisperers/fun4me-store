'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  id: string | number
  label: string
  description?: string
  icon?: React.ReactNode
}

interface ProgressStepperProps {
  steps: Step[]
  currentStep: number
  variant?: 'default' | 'compact' | 'minimal'
  orientation?: 'horizontal' | 'vertical'
  onStepClick?: (stepIndex: number) => void
  className?: string
}

export function ProgressStepper({
  steps,
  currentStep,
  variant = 'default',
  orientation = 'horizontal',
  onStepClick,
  className,
}: ProgressStepperProps): React.ReactElement {
  const isVertical = orientation === 'vertical'
  const isCompact = variant === 'compact'
  const isMinimal = variant === 'minimal'

  return (
    <nav
      aria-label="Progreso"
      className={cn(isVertical ? 'flex flex-col' : 'flex items-center justify-between', className)}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isClickable = onStepClick && (isCompleted || isCurrent)

        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center',
              isVertical && 'flex-col items-start',
              !isVertical && index < steps.length - 1 && 'flex-1'
            )}
          >
            {/* Step indicator */}
            <div className={cn('flex items-center', isVertical && 'w-full')}>
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center justify-center rounded-full font-bold transition-all',
                  isCompact || isMinimal ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm',
                  isCompleted && 'bg-[var(--primary)] text-white shadow-md',
                  isCurrent &&
                    'bg-[var(--primary)]/20 text-[var(--primary)] ring-2 ring-[var(--primary)] ring-offset-2',
                  !isCompleted && !isCurrent && 'bg-gray-100 text-gray-400',
                  isClickable && 'cursor-pointer hover:scale-110',
                  !isClickable && 'cursor-default'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className={cn(isCompact || isMinimal ? 'h-4 w-4' : 'h-5 w-5')} />
                ) : step.icon ? (
                  step.icon
                ) : (
                  index + 1
                )}
              </button>

              {/* Step label (non-minimal) */}
              {!isMinimal && (
                <div
                  className={cn(
                    'ml-3',
                    isVertical && 'flex-1',
                    !isVertical && isCompact && 'hidden md:block'
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-bold',
                      isCompleted && 'text-[var(--primary)]',
                      isCurrent && 'text-[var(--text-primary)]',
                      !isCompleted && !isCurrent && 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && !isCompact && (
                    <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'transition-colors',
                  isVertical ? 'my-2 ml-[19px] h-8 w-0.5' : 'mx-4 h-0.5 flex-1',
                  isCompleted ? 'bg-[var(--primary)]' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Simple numeric progress indicator
interface ProgressIndicatorProps {
  current: number
  total: number
  label?: string
  className?: string
}

export function ProgressIndicator({
  current,
  total,
  label,
  className,
}: ProgressIndicatorProps): React.ReactElement {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-600">{label || `Paso ${current} de ${total}`}</span>
        <span className="font-bold text-[var(--primary)]">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Dot-style progress indicator
interface DotProgressProps {
  steps: number
  currentStep: number
  onDotClick?: (index: number) => void
  className?: string
}

export function DotProgress({
  steps,
  currentStep,
  onDotClick,
  className,
}: DotProgressProps): React.ReactElement {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {Array.from({ length: steps }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onDotClick?.(index)}
          disabled={!onDotClick}
          className={cn(
            'rounded-full transition-all',
            index === currentStep
              ? 'h-2 w-8 bg-[var(--primary)]'
              : index < currentStep
                ? 'bg-[var(--primary)]/60 h-2 w-2'
                : 'h-2 w-2 bg-gray-200',
            onDotClick && 'cursor-pointer hover:scale-110'
          )}
          aria-label={`Paso ${index + 1}`}
          aria-current={index === currentStep ? 'step' : undefined}
        />
      ))}
    </div>
  )
}
