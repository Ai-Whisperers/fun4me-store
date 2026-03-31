'use client'

import type { ResourceHeaderProps as RBCResourceHeaderProps } from 'react-big-calendar'

/**
 * Custom Resource Header Component
 * Displays staff member info in resource view column headers
 */

export interface CalendarResourceData {
  id: string
  title: string
  colorCode?: string
  jobTitle?: string
  avatarUrl?: string | null
}

type ResourceHeaderProps = RBCResourceHeaderProps<CalendarResourceData>

export function ResourceHeader({ resource }: ResourceHeaderProps) {
  const initials = resource.title
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex min-w-[120px] items-center gap-2 px-2 py-1.5">
      {/* Avatar or initials */}
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: resource.colorCode || 'var(--primary, #3b82f6)' }}
      >
        {resource.avatarUrl ? (
          <img
            src={resource.avatarUrl}
            alt={resource.title}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Name and job title */}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-[var(--text-primary)]">
          {resource.title}
        </span>
        {resource.jobTitle && (
          <span className="truncate text-[10px] text-[var(--text-muted)]">{resource.jobTitle}</span>
        )}
      </div>

      {/* Color indicator */}
      <div
        className="ml-auto h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: resource.colorCode || 'var(--primary)' }}
      />
    </div>
  )
}

/**
 * Resource accessor function for react-big-calendar
 * Maps events to their resource (staff member)
 */
export function resourceAccessor(event: { resourceId?: string }): string | undefined {
  return event.resourceId
}

/**
 * Resource ID accessor for react-big-calendar
 */
export function resourceIdAccessor(resource: { id: string }): string {
  return resource.id
}

/**
 * Resource title accessor for react-big-calendar
 */
export function resourceTitleAccessor(resource: { title: string }): string {
  return resource.title
}
