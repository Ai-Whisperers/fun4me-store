import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'

export default function PortalLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
