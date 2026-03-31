import { Skeleton } from '@/components/ui/skeleton'

export default function ClinicLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero section skeleton */}
      <div className="bg-gradient-to-b from-[var(--bg-subtle)] to-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-12 w-36 rounded-xl" />
                <Skeleton className="h-12 w-36 rounded-xl" />
              </div>
            </div>
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Services section skeleton */}
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto mt-3 h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-6 shadow-sm">
              <Skeleton className="mb-4 h-12 w-12 rounded-xl" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
