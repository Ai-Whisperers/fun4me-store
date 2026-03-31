import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock Next.js modules that don't work in jsdom
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/terrapet',
    query: {},
  }),
  usePathname: () => '/terrapet',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return children
  },
}))

// Mock next-intl
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(() => (key: string) => key),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  })),
}))

// Mock framer-motion (can cause issues in tests)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children?: React.ReactNode }) => children,
    section: ({ children }: { children?: React.ReactNode }) => children,
    span: ({ children }: { children?: React.ReactNode }) => children,
    h1: ({ children }: { children?: React.ReactNode }) => children,
    h2: ({ children }: { children?: React.ReactNode }) => children,
    p: ({ children }: { children?: React.ReactNode }) => children,
    button: ({ children }: { children?: React.ReactNode }) => children,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}))

// Mock Leaflet (map library)
vi.mock('leaflet', () => ({
  default: {},
  icon: vi.fn(),
  Map: vi.fn(),
  TileLayer: vi.fn(),
  Marker: vi.fn(),
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => children,
  TileLayer: () => null,
  Marker: () => null,
  Popup: ({ children }: { children?: React.ReactNode }) => children,
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

console.log('[Test Setup] Component testing environment initialized')
