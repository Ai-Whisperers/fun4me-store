export default function ProductLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumbs skeleton */}
      <div className="container mx-auto px-4 pt-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-2 rounded bg-muted/50" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-2 rounded bg-muted/50" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image skeleton */}
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-rose-100 to-purple-100" />

          {/* Product info skeleton */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="h-6 w-20 rounded-full bg-muted" />
            {/* Title */}
            <div className="h-9 w-4/5 rounded-lg bg-muted" />
            {/* Price */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-32 rounded-lg bg-gradient-to-r from-rose-200 to-purple-200" />
              <div className="h-5 w-24 rounded bg-muted/50" />
            </div>
            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted/60" />
              <div className="h-4 w-5/6 rounded bg-muted/60" />
              <div className="h-4 w-3/4 rounded bg-muted/60" />
            </div>
            {/* Quantity & Add to cart */}
            <div className="flex items-center gap-4">
              <div className="h-10 w-28 rounded-lg bg-muted" />
              <div className="h-11 flex-1 rounded-lg bg-gradient-to-r from-rose-200 to-purple-200" />
            </div>
            {/* Trust badges */}
            <div className="space-y-3 rounded-xl border p-4">
              <div className="h-4 w-48 rounded bg-muted/60" />
              <div className="h-4 w-40 rounded bg-muted/60" />
              <div className="h-4 w-44 rounded bg-muted/60" />
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="mt-12">
          <div className="flex gap-4 border-b pb-3">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="h-5 w-28 rounded bg-muted/60" />
            <div className="h-5 w-20 rounded bg-muted/60" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-4 w-full rounded bg-muted/60" />
            <div className="h-4 w-5/6 rounded bg-muted/60" />
            <div className="h-4 w-4/6 rounded bg-muted/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
