import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WaitingRoom } from '@/components/dashboard/waiting-room'

// Mock the server action
vi.mock('@/app/actions/update-appointment-status', () => ({
  updateAppointmentStatus: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock the router
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  }
})

// Mock the global fetch function
global.fetch = vi.fn()

const mockAppointments = [
  {
    id: '1',
    status: 'checked_in',
    start_time: new Date().toISOString(),
    reason: 'Check-up',
    pet: { name: 'Buddy' },
    owner: { full_name: 'John Doe' },
  },
  {
    id: '2',
    status: 'in_progress',
    start_time: new Date().toISOString(),
    reason: 'Follow-up',
    pet: { name: 'Lucy' },
    owner: { full_name: 'Jane Smith' },
  },
  {
    id: '3',
    status: 'confirmed',
    start_time: new Date().toISOString(),
    reason: 'Vaccination',
    pet: { name: 'Rocky' },
    owner: { full_name: 'Jim Brown' },
  },
]

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('WaitingRoom Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAppointments),
    })
  })

  it('should not display data before query resolves', () => {
    ;(fetch as any).mockImplementationOnce(() => new Promise(() => {})) // Never resolves
    renderWithClient(<WaitingRoom clinic="test-clinic" />)
    // The component shows a header but no patient rows while loading
    expect(screen.getByText('Sala de Espera')).toBeInTheDocument()
    expect(screen.queryByText('Buddy')).not.toBeInTheDocument()
  })

  it('should render appointments in their correct groups', async () => {
    renderWithClient(<WaitingRoom clinic="test-clinic" />)

    expect(await screen.findByText('Buddy')).toBeInTheDocument() // Checked in
    expect(await screen.findByText('Lucy')).toBeInTheDocument() // In Progress
    expect(await screen.findByText('Rocky')).toBeInTheDocument() // Upcoming

    // Check group headers
    expect(screen.getByText('En Sala de Espera (1)')).toBeInTheDocument()
    expect(screen.getByText('En Consulta (1)')).toBeInTheDocument()
    expect(screen.getByText('Próximas Citas (1)')).toBeInTheDocument()
  })

  it('should show an empty state when no appointments are fetched', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    renderWithClient(<WaitingRoom clinic="test-clinic" />)

    expect(await screen.findByText('No hay citas programadas para hoy')).toBeInTheDocument()
  })

  it('should call the updateStatus mutation when a status button is clicked', async () => {
    const { updateAppointmentStatus } = await import('@/app/actions/update-appointment-status')

    renderWithClient(<WaitingRoom clinic="test-clinic" />)

    const startConsultationButton = await screen.findByRole('button', { name: /Iniciar Consulta/i })
    fireEvent.click(startConsultationButton)

    await waitFor(() => {
      expect(updateAppointmentStatus).toHaveBeenCalledWith('1', 'in_progress', 'test-clinic')
    })
  })
})
