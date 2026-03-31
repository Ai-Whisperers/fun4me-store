import { Skeleton, SkeletonButton } from '@/components/ui/skeleton'

export default function BookLoading() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Skeleton className="mx-auto h-10 w-48" />
      <div className="flex justify-center gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="flex justify-between">
        <SkeletonButton size="md" />
        <SkeletonButton size="md" />
      </div>
    </div>
  )
}
