'use client'

/**
 * Calendar Skeleton Loader
 * Shows a loading placeholder while calendar data is being fetched
 */

interface CalendarSkeletonProps {
  view?: 'week' | 'day' | 'month' | 'agenda'
}

export function CalendarSkeleton({ view = 'week' }: CalendarSkeletonProps) {
  // Render different skeletons based on view
  if (view === 'month') {
    return <MonthSkeleton />
  }

  if (view === 'agenda') {
    return <AgendaSkeleton />
  }

  // Default: Week/Day view skeleton
  return <WeekDaySkeleton isDayView={view === 'day'} />
}

function WeekDaySkeleton({ isDayView }: { isDayView: boolean }) {
  const columns = isDayView ? 1 : 7
  const hours = Array.from({ length: 10 }, (_, i) => i + 8) // 8am to 5pm

  return (
    <div className="flex h-full animate-pulse flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] p-2">
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-24 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-20 rounded bg-[var(--bg-muted)]" />
        </div>
        <div className="h-6 w-32 rounded bg-[var(--bg-muted)]" />
        <div className="flex gap-1">
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
        </div>
      </div>

      {/* Header with days */}
      <div className="flex border-b border-[var(--border-light)]">
        <div className="w-16 shrink-0" />
        <div className={`grid flex-1 gap-px ${isDayView ? '' : 'grid-cols-7'}`}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="border-l border-[var(--border-light)] p-2 text-center">
              <div className="mx-auto mb-1 h-4 w-8 rounded bg-[var(--bg-muted)]" />
              <div className="mx-auto h-6 w-6 rounded-full bg-[var(--bg-muted)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Time gutter */}
          <div className="w-16 shrink-0 border-r border-[var(--border-light)]">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b border-[var(--border-light)] pr-2 pt-1 text-right"
              >
                <div className="ml-auto h-3 w-10 rounded bg-[var(--bg-muted)]" />
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className={`grid flex-1 gap-px ${isDayView ? '' : 'grid-cols-7'}`}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="border-l border-[var(--border-light)]">
                {hours.map((hour) => (
                  <div key={hour} className="relative h-16 border-b border-[var(--border-light)]">
                    {/* Random event placeholders */}
                    {Math.random() > 0.7 && (
                      <div
                        className="absolute left-1 right-1 rounded bg-[var(--bg-muted)]"
                        style={{
                          top: `${Math.random() * 20}%`,
                          height: `${40 + Math.random() * 40}px`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthSkeleton() {
  const weeks = 5
  const days = 7

  return (
    <div className="flex h-full animate-pulse flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] p-2">
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-24 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-20 rounded bg-[var(--bg-muted)]" />
        </div>
        <div className="h-6 w-32 rounded bg-[var(--bg-muted)]" />
        <div className="flex gap-1">
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 border-b border-[var(--border-light)]">
        {Array.from({ length: days }).map((_, i) => (
          <div
            key={i}
            className="border-l border-[var(--border-light)] p-2 text-center first:border-l-0"
          >
            <div className="mx-auto h-4 w-8 rounded bg-[var(--bg-muted)]" />
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="grid flex-1 grid-rows-5">
        {Array.from({ length: weeks }).map((_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-[var(--border-light)]">
            {Array.from({ length: days }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="min-h-[80px] border-l border-[var(--border-light)] p-1 first:border-l-0"
              >
                <div className="mb-1 h-5 w-5 rounded bg-[var(--bg-muted)]" />
                {/* Random event indicators */}
                {Math.random() > 0.5 && (
                  <div className="mb-1 h-4 w-full rounded bg-[var(--bg-muted)]" />
                )}
                {Math.random() > 0.7 && <div className="h-4 w-3/4 rounded bg-[var(--bg-muted)]" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function AgendaSkeleton() {
  const items = 8

  return (
    <div className="flex h-full animate-pulse flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] p-2">
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-24 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-20 rounded bg-[var(--bg-muted)]" />
        </div>
        <div className="h-6 w-32 rounded bg-[var(--bg-muted)]" />
        <div className="flex gap-1">
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
          <div className="h-8 w-16 rounded bg-[var(--bg-muted)]" />
        </div>
      </div>

      {/* Table header */}
      <div className="flex border-b border-[var(--border-light)] bg-[var(--bg-subtle)]">
        <div className="w-32 p-3">
          <div className="h-4 w-16 rounded bg-[var(--bg-muted)]" />
        </div>
        <div className="w-24 p-3">
          <div className="h-4 w-12 rounded bg-[var(--bg-muted)]" />
        </div>
        <div className="flex-1 p-3">
          <div className="h-4 w-20 rounded bg-[var(--bg-muted)]" />
        </div>
      </div>

      {/* Agenda items */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex border-b border-[var(--border-light)]">
            <div className="w-32 p-3">
              <div className="mb-1 h-4 w-20 rounded bg-[var(--bg-muted)]" />
              <div className="h-3 w-16 rounded bg-[var(--bg-muted)]" />
            </div>
            <div className="w-24 p-3">
              <div className="h-4 w-16 rounded bg-[var(--bg-muted)]" />
            </div>
            <div className="flex-1 p-3">
              <div className="mb-1 h-4 w-3/4 rounded bg-[var(--bg-muted)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--bg-muted)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
