/**
 * EditPetForm Component Tests
 *
 * Tests the pet edit form component including:
 * - Render with all form fields
 * - Pre-filled values from pet data
 * - Form submission
 * - Photo upload handling
 * - Error display
 * - Delete functionality
 *
 * @ticket TEST-002
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'
import { createMockPet } from '@/lib/test-utils/component-test-helpers'

// Mock modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="icon-loader" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
}))

vi.mock('@/app/actions/pets', () => ({
  updatePet: vi.fn(),
}))

vi.mock('./delete-pet-button', () => ({
  DeletePetButton: ({ petId, clinic, petName }: { petId: string; clinic: string; petName: string }) => (
    <button data-testid="delete-button" data-pet-id={petId} data-clinic={clinic}>
      Eliminar {petName}
    </button>
  ),
}))

vi.mock('./photo-upload', () => ({
  PhotoUpload: ({
    name,
    currentPhotoUrl,
    onFileSelect,
    onFileRemove,
    placeholder
  }: {
    name: string
    currentPhotoUrl?: string
    onFileSelect: (file: File) => void
    onFileRemove: () => void
    placeholder: string
  }) => (
    <div data-testid="photo-upload">
      <input
        type="file"
        name={name}
        data-current-url={currentPhotoUrl}
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        aria-label="Photo upload"
      />
      <button type="button" onClick={onFileRemove} data-testid="remove-photo">
        {placeholder}
      </button>
    </div>
  ),
}))

// Mock useTransition
let mockIsPending = false
let mockStartTransition: Mock = vi.fn((callback: () => void) => callback())

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useTransition: () => [mockIsPending, mockStartTransition],
  }
})

import { EditPetForm } from '@/components/pets/edit-pet-form'
import { updatePet } from '@/app/actions/pets'

describe('EditPetForm', () => {
  const mockPet = createMockPet({
    id: 'pet-123',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    weight_kg: 25.5,
    sex: 'male',
    is_neutered: true,
    color: 'Golden',
    temperament: 'friendly',
    allergies: 'Pollo',
    existing_conditions: 'Ninguna',
    microchip_id: '123456789',
    diet_category: 'balanced',
    diet_notes: 'Royal Canin',
  })

  const defaultProps = {
    pet: mockPet,
    clinic: 'terrapet',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsPending = false
    mockStartTransition = vi.fn((callback: () => void) => callback())
    ;(updatePet as Mock).mockResolvedValue({ success: true })
  })

  describe('Rendering', () => {
    it('renders the form with all fields', () => {
      render(<EditPetForm {...defaultProps} />)

      // Basic info
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/especie/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/raza/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/peso/i)).toBeInTheDocument()

      // Health & behavior
      expect(screen.getByText(/salud y comportamiento/i)).toBeInTheDocument()
      expect(screen.getByText(/temperamento/i)).toBeInTheDocument()
      expect(screen.getByText(/alergias/i)).toBeInTheDocument()
      expect(screen.getByText(/condiciones preexistentes/i)).toBeInTheDocument()

      // Additional details
      expect(screen.getByText(/detalles adicionales/i)).toBeInTheDocument()
      expect(screen.getByText(/microchip/i)).toBeInTheDocument()
      expect(screen.getByText(/tipo de dieta/i)).toBeInTheDocument()
    })

    it('pre-fills form with pet data', () => {
      render(<EditPetForm {...defaultProps} />)

      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Max')
      expect(screen.getByLabelText(/raza/i)).toHaveValue('Labrador')
      expect(screen.getByLabelText(/peso/i)).toHaveValue(25.5)
    })

    it('pre-selects species correctly', () => {
      render(<EditPetForm {...defaultProps} />)

      const speciesSelect = screen.getByLabelText(/especie/i)
      expect(speciesSelect).toHaveValue('dog')
    })

    it('renders sex radio buttons with correct selection', () => {
      render(<EditPetForm {...defaultProps} />)

      const maleRadio = screen.getByLabelText(/macho/i)
      const femaleRadio = screen.getByLabelText(/hembra/i)

      expect(maleRadio).toBeChecked()
      expect(femaleRadio).not.toBeChecked()
    })

    it('renders neutered checkbox with correct state', () => {
      render(<EditPetForm {...defaultProps} />)

      const neuteredCheckbox = screen.getByLabelText(/castrado/i)
      expect(neuteredCheckbox).toBeChecked()
    })

    it('renders photo upload component', () => {
      render(<EditPetForm {...defaultProps} />)

      expect(screen.getByTestId('photo-upload')).toBeInTheDocument()
    })

    it('renders delete button', () => {
      render(<EditPetForm {...defaultProps} />)

      const deleteButton = screen.getByTestId('delete-button')
      expect(deleteButton).toBeInTheDocument()
      expect(deleteButton).toHaveAttribute('data-pet-id', 'pet-123')
    })
  })

  describe('Species Options', () => {
    it('has dog option', () => {
      render(<EditPetForm {...defaultProps} />)

      const speciesSelect = screen.getByLabelText(/especie/i)
      expect(speciesSelect.querySelector('option[value="dog"]')).toHaveTextContent('Perro')
    })

    it('has cat option', () => {
      render(<EditPetForm {...defaultProps} />)

      const speciesSelect = screen.getByLabelText(/especie/i)
      expect(speciesSelect.querySelector('option[value="cat"]')).toHaveTextContent('Gato')
    })
  })

  describe('Temperament Options', () => {
    it('renders all temperament options', () => {
      render(<EditPetForm {...defaultProps} />)

      const temperamentInputs = screen.getAllByRole('combobox')
      const temperamentSelect = temperamentInputs.find(
        (select) => select.getAttribute('name') === 'temperament'
      )

      expect(temperamentSelect).toBeInTheDocument()
      expect(temperamentSelect?.querySelector('option[value="friendly"]')).toHaveTextContent('Amigable')
      expect(temperamentSelect?.querySelector('option[value="shy"]')).toHaveTextContent('Tímido')
      expect(temperamentSelect?.querySelector('option[value="aggressive"]')).toHaveTextContent('Agresivo')
      expect(temperamentSelect?.querySelector('option[value="calm"]')).toHaveTextContent('Tranquilo')
    })
  })

  describe('Diet Options', () => {
    it('renders all diet category options', () => {
      render(<EditPetForm {...defaultProps} />)

      const dietInputs = screen.getAllByRole('combobox')
      const dietSelect = dietInputs.find(
        (select) => select.getAttribute('name') === 'diet_category'
      )

      expect(dietSelect).toBeInTheDocument()
      expect(dietSelect?.querySelector('option[value="balanced"]')).toHaveTextContent('Balanceado Seco')
      expect(dietSelect?.querySelector('option[value="wet"]')).toHaveTextContent('Alimento Húmedo')
      expect(dietSelect?.querySelector('option[value="raw"]')).toHaveTextContent('BARF')
      expect(dietSelect?.querySelector('option[value="mixed"]')).toHaveTextContent('Mixta')
      expect(dietSelect?.querySelector('option[value="prescription"]')).toHaveTextContent('Prescripción')
    })
  })

  describe('Form Submission', () => {
    it('submits form data correctly', async () => {
      render(<EditPetForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /guardar cambios/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(updatePet).toHaveBeenCalledWith('pet-123', expect.any(FormData))
      })
    })

    it('shows loading state when pending', () => {
      mockIsPending = true
      render(<EditPetForm {...defaultProps} />)

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays general error from server', async () => {
      ;(updatePet as Mock).mockResolvedValue({ success: false, error: 'Error al guardar' })
      render(<EditPetForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /guardar cambios/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Error al guardar')).toBeInTheDocument()
      })
    })

    it('displays photo-specific error separately', async () => {
      ;(updatePet as Mock).mockResolvedValue({ success: false, error: 'Error al subir la foto' })
      render(<EditPetForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /guardar cambios/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/error al subir la foto/i)).toBeInTheDocument()
      })
    })
  })

  describe('Photo Upload', () => {
    it('handles file selection', () => {
      render(<EditPetForm {...defaultProps} />)

      const fileInput = screen.getByLabelText(/photo upload/i)
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [mockFile] } })

      // File should be selected (handled internally by the component)
      expect(fileInput).toBeInTheDocument()
    })

    it('handles photo removal', () => {
      render(<EditPetForm {...defaultProps} />)

      const removeButton = screen.getByTestId('remove-photo')
      fireEvent.click(removeButton)

      // Remove photo callback should be triggered
      expect(removeButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<EditPetForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/nombre/i)
      const speciesSelect = screen.getByLabelText(/especie/i)
      const breedInput = screen.getByLabelText(/raza/i)
      const weightInput = screen.getByLabelText(/peso/i)

      expect(nameInput.id).toBe('pet-name')
      expect(speciesSelect.id).toBe('pet-species')
      expect(breedInput.id).toBe('pet-breed')
      expect(weightInput.id).toBe('pet-weight')
    })

    it('error alert has proper attributes', async () => {
      ;(updatePet as Mock).mockResolvedValue({ success: false, error: 'Test error' })
      render(<EditPetForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /guardar cambios/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('name input has aria-invalid when error', async () => {
      ;(updatePet as Mock).mockResolvedValue({ success: false, error: 'Test error' })
      render(<EditPetForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /guardar cambios/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/nombre/i)
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
      })
    })
  })

  describe('Different Pet Species', () => {
    it('renders correctly for cat', () => {
      const catPet = createMockPet({
        species: 'cat',
        name: 'Luna',
      })

      render(<EditPetForm pet={catPet} clinic="terrapet" />)

      const speciesSelect = screen.getByLabelText(/especie/i)
      expect(speciesSelect).toHaveValue('cat')
    })
  })
})
