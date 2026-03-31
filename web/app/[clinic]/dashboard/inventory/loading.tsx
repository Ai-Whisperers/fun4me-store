import {
  Skeleton,
  SkeletonProductCard,
  SkeletonStatCard,
  SkeletonButton,
} from '@/components/ui/skeleton'

export default function InventoryLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          <SkeletonButton size="md" />
          <SkeletonButton size="md" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {[...Array(12)].map((_, i) => (
          <SkeletonProductCard key={i} />
        ))}
      </div>
    </div>
  )
}
