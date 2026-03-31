import { Skeleton } from '@/components/ui/skeleton'

export default function CartLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <Skeleton className="h-10 w-48" />

      {/* Cart items */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 rounded-lg border p-4">
            <Skeleton className="h-24 w-24 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between border-t pt-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
