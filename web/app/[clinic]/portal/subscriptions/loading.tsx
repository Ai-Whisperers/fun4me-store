import { SkeletonCard, Skeleton } from '@/components/ui/skeleton'

export default function SubscriptionsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Active subscriptions */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>

      {/* Available plans */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
              <Skeleton className="mb-4 h-6 w-24" />
              <Skeleton className="mb-2 h-10 w-20" />
              <Skeleton className="mb-6 h-4 w-full" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="mt-6 h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
