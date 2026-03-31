import { Skeleton, SkeletonCard, SkeletonButton } from '@/components/ui/skeleton'

export default function LabLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <SkeletonButton size="lg" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
