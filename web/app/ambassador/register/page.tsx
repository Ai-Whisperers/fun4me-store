import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AmbassadorRegisterForm } from '@/components/ambassador'

export const metadata = {
  title: 'Conviértete en Embajador | Vetic',
  description: 'Únete al programa de embajadores de Vetic y gana comisiones refiriendo veterinarias',
}

export default async function AmbassadorRegisterPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If logged in, check if already an ambassador
  if (user) {
    const { data: ambassador } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (ambassador) {
      // Already an ambassador, redirect to dashboard
      redirect('/ambassador')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <AmbassadorRegisterForm />
      </div>
    </div>
  )
}
