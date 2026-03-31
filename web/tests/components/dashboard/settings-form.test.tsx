import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'
import GeneralSettingsPage from '@/app/[clinic]/dashboard/settings/general/page'
import { useParams } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="icon-building" />,
  Phone: () => <div data-testid="icon-phone" />,
  Mail: () => <div data-testid="icon-mail" />,
  MapPin: () => <div data-testid="icon-map-pin" />,
  Clock: () => <div data-testid="icon-clock" />,
  Save: () => <div data-testid="icon-save" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle: () => <div data-testid="icon-check" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
}))

describe('GeneralSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useParams as any).mockReturnValue({ clinic: 'terrapet' })

    // Mock fetch for initial data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          name: 'Old Name',
          tagline: 'Old Tagline',
          contact: { email: 'old@test.com' },
          hours: {},
          settings: { emergency_24h: false },
        },
      }),
    })
  })

  it('renders correctly and shows validation errors on empty submission', async () => {
    render(<GeneralSettingsPage />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument()
    })

    // Clear name field
    const nameInput = screen.getByLabelText(/Nombre de la Clínica/i)
    fireEvent.change(nameInput, { target: { value: '' } })

    // Submit form
    const saveButton = screen.getByText(/Guardar Cambios/i)
    fireEvent.click(saveButton)

    // Check for validation error (Zod message from shared schema)
    await waitFor(() => {
      expect(screen.getByText(/Nombre de la clínica es requerido/i)).toBeInTheDocument()
    })
  })

  it('successfully submits valid data', async () => {
    render(<GeneralSettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument()
    })

    // Change name
    const nameInput = screen.getByLabelText(/Nombre de la Clínica/i)
    fireEvent.change(nameInput, { target: { value: 'New Clinic Name' } })

    // Mock successful save
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (init?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: {} }) })
    })

    const saveButton = screen.getByText(/Guardar Cambios/i)
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/Cambios guardados/i)).toBeInTheDocument()
    })
  })
})
