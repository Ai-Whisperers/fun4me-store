# Type System Quick Reference

## Import Pattern

```typescript
// Always import from barrel export
import { AuditLog, Notification, DashboardStats } from '@/lib/types'

// NOT like this
import { AuditLog } from '@/lib/types/audit' // ❌
```

## Type Files Overview

| File               | Purpose                          | Key Types                                          |
| ------------------ | -------------------------------- | -------------------------------------------------- |
| `action-result.ts` | Server action responses          | `ActionResult<T>`                                  |
| `appointments.ts`  | Booking system                   | `Appointment`, `BookingFormData`                   |
| `audit.ts`         | Activity logging                 | `AuditLog`, `AuditAction`, `AuditFilter`           |
| `calendar.ts`      | Calendar & scheduling            | `CalendarEvent`, `StaffSchedule`, `TimeOffRequest` |
| `clinic-config.ts` | JSON config (from .content_data) | `ClinicConfig`, `ClinicSettings`                   |
| `database.ts`      | Supabase schema                  | `Database`, table types                            |
| `errors.ts`        | Error handling                   | `AppError`, `ValidationError`                      |
| `index.ts`         | Barrel export                    | Re-exports all types                               |
| `invoicing.ts`     | Billing & payments               | `Invoice`, `Payment`, `Refund`                     |
| `notification.ts`  | Notifications                    | `Notification`, `NotificationType`                 |
| `reports.ts`       | Analytics & BI                   | `DashboardStats`, `RevenueReport`                  |
| `services.ts`      | Service catalog                  | `Service`, `ServiceCategory`                       |
| `settings.ts`      | Operational settings             | `ClinicOperationalSettings`, `AppointmentSettings` |
| `staff.ts`         | Staff management                 | `StaffProfileExtended`, `StaffPerformance`         |
| `status.ts`        | Status enums                     | All status types and transitions                   |
| `store.ts`         | E-commerce                       | `Product`, `Order`, `Cart`                         |
| `whatsapp.ts`      | Messaging                        | `WhatsAppMessage`, `WhatsAppTemplate`              |

## Common Patterns

### Type Guards

```typescript
import { isAuditAction, isNotificationType } from '@/lib/types'

if (isAuditAction(value)) {
  // TypeScript knows value is AuditAction
}
```

### Server Actions

```typescript
import { ActionResult } from '@/lib/types'

export async function updateSettings(
  data: ClinicOperationalSettings
): Promise<ActionResult<ClinicOperationalSettings>> {
  // Implementation
}
```

### API Routes

```typescript
import { NextResponse } from 'next/server'
import { DashboardStats } from '@/lib/types'

export async function GET() {
  const stats: DashboardStats = {
    appointments_today: 12,
    // ...
  }
  return NextResponse.json(stats)
}
```

### Component Props

```typescript
import { Notification } from '@/lib/types'

interface NotificationBellProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
}

export function NotificationBell({ notifications, onMarkAsRead }: NotificationBellProps) {
  // Component
}
```

## Status Transitions

All status types include transition validators:

```typescript
import {
  canTransitionAppointmentStatus,
  canTransitionInvoiceStatus,
  canTransitionPaymentStatus,
} from '@/lib/types'

if (canTransitionAppointmentStatus('pending', 'confirmed')) {
  // Allow transition
}
```

## Constants and Labels

### Spanish Labels

```typescript
import { getNotificationTypeLabel, TIME_OFF_STATUS_LABELS, SHIFT_TYPE_LABELS } from '@/lib/types'

const label = getNotificationTypeLabel('vaccine_due') // "Vacuna pendiente"
const timeOffLabel = TIME_OFF_STATUS_LABELS.approved // "Aprobada"
```

### Day Names

```typescript
import { getDayName, DAY_NAMES } from '@/lib/types'

const dayName = getDayName(1) // "Lunes"
const allDays = DAY_NAMES // Record<DayOfWeek, string>
```

### Event Colors

```typescript
import { EVENT_COLORS } from '@/lib/types'

const color = EVENT_COLORS.confirmed // "#10B981"
```

## Validation Functions

```typescript
import { isValidTimeFormat, validateDayHours } from '@/lib/types'

if (isValidTimeFormat('09:30')) {
  // true
  // Valid time
}

const dayHours = { open: '08:00', close: '18:00' }
if (validateDayHours(dayHours)) {
  // Valid hours
}
```

## Defaults

```typescript
import { DEFAULT_CLINIC_SETTINGS } from '@/lib/types'

const newSettings = {
  ...DEFAULT_CLINIC_SETTINGS,
  general: {
    ...DEFAULT_CLINIC_SETTINGS.general,
    clinic_name: 'Mi Clínica',
  },
}
```

## Type Conflicts Resolved

- **Staff types**: Calendar-related in `calendar.ts`, management in `staff.ts`
- **Settings types**: JSON config in `clinic-config.ts`, operational in `settings.ts`
- **TimeOffType**: Full structure in `calendar.ts`
- **getDayName**: Utility in `calendar.ts`

## Best Practices

1. Always use barrel export (`@/lib/types`)
2. Prefer type guards over `as` casting
3. Use Spanish labels for user-facing text
4. Validate status transitions before mutations
5. Use ActionResult<T> for server actions
6. Include JSDoc comments for complex types

## Related Documentation

- Full schema: `database.ts`
- Usage examples: `USAGE_EXAMPLES.md`
- Type completion: `TYPE_DEFINITIONS_COMPLETE.md`
- Project docs: `documentation/`
