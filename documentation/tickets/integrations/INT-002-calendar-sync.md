# INT-002: External Calendar Synchronization

## Priority: P2
## Category: Integrations
## Status: Not Started
## Epic: [EPIC-15: Integration Expansion](../epics/EPIC-15-integration-expansion.md)

## Description
Implement bi-directional calendar synchronization with Google Calendar and Outlook for staff scheduling and appointment visibility.

## Current State
- Internal appointment calendar exists
- No external calendar sync
- Manual calendar entry by staff
- No iCal export support

## Proposed Solution

### Google Calendar Integration
```typescript
// lib/integrations/google-calendar.ts
import { google } from 'googleapis';

export class GoogleCalendarSync {
  private calendar;

  constructor(credentials: OAuth2Credentials) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    auth.setCredentials(credentials);
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async syncAppointment(appointment: Appointment) {
    const event = {
      summary: `${appointment.petName} - ${appointment.serviceName}`,
      description: `Cliente: ${appointment.clientName}\nMascota: ${appointment.petName}`,
      start: {
        dateTime: appointment.startTime.toISOString(),
        timeZone: 'America/Asuncion',
      },
      end: {
        dateTime: appointment.endTime.toISOString(),
        timeZone: 'America/Asuncion',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    if (appointment.googleEventId) {
      return this.calendar.events.update({
        calendarId: 'primary',
        eventId: appointment.googleEventId,
        requestBody: event,
      });
    }

    return this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
  }

  async deleteEvent(eventId: string) {
    return this.calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }
}
```

### Outlook Calendar Integration
```typescript
// lib/integrations/outlook-calendar.ts
import { Client } from '@microsoft/microsoft-graph-client';

export class OutlookCalendarSync {
  private client: Client;

  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async syncAppointment(appointment: Appointment) {
    const event = {
      subject: `${appointment.petName} - ${appointment.serviceName}`,
      body: {
        contentType: 'HTML',
        content: `<p>Cliente: ${appointment.clientName}</p><p>Mascota: ${appointment.petName}</p>`,
      },
      start: {
        dateTime: appointment.startTime.toISOString(),
        timeZone: 'SA Western Standard Time',
      },
      end: {
        dateTime: appointment.endTime.toISOString(),
        timeZone: 'SA Western Standard Time',
      },
    };

    if (appointment.outlookEventId) {
      return this.client.api(`/me/events/${appointment.outlookEventId}`).patch(event);
    }

    return this.client.api('/me/events').post(event);
  }
}
```

### OAuth Connection Flow
```typescript
// app/api/integrations/google/connect/route.ts
export async function GET(request: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_URL}/api/integrations/google/callback`
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
  });

  return NextResponse.redirect(url);
}

// app/api/integrations/google/callback/route.ts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const userId = await getUserId(request);

  const { tokens } = await oauth2Client.getToken(code);

  await supabase.from('user_integrations').upsert({
    user_id: userId,
    provider: 'google_calendar',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expiry_date!),
  });

  return NextResponse.redirect('/dashboard/settings/integrations');
}
```

### iCal Export
```typescript
// app/api/calendar/ical/route.ts
import ical from 'ical-generator';

export async function GET(request: NextRequest) {
  const { staffId, token } = getParams(request);

  // Verify token
  const valid = await verifyCalendarToken(staffId, token);
  if (!valid) return new Response('Unauthorized', { status: 401 });

  const appointments = await getStaffAppointments(staffId);

  const calendar = ical({ name: 'Citas Veterinaria' });

  for (const apt of appointments) {
    calendar.createEvent({
      start: apt.startTime,
      end: apt.endTime,
      summary: `${apt.petName} - ${apt.serviceName}`,
      description: `Cliente: ${apt.clientName}`,
      location: apt.clinicAddress,
    });
  }

  return new Response(calendar.toString(), {
    headers: {
      'Content-Type': 'text/calendar',
      'Content-Disposition': 'attachment; filename="calendario.ics"',
    },
  });
}
```

## Implementation Steps
1. Set up Google OAuth credentials
2. Implement Google Calendar sync
3. Set up Microsoft Azure app
4. Implement Outlook Calendar sync
5. Create connection management UI
6. Add iCal export endpoint
7. Implement bi-directional sync webhooks

## Acceptance Criteria
- [ ] Google Calendar connected
- [ ] Outlook Calendar connected
- [ ] Appointments sync automatically
- [ ] Cancellations reflected
- [ ] iCal export working
- [ ] Connection management UI

## Related Files
- `lib/integrations/` - Integration providers
- `app/api/integrations/` - OAuth callbacks
- `app/[clinic]/dashboard/settings/` - Settings UI

## Estimated Effort
- 14 hours
  - Google Calendar: 5h
  - Outlook Calendar: 5h
  - iCal export: 2h
  - UI & settings: 2h
