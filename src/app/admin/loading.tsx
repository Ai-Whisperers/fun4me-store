export default function AdminDashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="mb-2 h-9 w-40 rounded-lg bg-muted" />
        <div className="h-5 w-72 rounded-lg bg-muted/60" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-4 rounded bg-muted/60" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-muted" />
            <div className="mt-2 h-4 w-32 rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Bottom cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6">
            <div className="mb-2 h-6 w-48 rounded bg-muted" />
            <div className="mb-4 h-4 w-56 rounded bg-muted/60" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-5 w-20 rounded-full bg-muted/60" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
