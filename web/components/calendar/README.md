# Calendar Module

Modular calendar component built with `react-big-calendar` for multi-tenant veterinary clinic scheduling.

## Structure

```
calendar/
├── README.md                    # This file
├── index.ts                     # Barrel exports
├── calendar.tsx                 # Main calendar component (117 lines, down from 407)
├── calendar-container.tsx       # Container with filters and modals
├── calendar-view.tsx            # Alternative view component
│
├── CalendarEvent.tsx            # Event rendering component
├── CalendarStyles.tsx           # Global styles
│
├── calendar-constants.ts        # Spanish messages and config
├── calendar-filters.ts          # Event filtering utilities
├── calendar-localizer.ts        # Date-fns localizer setup
├── calendar-styling.ts          # Event styling functions
├── useCalendarState.ts          # State management hook
│
├── event-detail-modal.tsx       # Event detail modal
├── quick-add-modal.tsx          # Quick add appointment modal
├── schedule-editor.tsx          # Staff schedule editor
└── time-off-request-form.tsx    # Time off request form
```

## Refactoring Changes

### Before

- **calendar.tsx**: 407 lines - monolithic component with all logic inline

### After

- **calendar.tsx**: 117 lines - clean orchestrator component
- **7 new modules**: Focused, reusable utilities and components

## Module Responsibilities

### Core Components

#### `calendar.tsx`

Main calendar component orchestrator.

- Imports all necessary modules
- Uses `useCalendarState` hook for state management
- Renders BigCalendar with modular configurations
- **Props**: events, view, date, handlers, filters, etc.

#### `CalendarEvent.tsx`

Renders individual calendar events.

- Displays event title
- Shows pet name and service for appointments
- Handles resource data access

#### `CalendarStyles.tsx`

Global styled-jsx for calendar theming.

- Uses CSS variables for theming
- Responsive styles for mobile
- Customizes react-big-calendar UI

### Utilities

#### `calendar-constants.ts`

Configuration constants and Spanish messages.

- `CALENDAR_MESSAGES`: Spanish UI text
- `STATUS_COLORS`: Event status colors
- `EVENT_TYPE_COLORS`: Event type colors
- `DEFAULT_WORK_HOURS`: 7am - 9pm
- `CALENDAR_CONFIG`: Step, timeslots, week start

#### `calendar-filters.ts`

Event filtering functions.

- `filterByStaff(events, staffIds)`: Filter by staff
- `filterByEventType(events, types)`: Filter by event type
- `applyFilters(events, staffIds, types)`: Apply all filters

#### `calendar-localizer.ts`

Date-fns localizer configuration.

- Spanish locale (es)
- Week starts on Monday
- Exports `calendarLocalizer`

#### `calendar-styling.ts`

Event styling utilities.

- `getEventStyle(event)`: Returns event style object
- Handles staff colors, event types, statuses
- Opacity for blocked events

#### `useCalendarState.ts`

Custom hook for calendar state management.

- Manages view, date state
- Filters events by staff and type
- Memoized handlers and computations
- Returns state and handlers object

## Usage

### Basic Usage

```tsx
import { Calendar } from '@/components/calendar'

function MyCalendar() {
  return <Calendar events={events} view="week" onSelectEvent={(event) => console.log(event)} />
}
```

### With Filters

```tsx
import { Calendar } from '@/components/calendar'

function FilteredCalendar() {
  const [staffFilters, setStaffFilters] = useState<string[]>([])

  return (
    <Calendar
      events={events}
      staffFilters={staffFilters}
      eventTypeFilters={['appointment', 'time_off']}
      onSelectSlot={(slotInfo) => handleQuickAdd(slotInfo)}
      selectable
    />
  )
}
```

### Using Utilities Directly

```tsx
import { applyFilters, getEventStyle } from '@/components/calendar'

// Filter events
const filtered = applyFilters(events, staffIds, eventTypes)

// Get event styling
const style = getEventStyle(event)
```

### Using the Hook

```tsx
import { useCalendarState } from '@/components/calendar'

function CustomCalendar({ events }) {
  const { currentView, filteredEvents, handlers } = useCalendarState({
    events,
    initialView: 'week',
    staffFilters: ['vet-1', 'vet-2'],
  })

  // Use state and handlers in custom component
}
```

## Event Types

```typescript
type CalendarEventType = 'appointment' | 'block' | 'time_off' | 'shift' | 'task'

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: CalendarEventType
  resourceId?: string // Staff ID
  status?: string
  color?: string
  allDay?: boolean
  resource?: CalendarEventResource
}
```

## Theming

The calendar respects CSS variables for theming:

```css
--primary: Main brand color --text-primary: Primary text color --border-color: Border color
  --bg-hover: Hover background --primary-light: Light primary for highlights;
```

## Spanish Localization

All UI text is in Spanish:

- Toolbar buttons: "Hoy", "Anterior", "Siguiente"
- View labels: "Mes", "Semana", "Día", "Agenda"
- Messages: "No hay eventos en este rango."

## Performance

- **Memoized filtering**: `useMemo` for filtered events
- **Callback stability**: `useCallback` for all handlers
- **Lazy computation**: Default work hours computed once
- **Tree-shakeable**: Import only what you need

## Testing

Run tests for calendar utilities:

```bash
npm run test:unit -- calendar
```

## Migration Guide

If you have code importing from the old monolithic `calendar.tsx`:

```tsx
// Old
import { Calendar } from '@/components/calendar/calendar'

// New (same, but smaller file!)
import { Calendar } from '@/components/calendar/calendar'

// Or use barrel export
import { Calendar } from '@/components/calendar'
```

To use new utilities:

```tsx
// Import specific utilities
import { applyFilters, getEventStyle } from '@/components/calendar'

// Or import from specific modules
import { applyFilters } from '@/components/calendar/calendar-filters'
```

## Benefits of Refactoring

1. **Smaller files**: Easier to understand and maintain
2. **Focused modules**: Single responsibility principle
3. **Reusable utilities**: Use filters, styling, etc. independently
4. **Better testing**: Test each module in isolation
5. **Tree-shaking**: Import only what you need
6. **Type safety**: Better TypeScript inference
7. **Developer experience**: Clear module boundaries

## Future Enhancements

Potential additions:

- `CalendarToolbar.tsx`: Custom toolbar component
- `CalendarLegend.tsx`: Event type legend
- `useCalendarDragDrop.ts`: Drag and drop functionality
- `calendar-export.ts`: Export to iCal/Google Calendar
- `calendar-print.ts`: Print-friendly formatting
