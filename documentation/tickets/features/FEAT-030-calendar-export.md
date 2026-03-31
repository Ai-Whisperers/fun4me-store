# FEAT-030 Calendar Export (iCal/Google Calendar)

## Priority: P3

## Category: Feature

## Status: Not Started

## Epic: [EPIC-15: Integration Expansion](../epics/EPIC-15-integration-expansion.md)

## Description

After booking confirmation, customers have no way to add the appointment to their personal calendar. This leads to missed appointments and customer frustration. Adding "Add to Calendar" functionality improves appointment attendance.

### Current State

- Booking confirmation shows success message
- Email notification sent (if configured)
- No calendar file download
- No Google/Apple Calendar integration
- Customers manually add to their calendars

### Industry Standard

Most booking systems provide:
- iCal (.ics) file download
- "Add to Google Calendar" button
- "Add to Apple Calendar" button
- "Add to Outlook" button

## Proposed Solution

### iCal File Generation

```typescript
// web/lib/calendar/ical.ts
import { createEvent, DateArray } from 'ics'

interface AppointmentForCalendar {
  id: string
  title: string
  startTime: Date
  endTime: Date
  location: string
  description: string
  clinicName: string
  clinicPhone: string
}

export function generateICalEvent(appointment: AppointmentForCalendar): string {
  const start: DateArray = [
    appointment.startTime.getFullYear(),
    appointment.startTime.getMonth() + 1,
    appointment.startTime.getDate(),
    appointment.startTime.getHours(),
    appointment.startTime.getMinutes()
  ]

  const end: DateArray = [
    appointment.endTime.getFullYear(),
    appointment.endTime.getMonth() + 1,
    appointment.endTime.getDate(),
    appointment.endTime.getHours(),
    appointment.endTime.getMinutes()
  ]

  const { value } = createEvent({
    uid: appointment.id,
    start,
    end,
    title: appointment.title,
    description: appointment.description,
    location: appointment.location,
    organizer: {
      name: appointment.clinicName,
      email: 'noreply@vete.com'
    },
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    alarms: [
      { action: 'display', trigger: { hours: 24, before: true } },  // 24h before
      { action: 'display', trigger: { hours: 1, before: true } }    // 1h before
    ]
  })

  return value || ''
}
```

### Google Calendar URL

```typescript
// web/lib/calendar/google.ts
export function generateGoogleCalendarUrl(appointment: AppointmentForCalendar): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: appointment.title,
    dates: `${formatGoogleDate(appointment.startTime)}/${formatGoogleDate(appointment.endTime)}`,
    details: appointment.description,
    location: appointment.location,
    ctz: 'America/Asuncion'
  })

  return `https://calendar.google.com/calendar/render?${params}`
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}
```

### Add to Calendar Component

```typescript
// web/components/calendar/add-to-calendar.tsx
export function AddToCalendar({ appointment }: { appointment: AppointmentForCalendar }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDownloadIcs = () => {
    const icsContent = generateICalEvent(appointment)
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cita-${appointment.id}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const googleUrl = generateGoogleCalendarUrl(appointment)
  const outlookUrl = generateOutlookUrl(appointment)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
      >
        <CalendarPlus className="h-4 w-4" />
        Agregar al Calendario
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 bg-white shadow-lg rounded-lg p-2 z-10">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded"
          >
            <GoogleIcon className="h-4 w-4" />
            Google Calendar
          </a>

          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded"
          >
            <OutlookIcon className="h-4 w-4" />
            Outlook
          </a>

          <button
            onClick={handleDownloadIcs}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded w-full"
          >
            <AppleIcon className="h-4 w-4" />
            Apple Calendar / Otro
          </button>
        </div>
      )}
    </div>
  )
}
```

### Integration Points

1. **Booking Success Screen**: Add button after confirmation
2. **Email Confirmation**: Attach .ics file
3. **Portal Appointments**: Add button on each scheduled appointment
4. **Dashboard**: Staff can send calendar invite to customer

## Implementation Steps

1. [ ] Install `ics` package for iCal generation
2. [ ] Create calendar utility functions
3. [ ] Build AddToCalendar dropdown component
4. [ ] Add to booking success screen
5. [ ] Add to portal appointment cards
6. [ ] Attach .ics to confirmation emails
7. [ ] Test with Google, Apple, Outlook calendars

## Acceptance Criteria

- [ ] "Add to Calendar" dropdown on booking success
- [ ] Google Calendar link opens pre-filled event
- [ ] iCal download works on mobile and desktop
- [ ] Calendar event includes:
  - Appointment title with pet name
  - Start and end time
  - Clinic location
  - Clinic phone number
  - Reminder alarms (24h and 1h before)
- [ ] Email includes .ics attachment
- [ ] Works in Spanish timezone (America/Asuncion)

## Related Files

- `web/lib/calendar/ical.ts` (create)
- `web/lib/calendar/google.ts` (create)
- `web/components/calendar/add-to-calendar.tsx` (create)
- `web/components/booking/booking-wizard/SuccessScreen.tsx`
- `web/lib/email/templates/booking-confirmation.ts`

## Estimated Effort

6-8 hours

## Dependencies

- `ics` npm package for iCal generation

## Testing Notes

1. Test iCal download on:
   - Chrome (should download file)
   - Safari (should open in Calendar app)
   - Mobile Safari (should prompt to add)
2. Test Google Calendar link in:
   - Desktop browser
   - Mobile browser (should open Google Calendar app if installed)
3. Verify timezone handling (Paraguay is UTC-4/UTC-3)
