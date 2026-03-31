import { SkeletonInvoiceRow, Skeleton } from '@/components/ui/skeleton'

export default function InvoicesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Invoice list */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonInvoiceRow key={i} />
        ))}
      </div>
    </div>
  )
}
