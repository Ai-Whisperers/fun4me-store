# FEAT-011: WhatsApp Analytics Dashboard

## Priority: P2 - Medium
## Category: Feature
## Status: ✅ Complete
## Epic: [EPIC-09: New Capabilities](../epics/EPIC-09-new-capabilities.md)
## Affected Areas: WhatsApp Dashboard, Analytics, API
## Completion Date: January 2026

## Description

Add real-time analytics to the WhatsApp dashboard showing message statistics, delivery rates, and trends.

## Source

Derived from `documentation/feature-gaps/INCOMPLETE_FEATURES_ANALYSIS.md` (TICKET-004)

## Context

> **UI shows**: "Enviados Hoy: -" and "Fallidos: -" (hardcoded dashes)
> **Database**: `whatsapp_messages` table exists with status tracking
> **Missing**: Aggregation queries for stats

## Current State

- WhatsApp integration is functional for sending/receiving
- `whatsapp_messages` table tracks all messages with status
- Dashboard shows placeholder "-" values for statistics
- No aggregation or visualization of message data

## Proposed Solution

### 1. Stats API Endpoint

```typescript
// api/whatsapp/stats/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // Auth check...

  const today = new Date().toISOString().split('T')[0];

  // Get today's stats
  const { data: todayStats } = await supabase
    .from('whatsapp_messages')
    .select('status')
    .eq('tenant_id', profile.tenant_id)
    .gte('created_at', today)
    .then(groupByStatus);

  // Get weekly trend
  const { data: weeklyTrend } = await supabase
    .rpc('whatsapp_weekly_stats', { tenant: profile.tenant_id });

  return NextResponse.json({
    today: {
      sent: todayStats.sent || 0,
      delivered: todayStats.delivered || 0,
      failed: todayStats.failed || 0,
    },
    deliveryRate: calculateRate(todayStats),
    weeklyTrend,
  });
}
```

### 2. Dashboard UI Update

```typescript
// dashboard/whatsapp/page.tsx
const { data: stats } = useQuery({
  queryKey: ['whatsapp-stats'],
  queryFn: () => fetch('/api/whatsapp/stats').then(r => r.json()),
});

return (
  <div className="grid grid-cols-4 gap-4">
    <StatCard title="Enviados Hoy" value={stats?.today.sent} />
    <StatCard title="Entregados" value={stats?.today.delivered} />
    <StatCard title="Fallidos" value={stats?.today.failed} color="red" />
    <StatCard title="Tasa de Entrega" value={`${stats?.deliveryRate}%`} />
  </div>
);
```

### 3. Weekly Trend Chart

Use `recharts` (already installed) for visualization:

```typescript
<LineChart data={stats?.weeklyTrend}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line type="monotone" dataKey="sent" stroke="var(--primary)" />
  <Line type="monotone" dataKey="delivered" stroke="green" />
</LineChart>
```

## Implementation Steps

1. [x] Stats API endpoint already existed (getWhatsAppStats action)
2. [x] Add weekly trend data function (getWhatsAppWeeklyTrend)
3. [x] Dashboard shows real values (not hardcoded)
4. [x] Add weekly trend line chart component
5. [x] Add delivery rate and weekly total stat cards
6. [ ] Add retry mechanism for failed messages (future enhancement)
7. [ ] Implement real-time updates (optional, future)

## Acceptance Criteria

- [x] Dashboard shows real sent count for today
- [x] Failed messages count displayed
- [x] Weekly chart of message volume visible
- [x] Delivery success rate percentage calculated
- [x] Stats refresh on page reload
- [x] Data scoped to tenant correctly

## Implementation Notes

### Files Modified:
- `app/actions/whatsapp.ts` - Added `WhatsAppDailyStats` type and `getWhatsAppWeeklyTrend` function
- `app/[clinic]/dashboard/whatsapp/page.tsx` - Enhanced stats display and added trend chart
- `components/whatsapp/weekly-trend-chart.tsx` - New chart component using recharts

### Stats Displayed (6 cards):
1. **Conversaciones** - Total active conversations
2. **Sin Leer** - Unread message count
3. **Enviados Hoy** - Messages sent today
4. **Fallidos** - Failed messages today (red if > 0)
5. **Tasa Entrega** - Delivery rate percentage (amber if < 90%)
6. **Esta Semana** - Total messages this week

### Weekly Trend Chart:
- Shows last 7 days of data
- Three lines: Sent (primary), Delivered (green), Failed (red)
- Uses recharts LineChart with responsive container
- Empty state message when no data

## Related Files

- `web/app/[clinic]/dashboard/whatsapp/page.tsx:93-100` - Shows "-" placeholders
- `web/app/api/whatsapp/route.ts` - Existing WhatsApp API
- `web/lib/whatsapp/client.ts` - WhatsApp client

## Estimated Effort

- Stats API: 2 hours
- Dashboard UI: 2 hours
- Chart component: 2 hours
- Testing: 2 hours
- **Total: 8 hours (1 day)**

---
*Created: January 2026*
*Derived from INCOMPLETE_FEATURES_ANALYSIS.md*
