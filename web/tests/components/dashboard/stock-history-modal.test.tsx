/**
 * StockHistoryModal Component Tests
 *
 * Tests the stock history modal component including:
 * - Modal visibility
 * - Loading and error states
 * - Summary display
 * - Transaction list with type icons
 * - Filter functionality
 * - Date and currency formatting
 * - Accessibility (focus trap, keyboard handling)
 *
 * @ticket TEST-002
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  History: () => <span data-testid="icon-history" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  Package: () => <span data-testid="icon-package" />,
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  RotateCcw: () => <span data-testid="icon-rotate" />,
  ShoppingCart: () => <span data-testid="icon-cart" />,
  Truck: () => <span data-testid="icon-truck" />,
  Settings: () => <span data-testid="icon-settings" />,
  Loader2: () => <span data-testid="icon-loader" />,
}))

// Mock fetch
global.fetch = vi.fn()

import { StockHistoryModal } from '@/components/dashboard/inventory/stock-history-modal'

describe('StockHistoryModal', () => {
  const defaultProps = {
    productId: 'prod-123',
    productName: 'Vacuna Antirrábica',
    isOpen: true,
    onClose: vi.fn(),
    clinic: 'terrapet',
  }

  const mockHistoryData = {
    transactions: [
      {
        id: 'tx-1',
        type: 'purchase' as const,
        quantity: 50,
        unit_cost: 25000,
        notes: 'Compra inicial',
        reference_type: 'procurement_order',
        reference_id: 'po-123',
        created_at: '2026-01-05T10:00:00Z',
        performed_by: { id: 'user-1', full_name: 'Juan Pérez' },
      },
      {
        id: 'tx-2',
        type: 'sale' as const,
        quantity: -5,
        unit_cost: 30000,
        notes: null,
        reference_type: 'invoice',
        reference_id: 'inv-456',
        created_at: '2026-01-06T14:30:00Z',
        performed_by: { id: 'user-2', full_name: 'María García' },
      },
      {
        id: 'tx-3',
        type: 'adjustment' as const,
        quantity: -2,
        unit_cost: null,
        notes: 'Ajuste por conteo físico',
        reference_type: null,
        reference_id: null,
        created_at: '2026-01-07T09:00:00Z',
        performed_by: null,
      },
      {
        id: 'tx-4',
        type: 'damage' as const,
        quantity: -1,
        unit_cost: null,
        notes: 'Frasco roto',
        reference_type: null,
        reference_id: null,
        created_at: '2026-01-08T08:00:00Z',
        performed_by: { id: 'user-1', full_name: 'Juan Pérez' },
      },
    ],
    summary: {
      total_in: 50,
      total_out: 8,
      current_stock: 42,
      wac: 25000,
    },
    product: {
      id: 'prod-123',
      name: 'Vacuna Antirrábica',
      sku: 'VAC-001',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockHistoryData,
    })
  })

  describe('Modal Visibility', () => {
    it('renders when isOpen is true', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<StockHistoryModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Header', () => {
    it('displays modal title', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      expect(screen.getByText('Historial de Movimientos')).toBeInTheDocument()
    })

    it('displays product name', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
    })

    it('shows close button', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      expect(screen.getByLabelText('Cerrar')).toBeInTheDocument()
    })

    it('calls onClose when close button clicked', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      fireEvent.click(screen.getByLabelText('Cerrar'))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop clicked', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      // Click backdrop (the element with bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50')
      fireEvent.click(backdrop!)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner while fetching', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      )

      render(<StockHistoryModal {...defaultProps} />)

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })

    it('hides loading after data loads', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('shows error message on fetch failure', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ details: { message: 'Error al cargar historial' } }),
      })

      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar historial')).toBeInTheDocument()
      })
    })

    it('shows generic error on network failure', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Summary Cards', () => {
    it('displays total entries (Entradas)', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Entradas')).toBeInTheDocument()
        expect(screen.getByText('50')).toBeInTheDocument()
      })
    })

    it('displays total exits (Salidas)', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salidas')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
      })
    })

    it('displays current stock', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Stock Actual')).toBeInTheDocument()
        expect(screen.getByText('42')).toBeInTheDocument()
      })
    })

    it('displays weighted average cost', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Costo Prom.')).toBeInTheDocument()
        // Should format as PYG currency
        expect(screen.getByText(/25.*000/)).toBeInTheDocument()
      })
    })
  })

  describe('Transaction List', () => {
    it('displays transaction types with correct labels', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Compra')).toBeInTheDocument()
        expect(screen.getByText('Venta')).toBeInTheDocument()
        expect(screen.getByText('Ajuste')).toBeInTheDocument()
        expect(screen.getByText('Daño')).toBeInTheDocument()
      })
    })

    it('displays transaction notes', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Compra inicial')).toBeInTheDocument()
        expect(screen.getByText('Ajuste por conteo físico')).toBeInTheDocument()
        expect(screen.getByText('Frasco roto')).toBeInTheDocument()
      })
    })

    it('displays performer name when available', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/por Juan Pérez/)).toBeInTheDocument()
        expect(screen.getByText(/por María García/)).toBeInTheDocument()
      })
    })

    it('shows positive quantities with + prefix', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('+50')).toBeInTheDocument()
      })
    })

    it('shows negative quantities without prefix', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('-5')).toBeInTheDocument()
        expect(screen.getByText('-2')).toBeInTheDocument()
        expect(screen.getByText('-1')).toBeInTheDocument()
      })
    })

    it('displays unit cost when available', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        // @ 25,000 and @ 30,000
        expect(screen.getByText(/@ .*25.*000/)).toBeInTheDocument()
        expect(screen.getByText(/@ .*30.*000/)).toBeInTheDocument()
      })
    })

    it('displays reference type', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/procurement_order/)).toBeInTheDocument()
        expect(screen.getByText(/invoice/)).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no transactions', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockHistoryData,
          transactions: [],
        }),
      })

      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No hay movimientos registrados')).toBeInTheDocument()
      })
    })
  })

  describe('Filter', () => {
    it('renders filter select', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })
    })

    it('has filter options', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        const select = screen.getByRole('combobox')
        expect(select).toBeInTheDocument()
      })

      const options = screen.getAllByRole('option')
      expect(options.map(o => o.textContent)).toEqual([
        'Todos los movimientos',
        'Compras',
        'Ventas',
        'Ajustes',
        'Devoluciones',
        'Daños',
        'Vencidos',
      ])
    })

    it('refetches when filter changes', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'purchase' } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=purchase')
        )
      })
    })
  })

  describe('API Calls', () => {
    it('fetches history on open', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/inventory/prod-123/history?limit=50'
        )
      })
    })

    it('does not fetch when modal is closed', async () => {
      render(<StockHistoryModal {...defaultProps} isOpen={false} />)

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('refetches when productId changes', async () => {
      const { rerender } = render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      rerender(<StockHistoryModal {...defaultProps} productId="prod-456" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/inventory/prod-456/history?limit=50'
        )
      })
    })
  })

  describe('Keyboard Accessibility', () => {
    it('closes on Escape key', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('focuses close button on open', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(document.activeElement).toHaveAttribute('aria-label', 'Cerrar')
      })
    })
  })

  describe('ARIA Attributes', () => {
    it('has correct role', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal attribute', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby for title', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'stock-history-modal-title')
      expect(screen.getByText('Historial de Movimientos')).toHaveAttribute('id', 'stock-history-modal-title')
    })
  })

  describe('Footer', () => {
    it('shows close button in footer', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        const closeButtons = screen.getAllByText('Cerrar')
        expect(closeButtons.length).toBe(1) // Footer close button (aria-label on X doesn't show text)
      })
    })

    it('closes modal when footer button clicked', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Cerrar')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Cerrar'))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Transaction Type Icons', () => {
    it('shows truck icon for purchase', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getAllByTestId('icon-truck').length).toBeGreaterThan(0)
      })
    })

    it('shows cart icon for sale', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getAllByTestId('icon-cart').length).toBeGreaterThan(0)
      })
    })

    it('shows settings icon for adjustment', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getAllByTestId('icon-settings').length).toBeGreaterThan(0)
      })
    })

    it('shows alert icon for damage', async () => {
      render(<StockHistoryModal {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getAllByTestId('icon-alert-triangle').length).toBeGreaterThan(0)
      })
    })
  })
})
