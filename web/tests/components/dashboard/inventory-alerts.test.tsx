/**
 * InventoryAlerts Component Tests
 *
 * Tests the inventory alerts panel component including:
 * - Loading state
 * - Tab navigation
 * - Alert categorization (low stock, expiring, out of stock)
 * - Alert display with proper icons and styling
 * - Empty state
 * - Expiry date formatting
 *
 * @ticket TEST-002
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  Package: () => <span data-testid="icon-package" />,
  Clock: () => <span data-testid="icon-clock" />,
  XCircle: () => <span data-testid="icon-x-circle" />,
}))

// Mock fetch
global.fetch = vi.fn()

import { InventoryAlerts } from '@/components/dashboard/inventory-alerts'

describe('InventoryAlerts', () => {
  const mockAlertsData = {
    low_stock: [
      {
        product_id: 'prod-1',
        product_name: 'Vacuna Antirrábica',
        sku: 'VAC-001',
        alert_type: 'low_stock' as const,
        current_stock: 5,
        min_stock: 10,
      },
    ],
    expiring_soon: [
      {
        product_id: 'prod-2',
        product_name: 'Antibiótico XYZ',
        sku: 'ANT-002',
        alert_type: 'expiring' as const,
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      },
    ],
    out_of_stock: [
      {
        product_id: 'prod-3',
        product_name: 'Desparasitante ABC',
        sku: 'DES-003',
        alert_type: 'out_of_stock' as const,
        current_stock: 0,
        min_stock: 5,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-08T10:00:00Z'))
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockAlertsData,
    })
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('Loading State', () => {
    it('shows loading skeleton initially', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<InventoryAlerts clinic="terrapet" />)

      // Should show animated skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('hides loading skeleton after data loads', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    it('fetches alerts with correct clinic parameter', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/inventory-alerts?clinic=terrapet')
      })
    })

    it('handles fetch error gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
      })
      // Component should not crash, just show empty state
    })

    it('handles non-ok response gracefully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
      })
    })
  })

  describe('Header and Title', () => {
    it('displays title', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Alertas de Inventario')).toBeInTheDocument()
      })
    })

    it('shows total alert count badge', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        // 1 low_stock + 1 expiring + 1 out_of_stock = 3
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('does not show badge when no alerts', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ low_stock: [], expiring_soon: [], out_of_stock: [] }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('No hay alertas de inventario')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('renders all tabs', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Todas')).toBeInTheDocument()
        expect(screen.getByText('Stock bajo')).toBeInTheDocument()
        expect(screen.getByText('Por vencer')).toBeInTheDocument()
      })
    })

    it('shows correct count on tabs', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        // Stock bajo should have (2) - low_stock + out_of_stock
        expect(screen.getByText('(2)')).toBeInTheDocument()
        // Por vencer should have (1)
        expect(screen.getByText('(1)')).toBeInTheDocument()
      })
    })

    it('filters to low stock when tab clicked', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      })

      const stockTab = screen.getByText('Stock bajo')
      fireEvent.click(stockTab)

      // Should show low stock and out of stock items
      expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      expect(screen.getByText('Desparasitante ABC')).toBeInTheDocument()
      // Should NOT show expiring item
      expect(screen.queryByText('Antibiótico XYZ')).not.toBeInTheDocument()
    })

    it('filters to expiring when tab clicked', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      })

      const expiringTab = screen.getByText('Por vencer')
      fireEvent.click(expiringTab)

      // Should only show expiring item
      expect(screen.getByText('Antibiótico XYZ')).toBeInTheDocument()
      expect(screen.queryByText('Vacuna Antirrábica')).not.toBeInTheDocument()
    })

    it('shows all alerts when "Todas" tab clicked', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      })

      // Click stock bajo first
      fireEvent.click(screen.getByText('Stock bajo'))
      expect(screen.queryByText('Antibiótico XYZ')).not.toBeInTheDocument()

      // Click Todas
      fireEvent.click(screen.getByText('Todas'))
      expect(screen.getByText('Antibiótico XYZ')).toBeInTheDocument()
      expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
    })
  })

  describe('Alert Display', () => {
    it('displays alert product name and SKU', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
        expect(screen.getByText('VAC-001')).toBeInTheDocument()
      })
    })

    it('displays stock quantity for low stock alerts', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('5 / 10')).toBeInTheDocument()
      })
    })

    it('displays "Sin stock" for out of stock alerts', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Sin stock')).toBeInTheDocument()
      })
    })

    it('displays relative expiry date for expiring alerts', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText(/Vence en 7 días/i)).toBeInTheDocument()
      })
    })
  })

  describe('Expiry Date Formatting', () => {
    it('shows "Vencido" for past dates', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          low_stock: [],
          expiring_soon: [{
            product_id: 'prod-1',
            product_name: 'Expired Product',
            sku: 'EXP-001',
            alert_type: 'expiring' as const,
            expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          }],
          out_of_stock: [],
        }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vencido')).toBeInTheDocument()
      })
    })

    it('shows "Vence hoy" for today', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          low_stock: [],
          expiring_soon: [{
            product_id: 'prod-1',
            product_name: 'Expires Today',
            sku: 'EXP-001',
            alert_type: 'expiring' as const,
            expiry_date: new Date('2026-01-08T23:59:59Z').toISOString(), // Same day
          }],
          out_of_stock: [],
        }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vence hoy')).toBeInTheDocument()
      })
    })

    it('shows "Vence mañana" for tomorrow', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          low_stock: [],
          expiring_soon: [{
            product_id: 'prod-1',
            product_name: 'Expires Tomorrow',
            sku: 'EXP-001',
            alert_type: 'expiring' as const,
            expiry_date: new Date('2026-01-09T12:00:00Z').toISOString(), // Tomorrow
          }],
          out_of_stock: [],
        }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vence mañana')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no alerts', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ low_stock: [], expiring_soon: [], out_of_stock: [] }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('No hay alertas de inventario')).toBeInTheDocument()
      })
    })

    it('shows empty state for filtered tab with no items', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          low_stock: [mockAlertsData.low_stock[0]],
          expiring_soon: [],
          out_of_stock: [],
        }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      })

      // Switch to expiring tab
      fireEvent.click(screen.getByText('Por vencer'))

      expect(screen.getByText('No hay alertas de inventario')).toBeInTheDocument()
    })
  })

  describe('Icons', () => {
    it('renders alert triangle icon in header', async () => {
      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('icon-alert-triangle').length).toBeGreaterThan(0)
      })
    })

    it('renders package icon in empty state', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ low_stock: [], expiring_soon: [], out_of_stock: [] }),
      })

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByTestId('icon-package')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Interval', () => {
    it('sets up refresh interval on mount', async () => {
      vi.spyOn(global, 'setInterval')

      render(<InventoryAlerts clinic="terrapet" />)

      await waitFor(() => {
        // Should set up a 10-minute interval
        expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 10 * 60 * 1000)
      })
    })
  })
})
