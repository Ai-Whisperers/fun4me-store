export default function CategoryLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumbs skeleton */}
      <div className="container mx-auto px-4 pt-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-2 rounded bg-muted/50" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
      </div>

      {/* Category header skeleton */}
      <div className="container mx-auto px-4">
        <div className="mb-2 h-9 w-56 rounded-lg bg-muted" />
        <div className="mb-8 h-5 w-72 rounded-lg bg-muted/60" />
      </div>

      {/* Filters skeleton */}
      <div className="container mx-auto px-4">
        <div className="mb-6 flex gap-3">
          <div className="h-9 w-28 rounded-lg bg-muted" />
          <div className="h-9 w-32 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Product grid skeleton */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
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
