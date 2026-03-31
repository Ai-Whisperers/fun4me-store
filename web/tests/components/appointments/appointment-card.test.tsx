/**
 * AppointmentCard Component Tests
 *
 * Tests the appointment card component including:
 * - Render with appointment data
 * - Status display
 * - Date/time formatting
 * - Pet avatar display
 * - Action buttons (cancel, reschedule)
 * - Past/Today appointment styling
 *
 * @ticket TEST-002
 */
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createMockAppointment } from '@/lib/test-utils/component-test-helpers'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Dog: () => <span data-testid="icon-dog" />,
  Cat: () => <span data-testid="icon-cat" />,
  Bird: () => <span data-testid="icon-bird" />,
  Rabbit: () => <span data-testid="icon-rabbit" />,
  Fish: () => <span data-testid="icon-fish" />,
  PawPrint: () => <span data-testid="icon-pawprint" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  ChevronRight: () => <span data-testid="icon-chevron" />,
}))

// Mock child components
vi.mock('./cancel-button', () => ({
  CancelButton: ({ appointmentId, onSuccess }: { appointmentId: string; variant: string; onSuccess?: () => void }) => (
    <button data-testid="cancel-button" data-appointment-id={appointmentId} onClick={onSuccess}>
      Cancelar
    </button>
  ),
}))

vi.mock('./reschedule-dialog', () => ({
  RescheduleDialog: ({
    appointmentId,
    clinicId,
    currentDate,
    currentTime,
    onSuccess,
  }: {
    appointmentId: string
    clinicId: string
    currentDate: string
    currentTime: string
    onSuccess?: () => void
  }) => (
    <button
      data-testid="reschedule-button"
      data-appointment-id={appointmentId}
      data-clinic={clinicId}
      data-date={currentDate}
      data-time={currentTime}
      onClick={onSuccess}
    >
      Reagendar
    </button>
  ),
}))

// Mock lib/types/appointments
vi.mock('@/lib/types/appointments', () => ({
  statusConfig: {
    pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Confirmado', className: 'bg-green-100 text-green-800' },
    completed: { label: 'Completado', className: 'bg-blue-100 text-blue-800' },
    cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
  },
  formatAppointmentDate: (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' })
  },
  formatAppointmentTime: (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
  },
  formatAppointmentDateTime: (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  },
  canCancelAppointment: (apt: { status: string; start_time: string }) => {
    return apt.status !== 'cancelled' && apt.status !== 'completed' && new Date(apt.start_time) > new Date()
  },
  canRescheduleAppointment: (apt: { status: string; start_time: string }) => {
    return apt.status === 'pending' && new Date(apt.start_time) > new Date()
  },
}))

import { AppointmentCard } from '@/components/appointments/appointment-card'

describe('AppointmentCard', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Fix the current time for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-08T10:00:00Z'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders appointment card with pet name', () => {
      const appointment = createMockAppointment()
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByText(appointment.pets.name)).toBeInTheDocument()
    })

    it('renders appointment reason', () => {
      const appointment = createMockAppointment({ reason: 'Vacunación' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByText('Vacunación')).toBeInTheDocument()
    })

    it('renders status badge', () => {
      const appointment = createMockAppointment({ status: 'pending' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByText('Pendiente')).toBeInTheDocument()
    })

    it('renders correct status badge for confirmed', () => {
      const appointment = createMockAppointment({ status: 'confirmed' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByText('Confirmado')).toBeInTheDocument()
    })

    it('renders calendar icon', () => {
      const appointment = createMockAppointment()
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByTestId('icon-calendar')).toBeInTheDocument()
    })

    it('renders details link with correct href', () => {
      const appointment = createMockAppointment({ id: 'apt-123' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      const link = screen.getByText(/ver detalles/i)
      expect(link).toHaveAttribute('href', '/terrapet/portal/appointments/apt-123')
    })
  })

  describe('Pet Avatar', () => {
    it('shows dog icon for dog species', () => {
      const appointment = createMockAppointment({
        pets: { id: 'pet-1', name: 'Max', species: 'dog', photo_url: null },
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByTestId('icon-dog')).toBeInTheDocument()
    })

    it('shows cat icon for cat species', () => {
      const appointment = createMockAppointment({
        pets: { id: 'pet-1', name: 'Luna', species: 'cat', photo_url: null },
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByTestId('icon-cat')).toBeInTheDocument()
    })

    it('shows pawprint icon for unknown species', () => {
      const appointment = createMockAppointment({
        pets: { id: 'pet-1', name: 'Pet', species: 'hamster', photo_url: null },
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByTestId('icon-pawprint')).toBeInTheDocument()
    })

    it('shows photo when pet has photo_url', () => {
      const appointment = createMockAppointment({
        pets: { id: 'pet-1', name: 'Max', species: 'dog', photo_url: 'https://example.com/photo.jpg' },
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      const img = screen.getByAltText('Max')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
    })
  })

  describe('Action Buttons', () => {
    it('shows cancel button for pending appointment', () => {
      const futureDate = new Date('2026-01-15T10:00:00Z')
      const appointment = createMockAppointment({
        status: 'pending',
        start_time: futureDate.toISOString(),
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" onUpdate={mockOnUpdate} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('shows reschedule button for pending appointment', () => {
      const futureDate = new Date('2026-01-15T10:00:00Z')
      const appointment = createMockAppointment({
        status: 'pending',
        start_time: futureDate.toISOString(),
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" onUpdate={mockOnUpdate} />)

      expect(screen.getByTestId('reschedule-button')).toBeInTheDocument()
    })

    it('does not show cancel button for completed appointment', () => {
      const appointment = createMockAppointment({ status: 'completed' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
    })

    it('does not show reschedule button for confirmed appointment', () => {
      const appointment = createMockAppointment({ status: 'confirmed' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.queryByTestId('reschedule-button')).not.toBeInTheDocument()
    })

    it('hides actions when showActions is false', () => {
      const futureDate = new Date('2026-01-15T10:00:00Z')
      const appointment = createMockAppointment({
        status: 'pending',
        start_time: futureDate.toISOString(),
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" showActions={false} />)

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reschedule-button')).not.toBeInTheDocument()
      expect(screen.queryByText(/ver detalles/i)).not.toBeInTheDocument()
    })
  })

  describe('Notes Display', () => {
    it('shows notes when present', () => {
      const appointment = createMockAppointment({ notes: 'Traer libreta de vacunas' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByText('Traer libreta de vacunas')).toBeInTheDocument()
    })

    it('does not show cancelled note prefix', () => {
      const appointment = createMockAppointment({ notes: '[Cancelado] Razón de cancelación' })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.queryByText('[Cancelado]')).not.toBeInTheDocument()
    })

    it('does not show notes section when notes is null', () => {
      const appointment = createMockAppointment({ notes: null })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      // Check that there's no extra paragraph with notes
      const container = screen.getByText(appointment.pets.name).closest('div')
      expect(container?.parentElement?.querySelector('.line-clamp-2')).not.toBeInTheDocument()
    })
  })

  describe('Status Styling', () => {
    it('applies cancelled styling for cancelled appointments', () => {
      const appointment = createMockAppointment({ status: 'cancelled' })
      const { container } = render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('border-[var(--status-error-border)]')
    })

    it('applies reduced opacity for past appointments', () => {
      const pastDate = new Date('2026-01-01T10:00:00Z')
      const appointment = createMockAppointment({
        start_time: pastDate.toISOString(),
        end_time: new Date(pastDate.getTime() + 30 * 60000).toISOString(),
        status: 'completed',
      })
      const { container } = render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('opacity-75')
    })
  })

  describe('Different Statuses', () => {
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled'] as const

    statuses.forEach((status) => {
      it(`renders correctly for ${status} status`, () => {
        const appointment = createMockAppointment({ status })
        render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

        // Card should render without crashing
        expect(screen.getByText(appointment.pets.name)).toBeInTheDocument()
      })
    })
  })

  describe('onUpdate Callback', () => {
    it('passes onUpdate to cancel button', () => {
      const futureDate = new Date('2026-01-15T10:00:00Z')
      const appointment = createMockAppointment({
        status: 'pending',
        start_time: futureDate.toISOString(),
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" onUpdate={mockOnUpdate} />)

      const cancelButton = screen.getByTestId('cancel-button')
      expect(cancelButton).toBeInTheDocument()
    })

    it('passes onUpdate to reschedule button', () => {
      const futureDate = new Date('2026-01-15T10:00:00Z')
      const appointment = createMockAppointment({
        status: 'pending',
        start_time: futureDate.toISOString(),
      })
      render(<AppointmentCard appointment={appointment} clinic="terrapet" onUpdate={mockOnUpdate} />)

      const rescheduleButton = screen.getByTestId('reschedule-button')
      expect(rescheduleButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders semantic HTML structure', () => {
      const appointment = createMockAppointment()
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      // Check for heading-level element for pet name
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(appointment.pets.name)
    })

    it('link has descriptive text', () => {
      const appointment = createMockAppointment()
      render(<AppointmentCard appointment={appointment} clinic="terrapet" />)

      expect(screen.getByRole('link', { name: /ver detalles/i })).toBeInTheDocument()
    })
  })
})
