export default function OrdersLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="mb-2 h-9 w-36 rounded-lg bg-muted" />
        <div className="h-5 w-60 rounded-lg bg-muted/60" />
      </div>

      {/* Status filter skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-muted/60" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-3">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-4">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted/80" />
            <div className="h-4 w-24 rounded bg-muted/60" />
            <div className="h-5 w-20 rounded-full bg-muted/60" />
            <div className="h-4 w-20 rounded bg-muted/60" />
            <div className="h-8 w-16 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
