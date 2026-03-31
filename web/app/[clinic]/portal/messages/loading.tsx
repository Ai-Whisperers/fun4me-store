import { SkeletonList, Skeleton } from '@/components/ui/skeleton'

export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:flex-row">
      {/* Conversations list */}
      <div className="w-full border-b bg-white p-4 md:w-80 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <SkeletonList items={6} />
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-4 border-b p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}
