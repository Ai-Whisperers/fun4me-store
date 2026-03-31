/**
 * SignupForm Component Tests
 *
 * Tests the signup form component including:
 * - Render with all required fields
 * - Form validation
 * - Success state display
 * - Error display
 * - Navigation links
 *
 * @ticket TEST-002
 */
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'

// Mock modules before component import
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/app/auth/actions', () => ({
  signup: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  UserPlus: () => <span data-testid="icon-userplus" />,
  User: () => <span data-testid="icon-user" />,
  Mail: () => <span data-testid="icon-mail" />,
  Lock: () => <span data-testid="icon-lock" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  Loader2: () => <span data-testid="icon-loader" />,
  MailCheck: () => <span data-testid="icon-mailcheck" />,
}))

// Mock PasswordInput
vi.mock('@/components/ui/password-input', () => ({
  PasswordInput: ({ id, name, required, placeholder, showStrength, className }: {
    id: string
    name: string
    required?: boolean
    placeholder?: string
    showStrength?: boolean
    className?: string
  }) => (
    <input
      id={id}
      name={name}
      type="password"
      required={required}
      placeholder={placeholder}
      data-show-strength={showStrength}
      className={className}
      aria-label="Contraseña"
    />
  ),
}))

// Mock React's useActionState
let mockActionState: [{ error?: string; success?: boolean } | null, Mock, boolean] = [null, vi.fn(), false]

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useActionState: () => mockActionState,
  }
})

import { SignupForm } from '@/components/auth/signup-form'

describe('SignupForm', () => {
  const defaultProps = {
    clinic: 'terrapet',
    redirectTo: '/terrapet/portal/dashboard',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockActionState = [null, vi.fn(), false]
  })

  describe('Rendering', () => {
    it('renders the signup form with all required elements', () => {
      render(<SignupForm {...defaultProps} />)

      // Check header
      expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument()
      expect(screen.getByText(/únete para gestionar/i)).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()

      // Check submit button
      expect(screen.getByRole('button', { name: /registrarme/i })).toBeInTheDocument()
    })

    it('renders name input with correct attributes', () => {
      render(<SignupForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/nombre completo/i)
      expect(nameInput).toHaveAttribute('type', 'text')
      expect(nameInput).toHaveAttribute('required')
      expect(nameInput).toHaveAttribute('placeholder', 'Juan Pérez')
    })

    it('renders email input with correct attributes', () => {
      render(<SignupForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'tu@email.com')
    })

    it('renders password input with strength indicator', () => {
      render(<SignupForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      expect(passwordInput).toHaveAttribute('data-show-strength', 'true')
    })

    it('includes hidden form fields for clinic and redirect', () => {
      render(<SignupForm {...defaultProps} />)

      const clinicInput = document.querySelector('input[name="clinic"]')
      const redirectInput = document.querySelector('input[name="redirect"]')

      expect(clinicInput).toHaveValue('terrapet')
      expect(redirectInput).toHaveValue('/terrapet/portal/dashboard')
    })
  })

  describe('Success State', () => {
    it('displays success message when signup succeeds', () => {
      mockActionState = [{ success: true }, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      // Check success heading
      expect(screen.getByRole('heading', { name: /cuenta creada/i })).toBeInTheDocument()

      // Check success message
      expect(screen.getByText(/hemos enviado un correo/i)).toBeInTheDocument()
      expect(screen.getByText(/revisa tu bandeja/i)).toBeInTheDocument()

      // Check back to login link
      expect(screen.getByText(/volver al login/i)).toHaveAttribute('href', '/terrapet/portal/login')
    })

    it('shows success icon', () => {
      mockActionState = [{ success: true }, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      expect(screen.getByTestId('icon-mailcheck')).toBeInTheDocument()
    })

    it('does not show form when success', () => {
      mockActionState = [{ success: true }, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      expect(screen.queryByLabelText(/nombre completo/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /registrarme/i })).not.toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('displays error message from form state', () => {
      mockActionState = [{ error: 'El email ya está registrado' }, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('El email ya está registrado')).toBeInTheDocument()
    })

    it('shows alert icon with error', () => {
      mockActionState = [{ error: 'Test error' }, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      expect(screen.getByTestId('icon-alert')).toBeInTheDocument()
    })

    it('does not display error when state is null', () => {
      mockActionState = [null, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('disables submit button when pending', () => {
      mockActionState = [null, vi.fn(), true]
      render(<SignupForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: '' }) // Button shows loader when pending
      expect(submitButton).toBeDisabled()
    })

    it('shows loader icon when pending', () => {
      mockActionState = [null, vi.fn(), true]
      render(<SignupForm {...defaultProps} />)

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('renders login link with correct href', () => {
      render(<SignupForm {...defaultProps} />)

      const loginLink = screen.getByText(/inicia sesión/i)
      expect(loginLink).toHaveAttribute('href', '/terrapet/portal/login')
    })

    it('includes redirect param in login link when redirectTo is not default', () => {
      render(<SignupForm clinic="terrapet" redirectTo="/terrapet/portal/pets/123" />)

      const loginLink = screen.getByText(/inicia sesión/i)
      expect(loginLink.getAttribute('href')).toContain('redirect')
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<SignupForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/nombre completo/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      expect(nameInput.id).toBe('fullName')
      expect(emailInput.id).toBe('signup-email')
      expect(passwordInput.id).toBe('signup-password')
    })

    it('error alert has proper attributes', () => {
      mockActionState = [{ error: 'Test error' }, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('icons have aria-hidden attribute', () => {
      mockActionState = [{ error: 'Test error' }, vi.fn(), false]
      render(<SignupForm {...defaultProps} />)

      // The AlertCircle icon in error should be hidden from screen readers
      const alertIcon = screen.getByTestId('icon-alert')
      expect(alertIcon).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('requires name field', () => {
      render(<SignupForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/nombre completo/i)
      expect(nameInput).toHaveAttribute('required')
    })

    it('requires email field', () => {
      render(<SignupForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('required')
    })

    it('requires password field', () => {
      render(<SignupForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      expect(passwordInput).toHaveAttribute('required')
    })
  })
})
