/**
 * DosageCalculator Component Tests
 *
 * Tests the drug dosage calculator component including:
 * - Render with weight input and drug selector
 * - Drug data fetching
 * - Dosage calculations
 * - Warning display
 * - Edge cases (negative weight, very small volumes)
 *
 * @ticket TEST-002
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Calculator: () => <span data-testid="icon-calculator" />,
  AlertTriangle: () => <span data-testid="icon-warning" />,
}))

// Mock fetch
const mockDrugs = [
  {
    id: 'drug-1',
    name: 'Amoxicilina',
    species: 'all',
    min_dose_mg_kg: 10,
    max_dose_mg_kg: 20,
    concentration_mg_ml: 50,
    notes: 'Administrar con comida',
    max_absolute_mg: 500,
  },
  {
    id: 'drug-2',
    name: 'Meloxicam',
    species: 'dog',
    min_dose_mg_kg: 0.1,
    max_dose_mg_kg: 0.2,
    concentration_mg_ml: 1.5,
    notes: 'Una vez al día',
  },
  {
    id: 'drug-3',
    name: 'Metronidazol',
    species: 'cat',
    min_dose_mg_kg: 15,
    max_dose_mg_kg: 25,
    concentration_mg_ml: 100,
    notes: '',
  },
]

global.fetch = vi.fn()

import { DosageCalculator } from '@/components/clinical/dosage-calculator'

describe('DosageCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockDrugs,
    })
  })

  describe('Rendering', () => {
    it('renders the calculator with all elements', async () => {
      render(<DosageCalculator />)

      expect(screen.getByText(/calculadora de dosis/i)).toBeInTheDocument()
      expect(screen.getByTestId('icon-calculator')).toBeInTheDocument()
      expect(screen.getByText(/peso/i)).toBeInTheDocument()
      expect(screen.getByText(/medicamento/i)).toBeInTheDocument()
    })

    it('renders weight input with correct attributes', async () => {
      render(<DosageCalculator />)

      const weightInput = screen.getByRole('spinbutton')
      expect(weightInput).toHaveAttribute('type', 'number')
      expect(weightInput).toHaveAttribute('step', '0.1')
      expect(weightInput).toHaveAttribute('min', '0')
    })

    it('renders drug selector', async () => {
      render(<DosageCalculator />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })
    })

    it('uses initial weight when provided', async () => {
      render(<DosageCalculator initialWeightKg={15} />)

      const weightInput = screen.getByRole('spinbutton')
      expect(weightInput).toHaveValue(15)
    })
  })

  describe('Drug Fetching', () => {
    it('fetches all drugs when no species specified', async () => {
      render(<DosageCalculator />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/drug_dosages')
      })
    })

    it('fetches species-specific drugs when species provided', async () => {
      render(<DosageCalculator species="dog" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/drug_dosages?species=dog')
      })
    })

    it('populates drug dropdown after fetch', async () => {
      render(<DosageCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina/i)).toBeInTheDocument()
      })
    })

    it('shows all drugs in dropdown', async () => {
      render(<DosageCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina \(50mg\/ml\)/i)).toBeInTheDocument()
        expect(screen.getByText(/meloxicam \(1\.5mg\/ml\)/i)).toBeInTheDocument()
        expect(screen.getByText(/metronidazol \(100mg\/ml\)/i)).toBeInTheDocument()
      })
    })

    it('handles fetch error gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))
      render(<DosageCalculator />)

      // Should not crash, just show empty dropdown
      await waitFor(() => {
        const select = screen.getByRole('combobox')
        expect(select.querySelectorAll('option').length).toBe(1) // Only default option
      })
    })
  })

  describe('Drug Selection', () => {
    it('shows drug info when selected', async () => {
      render(<DosageCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-1' } })

      expect(screen.getByText(/10 - 20 mg\/kg/i)).toBeInTheDocument()
      expect(screen.getByText(/50 mg\/ml/i)).toBeInTheDocument()
      expect(screen.getByText(/administrar con comida/i)).toBeInTheDocument()
    })

    it('does not show notes if empty', async () => {
      render(<DosageCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/metronidazol/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-3' } })

      expect(screen.queryByText(/nota:/i)).not.toBeInTheDocument()
    })
  })

  describe('Dosage Calculation', () => {
    it('calculates and displays dose correctly', async () => {
      render(<DosageCalculator initialWeightKg={10} />)

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-1' } })

      // For 10kg dog with Amoxicilina (10-20mg/kg, 50mg/ml):
      // Min: 10kg * 10mg/kg = 100mg, 100mg / 50mg/ml = 2ml
      // Max: 10kg * 20mg/kg = 200mg, 200mg / 50mg/ml = 4ml
      await waitFor(() => {
        expect(screen.getByText(/2\.00 - 4\.00 ml/i)).toBeInTheDocument()
        expect(screen.getByText(/100 - 200 mg totales/i)).toBeInTheDocument()
      })
    })

    it('applies absolute maximum dose limit', async () => {
      render(<DosageCalculator initialWeightKg={50} />) // 50kg would exceed max_absolute_mg

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-1' } })

      // For 50kg with Amoxicilina (max_absolute_mg: 500):
      // Calculated max: 50 * 20 = 1000mg, but capped at 500mg
      await waitFor(() => {
        expect(screen.getByText(/dosis máxima absoluta aplicada/i)).toBeInTheDocument()
        expect(screen.getByText(/500 mg/i)).toBeInTheDocument()
      })
    })

    it('updates dose when weight changes', async () => {
      render(<DosageCalculator initialWeightKg={10} />)

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-1' } })

      await waitFor(() => {
        expect(screen.getByText(/2\.00 - 4\.00 ml/i)).toBeInTheDocument()
      })

      const weightInput = screen.getByRole('spinbutton')
      fireEvent.change(weightInput, { target: { value: '20' } })

      await waitFor(() => {
        // 20kg: 200-400mg total, 4-8ml
        expect(screen.getByText(/4\.00 - 8\.00 ml/i)).toBeInTheDocument()
      })
    })

    it('does not show dose until both weight and drug selected', async () => {
      render(<DosageCalculator />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // No dose shown initially
      expect(screen.queryByText(/administrar/i)).not.toBeInTheDocument()
    })

    it('does not show dose for zero weight', async () => {
      render(<DosageCalculator initialWeightKg={0} />)

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-1' } })

      expect(screen.queryByText(/administrar/i)).not.toBeInTheDocument()
    })
  })

  describe('Weight Validation', () => {
    it('shows warning for negative weight', async () => {
      render(<DosageCalculator />)

      const weightInput = screen.getByRole('spinbutton')
      fireEvent.change(weightInput, { target: { value: '-5' } })

      expect(screen.getByText(/no puede ser negativo/i)).toBeInTheDocument()
    })

    it('shows warning for unusually high weight', async () => {
      render(<DosageCalculator />)

      const weightInput = screen.getByRole('spinbutton')
      fireEvent.change(weightInput, { target: { value: '250' } })

      expect(screen.getByText(/inusualmente alto/i)).toBeInTheDocument()
    })

    it('no warning for valid weight', async () => {
      render(<DosageCalculator initialWeightKg={25} />)

      expect(screen.queryByText(/no puede ser negativo/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/inusualmente alto/i)).not.toBeInTheDocument()
    })
  })

  describe('Small Volume Warning', () => {
    it('warns about very small volumes', async () => {
      render(<DosageCalculator initialWeightKg={0.5} />) // Very small animal

      await waitFor(() => {
        expect(screen.getByText(/meloxicam/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-2' } })

      // 0.5kg with Meloxicam (0.1-0.2mg/kg, 1.5mg/ml):
      // Min: 0.05mg / 1.5 = 0.033ml (very small)
      await waitFor(() => {
        expect(screen.getByText(/volumen muy pequeño/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('disables select while loading', async () => {
      // Delay the response
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => mockDrugs,
        }), 100))
      )

      render(<DosageCalculator />)

      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()

      await waitFor(() => {
        expect(select).not.toBeDisabled()
      })
    })
  })

  describe('Species Filtering', () => {
    it('filters drugs by species when provided', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockDrugs.filter(d => d.species === 'dog' || d.species === 'all'),
      })

      render(<DosageCalculator species="dog" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/drug_dosages?species=dog')
      })
    })
  })

  describe('Accessibility', () => {
    it('has labeled inputs', async () => {
      render(<DosageCalculator />)

      expect(screen.getByText(/peso/i)).toBeInTheDocument()
      expect(screen.getByText(/medicamento/i)).toBeInTheDocument()
    })

    it('displays drug info in accessible format', async () => {
      render(<DosageCalculator initialWeightKg={10} />)

      await waitFor(() => {
        expect(screen.getByText(/amoxicilina/i)).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'drug-1' } })

      // Drug info should be clearly labeled
      expect(screen.getByText(/dosis:/i)).toBeInTheDocument()
      expect(screen.getByText(/conc:/i)).toBeInTheDocument()
    })

    it('warnings have warning icon', async () => {
      render(<DosageCalculator initialWeightKg={-5} />)

      // Weight warning doesn't use the warning icon, but the absolute max dose warning does
      // Let's trigger that instead
      render(<DosageCalculator initialWeightKg={50} />)

      await waitFor(() => {
        expect(screen.getAllByText(/amoxicilina/i).length).toBeGreaterThan(0)
      })

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[1], { target: { value: 'drug-1' } })

      await waitFor(() => {
        expect(screen.getByTestId('icon-warning')).toBeInTheDocument()
      })
    })
  })
})
