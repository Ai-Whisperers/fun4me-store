import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AmbassadorDashboard } from '@/components/ambassador'

export const metadata = {
  title: 'Panel de Embajador | Vetic',
  description: 'Panel de control para embajadores de Vetic',
}

export default async function AmbassadorPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/ambassador/login')
  }

  // Check if user is an ambassador
  const { data: ambassador } = await supabase
    .from('ambassadors')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (!ambassador) {
    // Not an ambassador, redirect to register
    redirect('/ambassador/register')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">Vetic</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Embajador
            </span>
          </a>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <AmbassadorDashboard />
      </main>
    </div>
  )
}
