import { Metadata } from 'next'
import CatalogBrowser from '@/components/inventory/catalog-browser'

interface PageProps {
  params: Promise<{ clinic: string }>
}

export const metadata: Metadata = {
  title: 'Catálogo Global - Inventario',
  description: 'Explora y agrega productos del catálogo global a tu inventario',
}

export default async function CatalogPage({ params }: PageProps) {
  const { clinic } = await params

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Catálogo Global</h1>
            <p className="mt-1 text-gray-500">
              Explora productos disponibles y agrégalos a tu inventario
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href={`/${clinic}/portal`} className="hover:text-gray-700">
            Portal
          </a>
          <span>/</span>
          <a href={`/${clinic}/portal/inventory`} className="hover:text-gray-700">
            Inventario
          </a>
          <span>/</span>
          <span className="font-medium text-gray-900">Catálogo Global</span>
        </nav>
      </div>

      <CatalogBrowser clinic={clinic} />
    </div>
  )
}
