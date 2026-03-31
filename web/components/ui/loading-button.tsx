'use client'

import { forwardRef } from 'react'
import { Button, ButtonProps } from './button'

interface LoadingButtonProps extends ButtonProps {
  loadingText?: string
}

/**
 * LoadingButton - A button with explicit loading state management
 *
 * This is a convenience wrapper around Button that makes the loading state more explicit.
 * The base Button component already supports isLoading, but this component makes it clearer
 * when you specifically need loading behavior.
 *
 * @example
 * <LoadingButton
 *   isLoading={isSubmitting}
 *   loadingText="Guardando..."
 *   onClick={handleSubmit}
 * >
 *   Guardar
 * </LoadingButton>
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, isLoading, loadingText, ...props }, ref) => {
    return (
      <Button ref={ref} isLoading={isLoading} {...props}>
        {isLoading && loadingText ? loadingText : children}
      </Button>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'
