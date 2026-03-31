import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { NextIntlClientProvider } from 'next-intl'

// Mock the modal component
vi.mock('@/components/ui/modal', () => ({
  ConfirmModal: ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmLabel, 
    cancelLabel, 
    variant,
    isLoading 
  }: any) => {
    if (!isOpen) return null
    
    return (
      <div data-testid="confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <button 
          onClick={onClose}
          data-testid="cancel-button"
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
        <button 
          onClick={onConfirm}
          data-testid="confirm-button" 
          data-variant={variant}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : confirmLabel}
        </button>
      </div>
    )
  }
}))

// Mock translations
const messages = {
  common: {
    confirm: 'Confirmar',
    cancel: 'Cancelar',
  }
}

const renderWithIntl = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {component}
    </NextIntlClientProvider>
  )
}

describe('ConfirmDialog', () => {
  const defaultProps = {
    trigger: <button>Delete Pet</button>,
    title: '¿Eliminar mascota?',
    description: 'Esta acción no se puede deshacer.',
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger element', () => {
    renderWithIntl(<ConfirmDialog {...defaultProps} />)
    
    expect(screen.getByText('Delete Pet')).toBeInTheDocument()
  })

  it('does not show modal initially', () => {
    renderWithIntl(<ConfirmDialog {...defaultProps} />)
    
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()
  })

  it('opens modal when trigger is clicked', () => {
    renderWithIntl(<ConfirmDialog {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Delete Pet'))
    
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()
    expect(screen.getByText('¿Eliminar mascota?')).toBeInTheDocument()
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument()
  })

  it('closes modal when cancel is clicked', () => {
    renderWithIntl(<ConfirmDialog {...defaultProps} />)
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()
    
    // Close modal
    fireEvent.click(screen.getByTestId('cancel-button'))
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const mockOnConfirm = vi.fn().mockResolvedValue(undefined)
    
    renderWithIntl(
      <ConfirmDialog {...defaultProps} onConfirm={mockOnConfirm} />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Confirm action
    fireEvent.click(screen.getByTestId('confirm-button'))
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
  })

  it('closes modal after successful confirm', async () => {
    const mockOnConfirm = vi.fn().mockResolvedValue(undefined)
    
    renderWithIntl(
      <ConfirmDialog {...defaultProps} onConfirm={mockOnConfirm} />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()
    
    // Confirm action
    fireEvent.click(screen.getByTestId('confirm-button'))
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()
    })
  })

  it('handles async onConfirm errors gracefully', async () => {
    const mockOnConfirm = vi.fn().mockRejectedValue(new Error('Delete failed'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    renderWithIntl(
      <ConfirmDialog {...defaultProps} onConfirm={mockOnConfirm} />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Confirm action (should fail)
    fireEvent.click(screen.getByTestId('confirm-button'))
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Confirm action failed:', expect.any(Error))
    })
    
    // Modal should still be open after error
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('shows loading state during async confirm', async () => {
    let resolvePromise: () => void
    const mockOnConfirm = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
    })
    
    renderWithIntl(
      <ConfirmDialog {...defaultProps} onConfirm={mockOnConfirm} />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Start confirm action
    fireEvent.click(screen.getByTestId('confirm-button'))
    
    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // Resolve promise
    resolvePromise!()
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  it('uses default labels from translations', () => {
    renderWithIntl(<ConfirmDialog {...defaultProps} />)
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Should use translated labels
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('uses custom labels when provided', () => {
    renderWithIntl(
      <ConfirmDialog 
        {...defaultProps} 
        confirmLabel="Eliminar Ahora"
        cancelLabel="No, Cancelar"
      />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Should use custom labels
    expect(screen.getByText('Eliminar Ahora')).toBeInTheDocument()
    expect(screen.getByText('No, Cancelar')).toBeInTheDocument()
  })

  it('passes variant to modal component', () => {
    renderWithIntl(
      <ConfirmDialog {...defaultProps} variant="warning" />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Check variant is passed
    const confirmButton = screen.getByTestId('confirm-button')
    expect(confirmButton).toHaveAttribute('data-variant', 'warning')
  })

  it('defaults to danger variant', () => {
    renderWithIntl(<ConfirmDialog {...defaultProps} />)
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Check default variant
    const confirmButton = screen.getByTestId('confirm-button')
    expect(confirmButton).toHaveAttribute('data-variant', 'danger')
  })

  it('supports synchronous onConfirm functions', async () => {
    const mockOnConfirm = vi.fn() // No return value (synchronous)
    
    renderWithIntl(
      <ConfirmDialog {...defaultProps} onConfirm={mockOnConfirm} />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Confirm action
    fireEvent.click(screen.getByTestId('confirm-button'))
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    
    // Should close modal immediately for sync functions
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()
    })
  })

  it('handles custom trigger elements correctly', () => {
    const customTrigger = (
      <div>
        <span>Custom</span>
        <button>Action</button>
      </div>
    )
    
    renderWithIntl(
      <ConfirmDialog {...defaultProps} trigger={customTrigger} />
    )
    
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    
    // Clicking anywhere in the trigger should open modal
    fireEvent.click(screen.getByText('Custom'))
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()
  })

  it('disables buttons during loading', async () => {
    let resolvePromise: () => void
    const mockOnConfirm = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
    })
    
    renderWithIntl(
      <ConfirmDialog {...defaultProps} onConfirm={mockOnConfirm} />
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Delete Pet'))
    
    // Start confirm action
    fireEvent.click(screen.getByTestId('confirm-button'))
    
    // Buttons should be disabled during loading
    expect(screen.getByTestId('confirm-button')).toBeDisabled()
    expect(screen.getByTestId('cancel-button')).toBeDisabled()
    
    // Resolve promise
    resolvePromise!()
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()
    })
  })
})