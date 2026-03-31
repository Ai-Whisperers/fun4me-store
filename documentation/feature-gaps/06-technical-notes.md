# Technical Implementation Notes

This document provides technical guidance for implementing missing features, including code patterns, recommended libraries, and integration approaches.

---

## 1. Project Architecture Summary

### Technology Stack
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.x |
| Database | Supabase (PostgreSQL) | Latest |
| Auth | Supabase Auth | Latest |
| Storage | Supabase Storage | Latest |
| Charts | Recharts | 3.x |
| PDF | @react-pdf/renderer | 4.x |

### Directory Structure
```
web/
├── app/
│   ├── [clinic]/           # Multi-tenant routes
│   │   ├── page.tsx        # Public homepage
│   │   ├── portal/         # Authenticated client area
│   │   ├── dashboard/      # Staff area
│   │   └── tools/          # Public tools
│   ├── api/                # API routes
│   ├── actions/            # Server actions
│   └── auth/               # Auth routes
├── components/             # React components
├── lib/                    # Utilities
│   ├── supabase/           # DB clients
│   └── types/              # TypeScript types
├── db/                     # SQL migrations
└── supabase/               # Edge Functions
```

---

## 2. Code Patterns

### Server Actions Pattern
```typescript
// web/app/actions/example.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({
  field: z.string().min(1),
})

export async function exampleAction(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // 2. Parse & Validate
  const validated = schema.safeParse({
    field: formData.get('field'),
  })
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  // 3. Database Operation
  const { error } = await supabase.from('table').insert({...})
  if (error) {
    return { error: 'Error al guardar' }
  }

  // 4. Revalidate & Return
  revalidatePath('/path')
  return { success: true }
}
```

### API Route Pattern
```typescript
// web/app/api/resource/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get profile for tenant/role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Query with RLS
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('tenant_id', profile.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

### Client Component Pattern
```typescript
// web/components/example/my-component.tsx
"use client";

import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface Props {
  clinic: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function MyComponent({ clinic }: Props) {
  const { data, error, isLoading } = useSWR(
    `/api/resource?clinic=${clinic}`,
    fetcher
  );

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;
  }

  if (error) {
    return <div className="text-red-500">Error loading data</div>;
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      {/* Component content */}
    </div>
  );
}
```

---

## 3. Common Implementations

### Password Reset Implementation

```typescript
// web/app/[clinic]/portal/forgot-password/page.tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function ForgotPasswordPage({ params }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${params.clinic}/portal/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="text-center p-8">
        <h1>Revisa tu email</h1>
        <p>Te enviamos un link para restablecer tu contraseña.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Restablecer Contraseña</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="w-full p-3 border rounded-lg mb-4"
        required
      />
      <button
        type="submit"
        className="w-full bg-purple-600 text-white p-3 rounded-lg"
      >
        Enviar Link
      </button>
    </form>
  )
}
```

### Real-Time Availability API

```typescript
// web/app/api/booking/availability/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')
  const date = searchParams.get('date') // YYYY-MM-DD
  const serviceId = searchParams.get('service')

  if (!clinic || !date) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get clinic business hours
  const { data: tenant } = await supabase
    .from('tenants')
    .select('config')
    .eq('id', clinic)
    .single()

  const businessHours = tenant?.config?.business_hours || {
    start: '09:00',
    end: '18:00',
    break_start: '12:00',
    break_end: '14:00'
  }

  // Get booked appointments for that day
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('tenant_id', clinic)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .neq('status', 'cancelled')

  // Generate available slots (30-min intervals)
  const slots = generateTimeSlots(businessHours, 30)
  
  // Filter out booked slots
  const bookedTimes = appointments?.map(a => 
    new Date(a.start_time).toTimeString().substring(0, 5)
  ) || []

  const availableSlots = slots.filter(slot => !bookedTimes.includes(slot))

  return NextResponse.json({ slots: availableSlots })
}

function generateTimeSlots(hours: any, interval: number): string[] {
  const slots: string[] = []
  const start = parseTime(hours.start)
  const end = parseTime(hours.end)
  const breakStart = parseTime(hours.break_start)
  const breakEnd = parseTime(hours.break_end)

  let current = start
  while (current < end) {
    // Skip break time
    if (current < breakStart || current >= breakEnd) {
      slots.push(formatTime(current))
    }
    current += interval
  }

  return slots
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
```

### Chat/Messaging Component

```typescript
// web/components/messaging/chat-window.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: 'client' | 'staff';
  created_at: string;
  sender?: { full_name: string; avatar_url?: string };
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  isStaff: boolean;
}

export function ChatWindow({ conversationId, currentUserId, isStaff }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`/api/conversations/${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    };
    fetchMessages();
  }, [conversationId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl shadow-sm">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] rounded-lg p-3 ${
              msg.sender_id === currentUserId
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              <p className="text-sm">{msg.content}</p>
              <span className="text-xs opacity-60">
                {new Date(msg.created_at).toLocaleTimeString('es-PY', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Recommended Libraries

### Calendar View
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

### Command Palette (Global Search)
```bash
npm install cmdk
```

### Form Validation
```bash
npm install zod react-hook-form @hookform/resolvers
```

### Data Fetching
```bash
npm install swr
# or
npm install @tanstack/react-query
```

### Stripe Payments
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
```

### Rich Text Editor (for notes)
```bash
npm install @tiptap/react @tiptap/starter-kit
```

### Date Handling
```bash
npm install date-fns
```

---

## 5. Environment Variables

Required for full functionality:

```env
# Supabase (exists)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Stripe (add)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Notifications (for Edge Functions)
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Optional
SENTRY_DSN=https://...
```

---

## 6. Database Considerations

### Adding New Columns
Always use nullable or default values for new columns on existing tables:

```sql
ALTER TABLE pets ADD COLUMN IF NOT EXISTS 
  insurance_policy_id UUID REFERENCES pet_insurance_policies(id);
```

### Index Recommendations
For common queries, ensure indexes exist:

```sql
-- Appointments by date
CREATE INDEX IF NOT EXISTS idx_appointments_date 
  ON appointments(tenant_id, start_time);

-- Messages by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(conversation_id, created_at);

-- Invoices by status
CREATE INDEX IF NOT EXISTS idx_invoices_status 
  ON invoices(tenant_id, status);
```

### RLS Policy Template
```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Staff can see all for their tenant
CREATE POLICY "Staff can view all"
  ON new_table FOR SELECT
  TO authenticated
  USING (is_staff_of(tenant_id));

-- Staff can insert for their tenant
CREATE POLICY "Staff can insert"
  ON new_table FOR INSERT
  TO authenticated
  WITH CHECK (is_staff_of(tenant_id));

-- Owners can see their own
CREATE POLICY "Owners can view own"
  ON new_table FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());
```

---

## 7. Testing Approach

### Unit Tests (Vitest)
```typescript
// web/tests/utils/example.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats Paraguayan Guaraní', () => {
    expect(formatCurrency(150000)).toBe('Gs. 150.000');
  });
});
```

### Integration Tests
```typescript
// web/tests/api/invoices.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('Invoices API', () => {
  it('requires authentication', async () => {
    const res = await fetch('http://localhost:3000/api/invoices');
    expect(res.status).toBe(401);
  });
});
```

### E2E Tests (Playwright)
```typescript
// web/e2e/booking.spec.ts
import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  await page.goto('/adris/book');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  // ...continue flow
  await expect(page.getByText('Cita confirmada')).toBeVisible();
});
```

---

## 8. Performance Tips

1. **Use Materialized Views** for dashboard stats (already implemented)

2. **Implement pagination** on list views:
```typescript
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get('page') || '1');
const limit = 20;
const offset = (page - 1) * limit;

const { data, count } = await supabase
  .from('table')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1);
```

3. **Use SWR/React Query** for client-side caching

4. **Optimize images** with Supabase Transformations:
```typescript
const imageUrl = supabase.storage
  .from('pets')
  .getPublicUrl(path, {
    transform: { width: 200, height: 200, resize: 'cover' }
  });
```

5. **Lazy load** heavy components:
```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(
  () => import('@/components/charts/HeavyChart'),
  { ssr: false, loading: () => <Skeleton /> }
);
```
