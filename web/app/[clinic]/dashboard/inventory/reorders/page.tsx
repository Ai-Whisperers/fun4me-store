import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import ReorderSuggestions from '@/components/dashboard/inventory/reorder-suggestions'

export const metadata: Metadata = {
  title: 'Sugerencias de Reorden | Inventario',
  description: 'Productos que necesitan reposición basados en niveles de stock',
}

interface PageProps {
  params: Promise<{ clinic: string }>
}

export default async function ReorderSuggestionsPage({ params }: PageProps): Promise<React.ReactElement> {
  const { clinic } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/portal/login?redirect=/${clinic}/dashboard/inventory/reorders`)
  }

  // Verify staff access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    redirect(`/${clinic}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link
                href={`/${clinic}/dashboard/inventory`}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
                <ShoppingCart className="h-7 w-7 text-[var(--primary)]" />
                Sugerencias de Reorden
              </h1>
            </div>
            <p className="ml-12 text-[var(--text-secondary)]">
              Productos que necesitan reposición basados en sus niveles de stock configurados
            </p>
          </div>
        </div>

        {/* Content */}
        <ReorderSuggestions clinic={clinic} />
      </div>
    </div>
  )
}
