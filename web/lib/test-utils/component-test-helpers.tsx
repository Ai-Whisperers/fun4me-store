/**
 * Component Test Helpers
 *
 * This module provides utilities for testing React components:
 * - Provider wrappers for context (cart, wishlist, auth)
 * - Mock routers and navigation
 * - Form action mocks for useActionState
 * - Accessibility testing helpers
 *
 * @example
 * ```typescript
 * import { renderWithProviders, mockRouter, mockFormAction } from '@/lib/test-utils/component-test-helpers';
 *
 * test('renders login form', () => {
 *   renderWithProviders(<LoginForm clinic="terrapet" redirectTo="/portal" />);
 *   expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
 * });
 * ```
 */

import React, { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi, Mock } from 'vitest'
import { TENANT_IDS } from '@/lib/constants/tenants'

// =============================================================================
// Types
// =============================================================================

export interface MockRouterOptions {
  pathname?: string
  params?: Record<string, string>
  searchParams?: Record<string, string>
  push?: Mock
  replace?: Mock
  back?: Mock
  refresh?: Mock
}

export interface MockCartContextValue {
  items: CartItem[]
  addItem: Mock
  removeItem: Mock
  updateQuantity: Mock
  clearCart: Mock
  totalItems: number
  totalPrice: number
}

export interface MockWishlistContextValue {
  items: string[]
  isWishlisted: Mock
  toggleWishlist: Mock
  addToWishlist: Mock
  removeFromWishlist: Mock
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  type: 'product' | 'service'
  image_url?: string
  stock?: number
}

// =============================================================================
// Mock Router
// =============================================================================

/**
 * Creates a mock router for next/navigation
 */
export function createMockRouter(options: MockRouterOptions = {}) {
  const {
    pathname = '/',
    params = {},
    searchParams = {},
    push = vi.fn(),
    replace = vi.fn(),
    back = vi.fn(),
    refresh = vi.fn(),
  } = options

  return {
    pathname,
    params,
    searchParams: new URLSearchParams(searchParams),
    push,
    replace,
    back,
    refresh,
    forward: vi.fn(),
    prefetch: vi.fn(),
  }
}

/**
 * Mock module factory for next/navigation
 * Usage: vi.mock('next/navigation', () => mockNextNavigation({ clinic: 'terrapet' }))
 */
export function mockNextNavigation(params: Record<string, string> = {}, searchParams: Record<string, string> = {}) {
  const router = createMockRouter({ params, searchParams })

  return {
    useRouter: () => router,
    useParams: () => params,
    useSearchParams: () => new URLSearchParams(searchParams),
    usePathname: () => router.pathname,
    notFound: vi.fn(),
    redirect: vi.fn(),
  }
}

// =============================================================================
// Mock Cart Context
// =============================================================================

/**
 * Creates mock cart context value
 */
export function createMockCartContext(initialItems: CartItem[] = []): MockCartContextValue {
  return {
    items: initialItems,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalItems: initialItems.reduce((acc, item) => acc + item.quantity, 0),
    totalPrice: initialItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
  }
}

// =============================================================================
// Mock Wishlist Context
// =============================================================================

/**
 * Creates mock wishlist context value
 */
export function createMockWishlistContext(initialItems: string[] = []): MockWishlistContextValue {
  return {
    items: initialItems,
    isWishlisted: vi.fn((id: string) => initialItems.includes(id)),
    toggleWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  }
}

// =============================================================================
// Mock Form Actions
// =============================================================================

/**
 * Creates a mock for useActionState hook
 * Returns [state, formAction, isPending]
 */
export function createMockActionState<TState>(
  initialState: TState | null = null,
  isPending: boolean = false
): [TState | null, Mock, boolean] {
  const formAction = vi.fn()
  return [initialState, formAction, isPending]
}

/**
 * Mock module factory for server actions
 */
export function createMockServerAction<TInput = unknown, TOutput = unknown>(
  defaultResponse?: TOutput,
  shouldFail: boolean = false,
  errorMessage: string = 'Error'
) {
  return vi.fn(async () => {
    if (shouldFail) {
      return { error: errorMessage }
    }
    return defaultResponse ?? ({ success: true } as TOutput)
  })
}

// =============================================================================
// Mock Lucide Icons
// =============================================================================

/**
 * Creates mock Lucide icons for testing
 * Usage: vi.mock('lucide-react', () => mockLucideIcons)
 */
export const mockLucideIcons = new Proxy(
  {},
  {
    get: (_, iconName) => {
      // Return a functional component for each icon
      const IconComponent = ({ className, ...props }: { className?: string }) => (
        <span data-testid={`icon-${String(iconName).toLowerCase()}`} className={className} {...props} />
      )
      IconComponent.displayName = String(iconName)
      return IconComponent
    },
  }
)

// =============================================================================
// Test Providers
// =============================================================================

interface AllProvidersProps {
  children: ReactNode
  cartContext?: MockCartContextValue
  wishlistContext?: MockWishlistContextValue
}

/**
 * Wraps component with all required providers for testing
 */
export function AllProviders({ children }: AllProvidersProps): React.ReactElement {
  // For now, just return children - providers are mocked at module level
  return <>{children}</>
}

// =============================================================================
// Render Helpers
// =============================================================================

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  cartContext?: MockCartContextValue
  wishlistContext?: MockWishlistContextValue
  router?: MockRouterOptions
}

/**
 * Render component with all test providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { cartContext, wishlistContext, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders cartContext={cartContext} wishlistContext={wishlistContext}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  })
}

// =============================================================================
// Accessibility Helpers
// =============================================================================

/**
 * Check that form has proper labels
 */
export function expectFormAccessibility(container: HTMLElement): void {
  const inputs = container.querySelectorAll('input, select, textarea')
  inputs.forEach((input) => {
    const id = input.getAttribute('id')
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`)
      if (!label) {
        // Check for aria-label or aria-labelledby as alternatives
        const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby')
        if (!hasAriaLabel) {
          throw new Error(`Input with id "${id}" has no associated label or aria-label`)
        }
      }
    }
  })
}

/**
 * Check that error messages are properly announced
 */
export function expectErrorAccessibility(errorElement: HTMLElement | null): void {
  if (!errorElement) return

  const hasRole = errorElement.getAttribute('role') === 'alert'
  const hasAriaLive = errorElement.getAttribute('aria-live') !== null

  if (!hasRole && !hasAriaLive) {
    throw new Error('Error message should have role="alert" or aria-live attribute')
  }
}

// =============================================================================
// Form Testing Helpers
// =============================================================================

/**
 * Fill a form input by label text
 */
export async function fillFormInput(
  getByLabelText: (text: RegExp | string) => HTMLElement,
  label: RegExp | string,
  value: string
): Promise<void> {
  const { fireEvent } = await import('@testing-library/react')
  const input = getByLabelText(label)
  fireEvent.change(input, { target: { value } })
}

/**
 * Submit a form by finding the submit button
 */
export async function submitForm(
  getByRole: (role: string, options?: { name?: RegExp | string }) => HTMLElement,
  buttonName?: RegExp | string
): Promise<void> {
  const { fireEvent } = await import('@testing-library/react')
  const button = getByRole('button', buttonName ? { name: buttonName } : undefined)
  fireEvent.click(button)
}

// =============================================================================
// Snapshot Helpers
// =============================================================================

/**
 * Get important DOM structure for snapshot testing (removes dynamic content)
 */
export function getStableSnapshot(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement

  // Remove dynamic IDs
  clone.querySelectorAll('[id^="react-"]').forEach((el) => el.removeAttribute('id'))

  // Normalize data-testid
  clone.querySelectorAll('[data-testid]').forEach((el) => {
    const testId = el.getAttribute('data-testid')
    if (testId?.includes('-')) {
      el.setAttribute('data-testid', testId.split('-')[0])
    }
  })

  return clone.innerHTML
}

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Create a mock product for store component testing
 */
export function createMockProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: `product-${Math.random().toString(36).slice(2)}`,
    name: 'Test Product',
    slug: 'test-product',
    sku: 'TEST-001',
    current_price: 50000,
    original_price: 60000,
    has_discount: true,
    discount_percentage: 17,
    is_new_arrival: false,
    is_best_seller: false,
    stock_quantity: 10,
    image_url: null,
    short_description: 'A test product description',
    category: { id: 'cat-1', name: 'Test Category', slug: 'test' },
    brand: { id: 'brand-1', name: 'Test Brand' },
    avg_rating: 4.5,
    review_count: 12,
    ...overrides,
  }
}

interface ProductListItem {
  id: string
  name: string
  slug: string
  sku: string | null
  current_price: number
  original_price: number | null
  has_discount: boolean
  discount_percentage: number | null
  is_new_arrival: boolean
  is_best_seller: boolean
  stock_quantity: number
  inventory?: { stock_quantity: number }
  image_url: string | null
  short_description: string | null
  category: { id: string; name: string; slug: string } | null
  brand: { id: string; name: string } | null
  avg_rating: number | null
  review_count: number | null
}

/**
 * Create a mock pet for pet component testing
 */
export function createMockPet(overrides: Partial<MockPet> = {}): MockPet {
  return {
    id: `pet-${Math.random().toString(36).slice(2)}`,
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    weight_kg: 25.5,
    microchip_id: null,
    diet_category: 'balanced',
    diet_notes: null,
    sex: 'male',
    is_neutered: true,
    color: 'Golden',
    temperament: 'friendly',
    allergies: null,
    existing_conditions: null,
    photo_url: null,
    birth_date: '2020-05-15',
    ...overrides,
  }
}

interface MockPet {
  id: string
  name: string
  species: string
  breed?: string | null
  weight_kg?: number | null
  microchip_id?: string | null
  diet_category?: string | null
  diet_notes?: string | null
  sex?: string | null
  is_neutered?: boolean
  color?: string | null
  temperament?: string | null
  allergies?: string | null
  existing_conditions?: string | null
  photo_url?: string | null
  birth_date?: string | null
}

/**
 * Create a mock appointment for appointment component testing
 */
export function createMockAppointment(overrides: Partial<MockAppointment> = {}): MockAppointment {
  const startTime = new Date()
  startTime.setDate(startTime.getDate() + 7) // 7 days in the future
  startTime.setHours(10, 0, 0, 0)

  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + 30)

  return {
    id: `appointment-${Math.random().toString(36).slice(2)}`,
    tenant_id: TENANT_IDS.ADRIS,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: 'pending',
    reason: 'Consulta general',
    notes: null,
    pets: {
      id: 'pet-1',
      name: 'Max',
      species: 'dog',
      photo_url: null,
    },
    ...overrides,
  }
}

interface MockAppointment {
  id: string
  tenant_id: string
  start_time: string
  end_time: string
  status: string
  reason: string
  notes?: string | null
  pets: {
    id: string
    name: string
    species: string
    photo_url?: string | null
  }
}

// =============================================================================
// Exports
// =============================================================================

export type {
  ProductListItem as MockProductListItem,
  MockPet,
  MockAppointment,
}
