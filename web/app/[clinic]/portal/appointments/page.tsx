import { AppointmentList } from '@/components/appointments/appointment-list'
import { getOwnerAppointments } from '@/app/actions/appointments'
import { notFound } from 'next/navigation'

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ clinic: string }>
}) {
  const { clinic } = await params

  const result = await getOwnerAppointments(clinic)

  if (!result.success) {
    // Handle unauthorized or other errors
    return (
      <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600">
        <p className="font-bold">Error al cargar citas</p>
        <p className="text-sm">{result.error}</p>
      </div>
    )
  }

  if (!result.data) {
    return notFound()
  }

  const { upcoming, past } = result.data

  return (
    <div className="container mx-auto">
      <h1 className="mb-8 px-4 text-3xl font-black text-[var(--text-primary)] sm:px-6 lg:px-8">
        Mis Citas
      </h1>
      <AppointmentList upcoming={upcoming} past={past} clinic={clinic} />
    </div>
  )
}
