import { Skeleton, SkeletonCard, SkeletonStatCard, SkeletonButton } from '@/components/ui/skeleton'

export default function HospitalLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <SkeletonButton size="md" className="w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}
