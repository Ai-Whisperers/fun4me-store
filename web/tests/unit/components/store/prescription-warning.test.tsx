import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  PrescriptionWarning,
  PrescriptionBadge,
  PrescriptionCheckoutBanner,
} from '@/components/store/prescription-warning'

describe('PrescriptionWarning', () => {
  describe('compact mode', () => {
    it('renders compact badge', () => {
      render(<PrescriptionWarning compact />)
      expect(screen.getByText('Receta Requerida')).toBeInTheDocument()
    })
  })

  describe('full mode', () => {
    it('renders warning with default text', () => {
      render(<PrescriptionWarning />)
      expect(screen.getByText('Receta Médica Requerida')).toBeInTheDocument()
      expect(
        screen.getByText('Este producto requiere una receta médica vigente para su despacho.')
      ).toBeInTheDocument()
    })

    it('renders warning with product name', () => {
      render(<PrescriptionWarning productName="Antibiótico X" />)
      expect(screen.getByText(/Antibiótico X/)).toBeInTheDocument()
      expect(
        screen.getByText(/requiere una receta médica vigente para su despacho/)
      ).toBeInTheDocument()
    })

    it('shows details when showDetails is true', () => {
      render(<PrescriptionWarning showDetails />)
      expect(
        screen.getByText(/Deberá seleccionar la mascota para la cual está comprando/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Un veterinario verificará que la receta corresponda/)
      ).toBeInTheDocument()
    })

    it('has role alert for accessibility', () => {
      render(<PrescriptionWarning />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

describe('PrescriptionBadge', () => {
  it('renders Rx badge', () => {
    render(<PrescriptionBadge />)
    expect(screen.getByText('Rx')).toBeInTheDocument()
  })

  it('has tooltip title', () => {
    render(<PrescriptionBadge />)
    expect(screen.getByTitle('Este producto requiere receta médica')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<PrescriptionBadge className="custom-class" />)
    expect(screen.getByText('Rx').closest('span')).toHaveClass('custom-class')
  })
})

describe('PrescriptionCheckoutBanner', () => {
  it('shows warning when pet not selected', () => {
    render(
      <PrescriptionCheckoutBanner
        itemCount={2}
        hasPetSelected={false}
        hasAllPrescriptions={false}
      />
    )
    expect(screen.getByText('Receta Médica Requerida')).toBeInTheDocument()
    expect(screen.getByText(/Seleccione una mascota/)).toBeInTheDocument()
  })

  it('shows warning when prescriptions missing', () => {
    render(
      <PrescriptionCheckoutBanner
        itemCount={1}
        hasPetSelected={true}
        hasAllPrescriptions={false}
      />
    )
    expect(screen.getByText('Receta Médica Requerida')).toBeInTheDocument()
    expect(screen.getByText(/Suba las recetas requeridas/)).toBeInTheDocument()
  })

  it('shows success when all requirements met', () => {
    render(
      <PrescriptionCheckoutBanner itemCount={2} hasPetSelected={true} hasAllPrescriptions={true} />
    )
    expect(screen.getByText('Recetas Verificadas')).toBeInTheDocument()
    expect(screen.getByText(/productos con receta listos/)).toBeInTheDocument()
  })

  it('handles single item text correctly', () => {
    render(
      <PrescriptionCheckoutBanner itemCount={1} hasPetSelected={false} hasAllPrescriptions={false} />
    )
    expect(screen.getByText(/1 producto requiere receta médica/)).toBeInTheDocument()
  })

  it('handles multiple items text correctly', () => {
    render(
      <PrescriptionCheckoutBanner itemCount={3} hasPetSelected={false} hasAllPrescriptions={false} />
    )
    expect(screen.getByText(/3 productos requieren receta médica/)).toBeInTheDocument()
  })
})
