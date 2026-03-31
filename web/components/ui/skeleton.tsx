import { clsx } from 'clsx'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rounded'
  animation?: 'pulse' | 'shimmer' | 'none'
}

function Skeleton({
  className,
  variant = 'default',
  animation = 'pulse',
  ...props
}: SkeletonProps): React.ReactElement {
  const baseStyles = 'bg-gray-200'

  const variants = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
  }

  const animations = {
    pulse: 'animate-pulse',
    shimmer:
      'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
    none: '',
  }

  return (
    <div
      className={clsx(baseStyles, variants[variant], animations[animation], className)}
      {...props}
    />
  )
}

// Pre-built skeleton components for common use cases
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}): React.ReactElement {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  )
}

function SkeletonCard({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={clsx('space-y-4 rounded-2xl bg-white p-6 shadow-sm', className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" variant="rounded" />
        <Skeleton className="h-8 w-20" variant="rounded" />
      </div>
    </div>
  )
}

function SkeletonProductCard({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={clsx('overflow-hidden rounded-2xl bg-white shadow-sm', className)}>
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton variant="circular" className="h-10 w-10" />
        </div>
      </div>
    </div>
  )
}

function SkeletonPetCard({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={clsx('rounded-2xl bg-white p-6 shadow-sm', className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="h-16 w-16" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  )
}

function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}): React.ReactElement {
  return (
    <div className={clsx('overflow-hidden rounded-2xl bg-white shadow-sm', className)}>
      {/* Header */}
      <div
        className="grid gap-4 border-b border-gray-100 bg-gray-50 p-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 border-b border-gray-50 p-4 last:border-0"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

function SkeletonStatCard({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={clsx('space-y-3 rounded-xl border border-gray-100 bg-white p-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function SkeletonAppointmentCard({ className }: { className?: string }): React.ReactElement {
  return (
    <div
      className={clsx(
        'flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4',
        className
      )}
    >
      <Skeleton className="h-12 w-12 flex-shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  )
}

function SkeletonInvoiceRow({ className }: { className?: string }): React.ReactElement {
  return (
    <div
      className={clsx(
        'flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4',
        className
      )}
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

function SkeletonAvatar({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}): React.ReactElement {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  return <Skeleton variant="circular" className={clsx(sizeClasses[size], className)} />
}

function SkeletonButton({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}): React.ReactElement {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-28',
    lg: 'h-12 w-36',
  }

  return <Skeleton variant="rounded" className={clsx(sizeClasses[size], className)} />
}

function SkeletonDashboard({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <SkeletonButton size="md" />
          <SkeletonButton size="md" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-6 w-32" />
          <SkeletonAppointmentCard />
          <SkeletonAppointmentCard />
          <SkeletonAppointmentCard />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-28" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}

function SkeletonForm({
  fields = 4,
  className,
}: {
  fields?: number
  className?: string
}): React.ReactElement {
  return (
    <div className={clsx('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" variant="rounded" />
        </div>
      ))}
      <Skeleton className="h-12 w-full" variant="rounded" />
    </div>
  )
}

function SkeletonList({
  items = 5,
  className,
}: {
  items?: number
  className?: string
}): React.ReactElement {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4"
        >
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonProductCard,
  SkeletonPetCard,
  SkeletonTable,
  SkeletonStatCard,
  SkeletonAppointmentCard,
  SkeletonInvoiceRow,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonDashboard,
  SkeletonForm,
  SkeletonList,
}
