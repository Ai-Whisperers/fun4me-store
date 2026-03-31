import { SkeletonStatCard, SkeletonList, Skeleton } from '@/components/ui/skeleton'

export default function PaymentsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Payment methods */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
        <SkeletonList items={3} />
      </div>

      {/* Payment history */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <SkeletonList items={6} />
      </div>
    </div>
  )
}
