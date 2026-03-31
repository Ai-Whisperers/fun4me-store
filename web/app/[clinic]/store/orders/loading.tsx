import { Skeleton } from '@/components/ui/skeleton'

export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10">
        {/* Status Filter Skeleton */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>

        {/* Orders List Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex items-center gap-4 p-4 md:p-6">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="mx-auto mt-1 h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
