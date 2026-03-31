import { SkeletonAppointmentCard, Skeleton } from '@/components/ui/skeleton'

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Skeleton className="h-10 w-20 flex-shrink-0" />
        <Skeleton className="h-10 w-24 flex-shrink-0" />
        <Skeleton className="h-10 w-24 flex-shrink-0" />
        <Skeleton className="h-10 w-28 flex-shrink-0" />
      </div>

      {/* Appointment list */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonAppointmentCard key={i} />
        ))}
      </div>
    </div>
  )
}
