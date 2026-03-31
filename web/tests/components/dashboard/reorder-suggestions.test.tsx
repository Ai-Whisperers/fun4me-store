/**
 * ReorderSuggestions Component Tests
 *
 * Tests the reorder suggestions component including:
 * - Loading state
 * - Error state
 * - Empty state (inventory in order)
 * - Summary cards
 * - Supplier groups with expand/collapse
 * - Urgency badges
 * - Product details display
 * - Refresh functionality
 *
 * @ticket TEST-002
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: (e: React.MouseEvent) => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ShoppingCart: () => <span data-testid="icon-cart" />,
  AlertCircle: () => <span data-testid="icon-alert-circle" />,
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  Package: () => <span data-testid="icon-package" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Building2: () => <span data-testid="icon-building" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  ExternalLink: () => <span data-testid="icon-external" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
}))

// Mock fetch
global.fetch = vi.fn()

import ReorderSuggestions from '@/components/dashboard/inventory/reorder-suggestions'

describe('ReorderSuggestions', () => {
  const mockData = {
    grouped: [
      {
        supplier_id: 'sup-1',
        supplier_name: 'VetPharm S.A.',
        total_cost: 500000,
        total_items: 2,
        products: [
          {
            id: 'prod-1',
            name: 'Vacuna Antirrábica',
            sku: 'VAC-001',
            image_url: null,
            category_name: 'Vacunas',
            stock_quantity: 0,
            available_quantity: 0,
            min_stock_level: 10,
            reorder_point: 5,
            reorder_quantity: 20,
            weighted_average_cost: 25000,
            supplier_id: 'sup-1',
            supplier_name: 'VetPharm S.A.',
            urgency: 'critical' as const,
          },
          {
            id: 'prod-2',
            name: 'Antibiótico XYZ',
            sku: 'ANT-002',
            image_url: 'https://example.com/image.jpg',
            category_name: 'Medicamentos',
            stock_quantity: 3,
            available_quantity: 3,
            min_stock_level: 10,
            reorder_point: 5,
            reorder_quantity: 15,
            weighted_average_cost: 15000,
            supplier_id: 'sup-1',
            supplier_name: 'VetPharm S.A.',
            urgency: 'low' as const,
          },
        ],
      },
      {
        supplier_id: null,
        supplier_name: 'Sin proveedor',
        total_cost: 100000,
        total_items: 1,
        products: [
          {
            id: 'prod-3',
            name: 'Producto Sin Proveedor',
            sku: null,
            image_url: null,
            category_name: null,
            stock_quantity: 2,
            available_quantity: 2,
            min_stock_level: 5,
            reorder_point: 3,
            reorder_quantity: 10,
            weighted_average_cost: 10000,
            supplier_id: null,
            supplier_name: 'Sin proveedor',
            urgency: 'reorder' as const,
          },
        ],
      },
    ],
    summary: {
      total_products: 3,
      critical_count: 1,
      low_count: 1,
      total_estimated_cost: 600000,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner initially', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      )

      render(<ReorderSuggestions clinic="terrapet" />)

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
      expect(screen.getByText('Analizando inventario...')).toBeInTheDocument()
    })

    it('hides loading after data loads', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('shows error message on fetch failure', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar las sugerencias de reorden')).toBeInTheDocument()
      })
    })

    it('shows error on non-ok response', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })
    })

    it('retries fetch when retry button clicked', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        })

      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Reintentar'))

      await waitFor(() => {
        expect(screen.getByText('VetPharm S.A.')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('shows "Inventario en orden" when no suggestions', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ grouped: [], summary: null }),
      })

      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('¡Inventario en orden!')).toBeInTheDocument()
        expect(screen.getByText(/no hay productos que necesiten reposición/i)).toBeInTheDocument()
      })
    })
  })

  describe('Summary Cards', () => {
    it('displays total products count', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('productos a reordenar')).toBeInTheDocument()
      })
    })

    it('displays critical count', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Críticos')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('sin stock')).toBeInTheDocument()
      })
    })

    it('displays low stock count', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Stock Bajo')).toBeInTheDocument()
      })
    })

    it('displays estimated cost in PYG format', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        // Should format as PYG currency
        expect(screen.getByText('Costo Est.')).toBeInTheDocument()
        expect(screen.getByText(/600.*000/)).toBeInTheDocument()
      })
    })
  })

  describe('Supplier Groups', () => {
    it('displays supplier group headers', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('VetPharm S.A.')).toBeInTheDocument()
        expect(screen.getByText('Sin proveedor')).toBeInTheDocument()
      })
    })

    it('shows product count per supplier', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText(/2 productos/)).toBeInTheDocument()
        expect(screen.getByText(/1 producto •/)).toBeInTheDocument()
      })
    })

    it('auto-expands first group', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        // First group should be expanded, showing products
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      })
    })

    it('toggles group expansion on click', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      })

      // Click to collapse first group
      const groupHeader = screen.getByText('VetPharm S.A.').closest('button')
      fireEvent.click(groupHeader!)

      // Products should be hidden
      expect(screen.queryByText('Vacuna Antirrábica')).not.toBeInTheDocument()

      // Click again to expand
      fireEvent.click(groupHeader!)
      expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
    })

    it('shows "Crear Orden" button for suppliers with ID', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        const orderLinks = screen.getAllByText('Crear Orden')
        expect(orderLinks.length).toBe(1) // Only for VetPharm, not "Sin proveedor"
        expect(orderLinks[0]).toHaveAttribute('href', '/terrapet/dashboard/procurement/orders/new?supplier=sup-1')
      })
    })

    it('does not show "Crear Orden" for supplier without ID', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          grouped: [mockData.grouped[1]], // Only "Sin proveedor"
          summary: { total_products: 1, critical_count: 0, low_count: 1, total_estimated_cost: 100000 },
        }),
      })

      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Sin proveedor')).toBeInTheDocument()
      })

      expect(screen.queryByText('Crear Orden')).not.toBeInTheDocument()
    })
  })

  describe('Product Display', () => {
    it('displays product name', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacuna Antirrábica')).toBeInTheDocument()
      })
    })

    it('displays SKU when available', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('SKU: VAC-001')).toBeInTheDocument()
      })
    })

    it('displays category when available', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Vacunas')).toBeInTheDocument()
      })
    })

    it('displays stock levels (actual / minimum)', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('0 / 10')).toBeInTheDocument()
        expect(screen.getByText('actual / mínimo')).toBeInTheDocument()
      })
    })

    it('displays suggested reorder quantity', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('+20')).toBeInTheDocument()
        expect(screen.getByText('sugerido')).toBeInTheDocument()
      })
    })

    it('displays estimated cost when WAC available', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        // 20 * 25000 = 500000
        expect(screen.getByText(/500.*000/)).toBeInTheDocument()
      })
    })

    it('shows product image when available', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        const img = screen.getByAltText('Antibiótico XYZ')
        expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
      })
    })
  })

  describe('Urgency Badges', () => {
    it('shows "Sin Stock" badge for critical urgency', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Sin Stock')).toBeInTheDocument()
      })
    })

    it('shows "Stock Bajo" badge for low urgency', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        const badges = screen.getAllByText('Stock Bajo')
        expect(badges.length).toBeGreaterThan(0)
      })
    })

    it('shows "Reordenar" badge for reorder urgency', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      // Expand the second group to see the reorder product
      await waitFor(() => {
        expect(screen.getByText('Sin proveedor')).toBeInTheDocument()
      })

      const secondGroupHeader = screen.getByText('Sin proveedor').closest('button')
      fireEvent.click(secondGroupHeader!)

      expect(screen.getByText('Reordenar')).toBeInTheDocument()
    })
  })

  describe('Refresh Functionality', () => {
    it('shows refresh button', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument()
      })
    })

    it('refreshes data when button clicked', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const refreshButton = screen.getByText('Actualizar')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Links', () => {
    it('renders product link to inventory search', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        const links = screen.getAllByTestId('icon-external')
        expect(links.length).toBeGreaterThan(0)
      })
    })
  })

  describe('API Call', () => {
    it('fetches with groupBySupplier parameter', async () => {
      render(<ReorderSuggestions clinic="terrapet" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/inventory/reorder-suggestions?groupBySupplier=true')
      })
    })
  })
})
