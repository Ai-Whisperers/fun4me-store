import { Skeleton, SkeletonInvoiceRow, SkeletonButton } from '@/components/ui/skeleton'

export default function InvoicesLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <SkeletonButton size="lg" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 max-w-xs flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <SkeletonInvoiceRow key={i} />
        ))}
      </div>
    </div>
  )
}
