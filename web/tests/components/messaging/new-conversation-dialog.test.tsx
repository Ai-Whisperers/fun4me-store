/**
 * NewConversationDialog Component Tests
 *
 * Tests the new conversation dialog component including:
 * - Render in open/closed states
 * - Form validation
 * - Owner vs Staff view differences
 * - Client search (staff only)
 * - Pet selection (owner only)
 * - Form submission
 * - Error display
 * - Loading states
 *
 * @ticket TEST-002
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Send: () => <span data-testid="icon-send" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  Search: () => <span data-testid="icon-search" />,
  User: () => <span data-testid="icon-user" />,
  PawPrint: () => <span data-testid="icon-paw" />,
}))

// Mock fetch
global.fetch = vi.fn()

import NewConversationDialog from '@/components/messaging/new-conversation-dialog'

describe('NewConversationDialog', () => {
  const mockOnClose = vi.fn()

  const defaultProps = {
    clinic: 'terrapet',
    onClose: mockOnClose,
    isOpen: true,
    isStaff: false,
    pets: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    })
  })

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<NewConversationDialog {...defaultProps} isOpen={true} />)

      expect(screen.getByText('Nueva Conversación')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<NewConversationDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Nueva Conversación')).not.toBeInTheDocument()
    })

    it('renders form elements', () => {
      render(<NewConversationDialog {...defaultProps} />)

      expect(screen.getByText(/asunto/i)).toBeInTheDocument()
      expect(screen.getByText(/mensaje/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enviar mensaje/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })

    it('shows subtitle for owner', () => {
      render(<NewConversationDialog {...defaultProps} isStaff={false} />)

      expect(screen.getByText(/enviar mensaje a la clínica/i)).toBeInTheDocument()
    })

    it('shows subtitle for staff', () => {
      render(<NewConversationDialog {...defaultProps} isStaff={true} />)

      expect(screen.getByText(/iniciar conversación con un cliente/i)).toBeInTheDocument()
    })
  })

  describe('Owner View', () => {
    it('does not show client selector', () => {
      render(<NewConversationDialog {...defaultProps} isStaff={false} />)

      expect(screen.queryByText(/cliente/i)).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/buscar por nombre/i)).not.toBeInTheDocument()
    })

    it('shows pet selector when pets are provided', () => {
      const pets = [
        { id: 'pet-1', name: 'Max' },
        { id: 'pet-2', name: 'Luna' },
      ]
      render(<NewConversationDialog {...defaultProps} pets={pets} isStaff={false} />)

      expect(screen.getByText(/mascota/i)).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('lists all pets in selector', () => {
      const pets = [
        { id: 'pet-1', name: 'Max' },
        { id: 'pet-2', name: 'Luna' },
      ]
      render(<NewConversationDialog {...defaultProps} pets={pets} isStaff={false} />)

      const select = screen.getByRole('combobox')
      expect(select).toContainHTML('Max')
      expect(select).toContainHTML('Luna')
    })

    it('does not show pet selector when no pets', () => {
      render(<NewConversationDialog {...defaultProps} pets={[]} isStaff={false} />)

      expect(screen.queryByText(/mascota \(opcional\)/i)).not.toBeInTheDocument()
    })
  })

  describe('Staff View', () => {
    it('shows client selector', () => {
      render(<NewConversationDialog {...defaultProps} isStaff={true} />)

      expect(screen.getByText(/cliente/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/buscar por nombre/i)).toBeInTheDocument()
    })

    it('does not show pet selector for staff', () => {
      const pets = [{ id: 'pet-1', name: 'Max' }]
      render(<NewConversationDialog {...defaultProps} isStaff={true} pets={pets} />)

      expect(screen.queryByText(/mascota \(opcional\)/i)).not.toBeInTheDocument()
    })

    it('searches clients on input', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clients: [
            { id: 'c1', full_name: 'John Doe', email: 'john@example.com' },
          ],
        }),
      })

      render(<NewConversationDialog {...defaultProps} isStaff={true} />)

      const searchInput = screen.getByPlaceholderText(/buscar por nombre/i)
      fireEvent.change(searchInput, { target: { value: 'John' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/clients/search?q=John')
      })
    })

    it('displays client search results', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clients: [
            { id: 'c1', full_name: 'John Doe', email: 'john@example.com' },
          ],
        }),
      })

      render(<NewConversationDialog {...defaultProps} isStaff={true} />)

      const searchInput = screen.getByPlaceholderText(/buscar por nombre/i)
      fireEvent.change(searchInput, { target: { value: 'John' } })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('john@example.com')).toBeInTheDocument()
      })
    })

    it('selects client from search results', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clients: [
            { id: 'c1', full_name: 'John Doe', email: 'john@example.com' },
          ],
        }),
      })

      render(<NewConversationDialog {...defaultProps} isStaff={true} />)

      const searchInput = screen.getByPlaceholderText(/buscar por nombre/i)
      fireEvent.change(searchInput, { target: { value: 'John' } })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const clientButton = screen.getByText('John Doe').closest('button')!
      fireEvent.click(clientButton)

      // Should now show the selected client
      expect(screen.queryByPlaceholderText(/buscar por nombre/i)).not.toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('allows deselecting client', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clients: [
            { id: 'c1', full_name: 'John Doe', email: 'john@example.com' },
          ],
        }),
      })

      render(<NewConversationDialog {...defaultProps} isStaff={true} />)

      // Search and select client
      const searchInput = screen.getByPlaceholderText(/buscar por nombre/i)
      fireEvent.change(searchInput, { target: { value: 'John' } })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const clientButton = screen.getByText('John Doe').closest('button')!
      fireEvent.click(clientButton)

      // Find and click the X button to deselect
      const removeButtons = screen.getAllByTestId('icon-x')
      const removeClientButton = removeButtons[removeButtons.length - 1].closest('button')!
      fireEvent.click(removeClientButton)

      // Should show search input again
      expect(screen.getByPlaceholderText(/buscar por nombre/i)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('shows error when subject is empty', async () => {
      render(<NewConversationDialog {...defaultProps} />)

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Test message' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/asunto es obligatorio/i)
      })
    })

    it('shows error when message is empty', async () => {
      render(<NewConversationDialog {...defaultProps} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Test subject' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/mensaje es obligatorio/i)
      })
    })

    it('shows error when staff submits without client', async () => {
      render(<NewConversationDialog {...defaultProps} isStaff={true} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Test subject' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Test message' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/seleccionar un cliente/i)
      })
    })

    it('disables submit button when form is incomplete', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button when form is complete', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Test subject' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Test message' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('submits form with correct data for owner', async () => {
      render(<NewConversationDialog {...defaultProps} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Consulta vacunación' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Hola, tengo una consulta' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Consulta vacunación',
            pet_id: null,
            initial_message: 'Hola, tengo una consulta',
            recipient_id: null,
          }),
        })
      })
    })

    it('submits with pet_id when selected', async () => {
      const pets = [{ id: 'pet-1', name: 'Max' }]
      render(<NewConversationDialog {...defaultProps} pets={pets} />)

      const petSelect = screen.getByRole('combobox')
      fireEvent.change(petSelect, { target: { value: 'pet-1' } })

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Consulta' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Mensaje' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/conversations', expect.objectContaining({
          body: expect.stringContaining('"pet_id":"pet-1"'),
        }))
      })
    })

    it('redirects to conversation on success', async () => {
      render(<NewConversationDialog {...defaultProps} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Test' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Message' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/terrapet/portal/messages/conv-123')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('shows error on API failure', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

      render(<NewConversationDialog {...defaultProps} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Test' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Message' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Server error')
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner during submission', async () => {
      // Make fetch never resolve
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))

      render(<NewConversationDialog {...defaultProps} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i)
      fireEvent.change(subjectInput, { target: { value: 'Test' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Message' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/enviando/i)).toBeInTheDocument()
      })
    })

    it('disables inputs during submission', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))

      render(<NewConversationDialog {...defaultProps} />)

      const subjectInput = screen.getByPlaceholderText(/consulta sobre/i) as HTMLInputElement
      fireEvent.change(subjectInput, { target: { value: 'Test' } })

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i) as HTMLTextAreaElement
      fireEvent.change(messageTextarea, { target: { value: 'Message' } })

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(subjectInput).toBeDisabled()
        expect(messageTextarea).toBeDisabled()
      })
    })
  })

  describe('Dialog Close', () => {
    it('calls onClose when cancel button clicked', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose when X button clicked', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const closeButtons = screen.getAllByTestId('icon-x')
      const closeButton = closeButtons[0].closest('button')!
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop clicked', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const backdrop = screen.getByText('Nueva Conversación').closest('.animate-fadeIn')!
      fireEvent.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not close when dialog content clicked', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const dialogContent = screen.getByText('Nueva Conversación').closest('.animate-scaleIn')!
      fireEvent.click(dialogContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Character Count', () => {
    it('shows character count for message', () => {
      render(<NewConversationDialog {...defaultProps} />)

      expect(screen.getByText('0/2000')).toBeInTheDocument()
    })

    it('updates character count as user types', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const messageTextarea = screen.getByPlaceholderText(/escribe tu mensaje/i)
      fireEvent.change(messageTextarea, { target: { value: 'Hello' } })

      expect(screen.getByText('5/2000')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('error message has role="alert"', async () => {
      render(<NewConversationDialog {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /enviar mensaje/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('required fields are marked', () => {
      render(<NewConversationDialog {...defaultProps} />)

      const subjectLabel = screen.getByText(/asunto/i).closest('label')!
      const messageLabel = screen.getByText(/^mensaje$/i).closest('label')!

      expect(subjectLabel.innerHTML).toContain('*')
      expect(messageLabel.innerHTML).toContain('*')
    })
  })
})
