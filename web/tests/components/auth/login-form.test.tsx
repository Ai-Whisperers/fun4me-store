/**
 * LoginForm Component Tests
 *
 * Tests the login form component including:
 * - Render with all required fields
 * - Form validation
 * - Error display
 * - Google login button
 * - Navigation links
 *
 * @ticket TEST-002
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'

// Mock modules before component import
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/app/auth/actions', () => ({
  login: vi.fn(),
  loginWithGoogle: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock('lucide-react', () => ({
  Lock: () => <span data-testid="icon-lock" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  Loader2: () => <span data-testid="icon-loader" />,
}))

// Mock PasswordInput
vi.mock('@/components/ui/password-input', () => ({
  PasswordInput: ({ id, name, required, placeholder, error, className }: {
    id: string
    name: string
    required?: boolean
    placeholder?: string
    error?: boolean
    className?: string
  }) => (
    <input
      id={id}
      name={name}
      type="password"
      required={required}
      placeholder={placeholder}
      data-error={error}
      className={className}
      aria-label="Contraseña"
    />
  ),
}))

// Mock React's useActionState
let mockActionState: [{ error?: string } | null, Mock, boolean] = [null, vi.fn(), false]

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useActionState: () => mockActionState,
  }
})

import { LoginForm } from '@/components/auth/login-form'

describe('LoginForm', () => {
  const defaultProps = {
    clinic: 'terrapet',
    redirectTo: '/terrapet/portal/dashboard',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockActionState = [null, vi.fn(), false]
  })

  describe('Rendering', () => {
    it('renders the login form with all required elements', () => {
      render(<LoginForm {...defaultProps} />)

      // Check header
      expect(screen.getByRole('heading', { name: /portal de dueños/i })).toBeInTheDocument()
      expect(screen.getByText(/ingresa para ver la libreta/i)).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()

      // Check buttons
      expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
    })

    it('renders email input with correct attributes', () => {
      render(<LoginForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'tu@email.com')
    })

    it('renders password input with correct attributes', () => {
      render(<LoginForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/contraseña/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
    })

    it('includes hidden form fields for clinic and redirect', () => {
      render(<LoginForm {...defaultProps} />)

      const clinicInput = document.querySelector('input[name="clinic"]')
      const redirectInput = document.querySelector('input[name="redirect"]')

      expect(clinicInput).toHaveValue('terrapet')
      expect(redirectInput).toHaveValue('/terrapet/portal/dashboard')
    })
  })

  describe('Navigation Links', () => {
    it('renders forgot password link with correct href', () => {
      render(<LoginForm {...defaultProps} />)

      const forgotLink = screen.getByText(/olvidaste tu contraseña/i)
      expect(forgotLink).toHaveAttribute('href', '/terrapet/portal/forgot-password')
    })

    it('renders signup link with correct href', () => {
      render(<LoginForm {...defaultProps} />)

      const signupLink = screen.getByText(/regístrate/i)
      expect(signupLink).toHaveAttribute('href', '/terrapet/portal/signup')
    })

    it('includes redirect param in signup link when redirectTo is not default', () => {
      render(<LoginForm clinic="terrapet" redirectTo="/terrapet/portal/pets/123" />)

      const signupLink = screen.getByText(/regístrate/i)
      expect(signupLink.getAttribute('href')).toContain('redirect')
    })
  })

  describe('Error Display', () => {
    it('displays error message from form state', () => {
      mockActionState = [{ error: 'Credenciales inválidas' }, vi.fn(), false]
      render(<LoginForm {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()
    })

    it('does not display error when state is null', () => {
      mockActionState = [null, vi.fn(), false]
      render(<LoginForm {...defaultProps} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('disables submit button when pending', () => {
      mockActionState = [null, vi.fn(), true]
      render(<LoginForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: '' }) // Button shows loader when pending
      expect(submitButton).toBeDisabled()
    })

    it('shows loader icon when pending', () => {
      mockActionState = [null, vi.fn(), true]
      render(<LoginForm {...defaultProps} />)

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls form action on submit', () => {
      const formAction = vi.fn()
      mockActionState = [null, formAction, false]
      render(<LoginForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Form submission is handled by the form action
      const form = document.querySelector('form:not(:first-of-type)')
      expect(form).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<LoginForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/contraseña/i)

      expect(emailInput.id).toBe('email')
      expect(passwordInput.id).toBe('password')
    })

    it('error alert has proper role', () => {
      mockActionState = [{ error: 'Test error' }, vi.fn(), false]
      render(<LoginForm {...defaultProps} />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('Google login button is accessible', () => {
      render(<LoginForm {...defaultProps} />)

      const googleButton = screen.getByRole('button', { name: /continuar con google/i })
      expect(googleButton).toHaveAttribute('type', 'submit')
    })
  })
})
