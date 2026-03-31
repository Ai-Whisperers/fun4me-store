import { SkeletonForm, Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-6 rounded-2xl bg-white p-6 shadow-sm">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <SkeletonForm fields={5} />
      </div>
    </div>
  )
}
