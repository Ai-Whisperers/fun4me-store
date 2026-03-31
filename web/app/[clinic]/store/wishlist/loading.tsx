import { Skeleton } from '@/components/ui/skeleton'

export default function WishlistLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="mb-1 h-7 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Wishlist Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white shadow-sm"
          >
            {/* Product Image */}
            <Skeleton className="aspect-square w-full" />

            {/* Product Info */}
            <div className="p-4">
              <Skeleton className="mb-2 h-5 w-full" />
              <Skeleton className="mb-2 h-4 w-20" />
              <Skeleton className="mb-4 h-6 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
