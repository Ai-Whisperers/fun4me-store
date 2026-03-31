/**
 * PetVaccinesTab Component Tests
 *
 * Tests the pet vaccines tab component including:
 * - Render with vaccine data
 * - Vaccine categorization (overdue, upcoming, up-to-date)
 * - Status summary display
 * - Vaccine reactions display
 * - Empty state
 * - Staff-only actions
 *
 * @ticket TEST-002
 */
import { render, screen, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Syringe: () => <span data-testid="icon-syringe" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Clock: () => <span data-testid="icon-clock" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  AlertTriangle: () => <span data-testid="icon-warning" />,
  Plus: () => <span data-testid="icon-plus" />,
  FileText: () => <span data-testid="icon-file" />,
  ChevronRight: () => <span data-testid="icon-chevron" />,
}))

// Mock MissingVaccinesCard
vi.mock('../missing-vaccines-card', () => ({
  MissingVaccinesCard: ({ petName, species }: { petName: string; species: string }) => (
    <div data-testid="missing-vaccines-card" data-pet={petName} data-species={species}>
      Missing Vaccines for {petName}
    </div>
  ),
}))

import { PetVaccinesTab } from '@/components/pets/tabs/pet-vaccines-tab'

describe('PetVaccinesTab', () => {
  const defaultProps = {
    petId: 'pet-123',
    petName: 'Max',
    petSpecies: 'dog',
    petBirthDate: '2020-05-15',
    clinic: 'terrapet',
    vaccines: [],
  }

  // Create vaccines with different due dates relative to test date
  const createVaccine = (
    id: string,
    name: string,
    daysFromNow: number | null,
    administeredDaysAgo: number = 365
  ) => {
    const today = new Date('2026-01-08T10:00:00Z')
    return {
      id,
      name,
      vaccine_code: `CODE-${id}`,
      administered_date: new Date(today.getTime() - administeredDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      next_due_date: daysFromNow !== null
        ? new Date(today.getTime() + daysFromNow * 24 * 60 * 60 * 1000).toISOString()
        : null,
      status: 'administered',
      lot_number: 'LOT123',
      manufacturer: 'VetPharm',
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-08T10:00:00Z'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('Header Rendering', () => {
    it('renders pet name in header', () => {
      render(<PetVaccinesTab {...defaultProps} />)

      expect(screen.getByText('Vacunas de Max')).toBeInTheDocument()
    })

    it('shows correct vaccine count', () => {
      const vaccines = [
        createVaccine('v1', 'Rabia', 30),
        createVaccine('v2', 'Moquillo', 60),
      ]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText('2 vacunas registradas')).toBeInTheDocument()
    })

    it('handles singular vaccine count', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 30)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText('1 vacuna registrada')).toBeInTheDocument()
    })

    it('renders certificate link', () => {
      render(<PetVaccinesTab {...defaultProps} />)

      const certificateLink = screen.getByText(/certificado/i)
      expect(certificateLink).toHaveAttribute('href', '/terrapet/portal/pets/pet-123/vaccines/certificate')
    })
  })

  describe('Staff Actions', () => {
    it('shows new vaccine button for staff', () => {
      render(<PetVaccinesTab {...defaultProps} isStaff={true} />)

      const newVaccineLink = screen.getByText(/nueva vacuna/i)
      expect(newVaccineLink).toHaveAttribute('href', '/terrapet/portal/pets/pet-123/vaccines/new')
    })

    it('hides new vaccine button for non-staff', () => {
      render(<PetVaccinesTab {...defaultProps} isStaff={false} />)

      expect(screen.queryByText(/nueva vacuna/i)).not.toBeInTheDocument()
    })
  })

  describe('Vaccine Categorization', () => {
    it('categorizes overdue vaccines correctly', () => {
      const vaccines = [
        createVaccine('v1', 'Rabia Vencida', -10), // 10 days overdue
      ]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      // Should show in overdue section
      expect(screen.getByText(/vacunas vencidas/i)).toBeInTheDocument()
      expect(screen.getByText('Rabia Vencida')).toBeInTheDocument()
    })

    it('categorizes upcoming vaccines correctly', () => {
      const vaccines = [
        createVaccine('v1', 'Rabia Próxima', 15), // Due in 15 days
      ]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      // Should show in upcoming section
      expect(screen.getByText(/próximas \(30 días\)/i)).toBeInTheDocument()
      expect(screen.getByText('Rabia Próxima')).toBeInTheDocument()
    })

    it('categorizes up-to-date vaccines correctly', () => {
      const vaccines = [
        createVaccine('v1', 'Rabia Al Día', 60), // Due in 60 days
      ]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      // Should show in up-to-date section
      expect(screen.getByText(/al día/i)).toBeInTheDocument()
      expect(screen.getByText('Rabia Al Día')).toBeInTheDocument()
    })

    it('handles vaccines without next due date', () => {
      const vaccines = [
        createVaccine('v1', 'Vacuna Sin Fecha', null),
      ]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      // Should categorize as up-to-date
      expect(screen.getByText('Vacuna Sin Fecha')).toBeInTheDocument()
    })
  })

  describe('Status Summary', () => {
    it('displays correct counts in summary cards', () => {
      const vaccines = [
        createVaccine('v1', 'Overdue 1', -10),
        createVaccine('v2', 'Overdue 2', -5),
        createVaccine('v3', 'Upcoming', 15),
        createVaccine('v4', 'OK 1', 60),
        createVaccine('v5', 'OK 2', 90),
      ]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      const summarySection = screen.getByText('Vencidas').closest('div')!.parentElement!
      expect(within(summarySection).getByText('2')).toBeInTheDocument() // 2 overdue
      expect(within(summarySection).getByText('1').closest('div')?.nextElementSibling).toHaveTextContent('Próximas')
    })

    it('shows zero counts when no vaccines in category', () => {
      const vaccines = [
        createVaccine('v1', 'OK', 60),
      ]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText('Vencidas')).toBeInTheDocument()
      expect(screen.getByText('Próximas')).toBeInTheDocument()
    })
  })

  describe('Vaccine Card Details', () => {
    it('displays vaccine name', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 60)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText('Rabia')).toBeInTheDocument()
    })

    it('displays administered date', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 60)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText(/aplicada:/i)).toBeInTheDocument()
    })

    it('displays manufacturer and lot number', () => {
      const vaccines = [{
        ...createVaccine('v1', 'Rabia', 60),
        manufacturer: 'VetPharm',
        lot_number: 'ABC123',
      }]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText(/vetpharm/i)).toBeInTheDocument()
      expect(screen.getByText(/lote: abc123/i)).toBeInTheDocument()
    })

    it('displays vaccine notes', () => {
      const vaccines = [{
        ...createVaccine('v1', 'Rabia', 60),
        notes: 'Próxima dosis en 12 meses',
      }]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText('Próxima dosis en 12 meses')).toBeInTheDocument()
    })

    it('shows days overdue for overdue vaccines', () => {
      const vaccines = [createVaccine('v1', 'Rabia', -15)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText(/vencida hace 15 días/i)).toBeInTheDocument()
    })

    it('shows days until due for upcoming vaccines', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 10)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByText(/próxima en 10 días/i)).toBeInTheDocument()
    })
  })

  describe('Vaccine Reactions', () => {
    it('displays reaction badge when vaccine has reactions', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 60)]
      const reactions = [{
        id: 'r1',
        vaccine_id: 'v1',
        reaction_type: 'Hinchazón',
        severity: 'mild',
        onset_hours: 2,
      }]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} reactions={reactions} />)

      expect(screen.getByText(/reacción/i)).toBeInTheDocument()
    })

    it('displays reaction details', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 60)]
      const reactions = [{
        id: 'r1',
        vaccine_id: 'v1',
        reaction_type: 'Hinchazón local',
        severity: 'leve',
        onset_hours: 4,
      }]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} reactions={reactions} />)

      expect(screen.getByText(/hinchazón local/i)).toBeInTheDocument()
      expect(screen.getByText(/leve/i)).toBeInTheDocument()
      expect(screen.getByText(/4h después/i)).toBeInTheDocument()
    })

    it('does not show reaction badge for vaccines without reactions', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 60)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} reactions={[]} />)

      // Get all elements with "Reacción" text - there should be none as badges
      const badges = screen.queryAllByText(/reacción/i)
      expect(badges.length).toBe(0)
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no vaccines', () => {
      render(<PetVaccinesTab {...defaultProps} vaccines={[]} />)

      expect(screen.getByText(/sin vacunas registradas/i)).toBeInTheDocument()
      expect(screen.getByText(/no hay registros de vacunación/i)).toBeInTheDocument()
    })

    it('shows missing vaccines card when no vaccines', () => {
      render(<PetVaccinesTab {...defaultProps} vaccines={[]} />)

      expect(screen.getByTestId('missing-vaccines-card')).toBeInTheDocument()
    })

    it('shows missing vaccines card even with existing vaccines', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 60)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getByTestId('missing-vaccines-card')).toBeInTheDocument()
    })
  })

  describe('Overdue Action', () => {
    it('shows booking link for overdue vaccines', () => {
      const vaccines = [createVaccine('v1', 'Rabia', -10)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      const bookingLink = screen.getByText(/agendar vacunación/i)
      expect(bookingLink).toHaveAttribute('href', '/terrapet/book?pet=pet-123&service=vacunacion')
    })
  })

  describe('Status Icons', () => {
    it('shows alert icon for overdue vaccines', () => {
      const vaccines = [createVaccine('v1', 'Rabia', -10)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getAllByTestId('icon-alert').length).toBeGreaterThan(0)
    })

    it('shows clock icon for upcoming vaccines', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 15)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getAllByTestId('icon-clock').length).toBeGreaterThan(0)
    })

    it('shows check icon for up-to-date vaccines', () => {
      const vaccines = [createVaccine('v1', 'Rabia', 60)]
      render(<PetVaccinesTab {...defaultProps} vaccines={vaccines} />)

      expect(screen.getAllByTestId('icon-check').length).toBeGreaterThan(0)
    })
  })

  describe('Different Species', () => {
    it('passes species to missing vaccines card', () => {
      render(<PetVaccinesTab {...defaultProps} petSpecies="cat" vaccines={[]} />)

      const card = screen.getByTestId('missing-vaccines-card')
      expect(card).toHaveAttribute('data-species', 'cat')
    })
  })
})
