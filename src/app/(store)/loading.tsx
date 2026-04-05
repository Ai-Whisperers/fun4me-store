export default function StoreLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-rose-200 via-pink-200 to-purple-200 py-20 sm:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto mb-4 h-10 w-3/4 max-w-lg rounded-lg bg-white/40" />
          <div className="mx-auto mb-8 h-6 w-1/2 max-w-sm rounded-lg bg-white/30" />
          <div className="flex justify-center gap-4">
            <div className="h-11 w-36 rounded-lg bg-white/50" />
            <div className="h-11 w-44 rounded-lg bg-white/30" />
          </div>
        </div>
      </div>

      {/* Categories skeleton */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-2 h-8 w-64 rounded-lg bg-muted" />
          <div className="mx-auto mb-8 h-5 w-48 rounded-lg bg-muted/60" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-rose-100 to-purple-100" />
            ))}
          </div>
        </div>
      </div>

      {/* Kinks skeleton */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-2 h-8 w-56 rounded-lg bg-muted" />
          <div className="mx-auto mb-8 h-5 w-52 rounded-lg bg-muted/60" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-gradient-to-br from-orange-100 to-rose-100" />
            ))}
          </div>
        </div>
      </div>

      {/* Featured products skeleton */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-2 h-8 w-52 rounded-lg bg-muted" />
          <div className="mx-auto mb-8 h-5 w-56 rounded-lg bg-muted/60" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square rounded-xl bg-gradient-to-br from-rose-100 to-purple-100" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-5 w-1/3 rounded bg-muted/80" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
