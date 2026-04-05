export default function SearchLoading() {
  return (
    <div className="animate-pulse">
      <div className="container mx-auto px-4 py-8">
        {/* Search header skeleton */}
        <div className="mb-2 h-9 w-64 rounded-lg bg-muted" />
        <div className="mb-8 h-5 w-40 rounded-lg bg-muted/60" />

        {/* Search bar skeleton */}
        <div className="mb-8 h-10 w-full max-w-md rounded-lg bg-muted" />

        {/* Results grid skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-xl bg-gradient-to-br from-rose-100 to-purple-100" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted/60" />
              <div className="h-5 w-1/3 rounded bg-muted/80" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
