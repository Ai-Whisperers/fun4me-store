import { SkeletonList, Skeleton } from '@/components/ui/skeleton'

export default function WhatsAppLoading() {
  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* Conversations sidebar */}
      <div className="w-80 border-r bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="mb-4 h-10 w-full rounded-lg" />
        <SkeletonList items={8} />
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center gap-4 border-b bg-white p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`h-16 w-64 rounded-2xl ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="flex items-center gap-2 border-t bg-white p-4">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  )
}
