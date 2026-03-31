import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'

export default function ServicesLoading() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Skeleton className="mx-auto h-12 w-64" />
      <Skeleton className="mx-auto h-6 w-96" />
      <div className="flex justify-center gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <SkeletonCard key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}
