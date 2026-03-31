import { SkeletonStatCard, Skeleton } from '@/components/ui/skeleton'

export default function EpidemiologyLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Map */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}
