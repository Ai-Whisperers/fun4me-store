export default function ProductsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 h-9 w-40 rounded-lg bg-muted" />
          <div className="h-5 w-56 rounded-lg bg-muted/60" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-gradient-to-r from-pink-200 to-purple-200" />
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-64 rounded-lg bg-muted" />
        <div className="h-10 w-36 rounded-lg bg-muted" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-3">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-rose-100 to-purple-100" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted/60" />
            <div className="h-5 w-20 rounded-full bg-muted/60" />
            <div className="h-4 w-12 rounded bg-muted/60" />
            <div className="h-8 w-16 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
