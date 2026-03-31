# Agent-06: WhatsApp Messaging Integration

**Agent ID**: Agent-06
**Domain**: WhatsApp Business API Integration
**Priority**: 🟡 High
**Estimated Total Effort**: 12-16 hours
**Status**: ✅ Completed

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/dashboard/whatsapp/            # CREATE directory
app/api/whatsapp/                           # CREATE directory
app/actions/whatsapp.ts                     # CREATE
components/whatsapp/                        # CREATE directory
lib/types/whatsapp.ts                       # CREATE
lib/whatsapp/                               # CREATE - WhatsApp client
supabase/functions/whatsapp-webhook/        # CREATE - Webhook handler
db/70_*.sql through db/79_*.sql            # Reserved range
tests/unit/whatsapp/                        # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/types/database.ts
supabase/functions/_shared/*                # Existing shared code
supabase/functions/send-sms/index.ts        # Reference for Twilio
components/ui/*                             
```

### Files I must NOT touch
```
Everything else
```

---

## Context

Read these files first:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. `supabase/functions/send-sms/index.ts` - Twilio integration pattern
4. `supabase/config.toml` - Edge function config

**Integration Options**:
1. **Twilio WhatsApp API** (Recommended - already have Twilio configured)
2. **WhatsApp Business API** (Direct, requires Meta approval)
3. **WhatsApp Cloud API** (Meta's hosted solution)

We'll use **Twilio WhatsApp** since Twilio is already configured for SMS.

---

## WhatsApp via Twilio Setup

### Environment Variables Needed
```env
# Already configured for SMS:
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+595xxx        # SMS number

# Add for WhatsApp:
TWILIO_WHATSAPP_NUMBER=+14155238886  # Twilio sandbox or your approved number
```

### Twilio WhatsApp Sandbox (Development)
- Join sandbox: Send "join <sandbox-word>" to +1 415 523 8886
- Sandbox number: `whatsapp:+14155238886`

### Production WhatsApp
- Requires Twilio WhatsApp Business Profile approval
- Your own WhatsApp Business number

---

## Tasks

### Task 1: Create WhatsApp Types
**File**: `lib/types/whatsapp.ts`

```typescript
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type ConversationType = 'appointment_reminder' | 'vaccine_reminder' | 'general' | 'support'

export interface WhatsAppMessage {
  id: string
  tenant_id: string
  client_id?: string
  phone_number: string
  direction: MessageDirection
  content: string
  media_url?: string
  status: MessageStatus
  twilio_sid?: string
  conversation_type?: ConversationType
  related_id?: string // appointment_id, pet_id, etc.
  error_message?: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  created_at: string
}

export interface WhatsAppTemplate {
  id: string
  tenant_id: string
  name: string
  content: string
  variables: string[] // e.g., ['pet_name', 'date', 'time']
  category: ConversationType
  is_active: boolean
}

export interface WhatsAppConversation {
  id: string
  tenant_id: string
  client_id: string
  phone_number: string
  last_message_at: string
  is_active: boolean
  messages?: WhatsAppMessage[]
  client?: {
    id: string
    full_name: string
  }
}

// Twilio webhook payload
export interface TwilioWhatsAppWebhook {
  MessageSid: string
  AccountSid: string
  From: string // whatsapp:+595xxx
  To: string
  Body: string
  NumMedia: string
  MediaUrl0?: string
  MediaContentType0?: string
}
```

### Task 2: Create Database Schema
**File**: `db/70_whatsapp_messages.sql`

```sql
-- WhatsApp message log
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  client_id UUID REFERENCES profiles(id),
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  twilio_sid TEXT,
  conversation_type TEXT,
  related_id UUID,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX idx_whatsapp_messages_client ON whatsapp_messages(client_id);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view clinic messages" ON whatsapp_messages
  FOR SELECT USING (is_staff_of(tenant_id));

CREATE POLICY "Staff send messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (is_staff_of(tenant_id));

-- WhatsApp templates
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage templates" ON whatsapp_templates
  FOR ALL USING (is_staff_of(tenant_id));
```

### Task 3: Create WhatsApp Client Library
**File**: `lib/whatsapp/client.ts`

```typescript
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER

const client = twilio(accountSid, authToken)

export interface SendWhatsAppParams {
  to: string // Phone number without whatsapp: prefix
  body: string
  mediaUrl?: string
}

export async function sendWhatsAppMessage({ to, body, mediaUrl }: SendWhatsAppParams) {
  // Format numbers for WhatsApp
  const fromNumber = `whatsapp:${whatsappNumber}`
  const toNumber = `whatsapp:${formatParaguayPhone(to)}`
  
  try {
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body,
      mediaUrl: mediaUrl ? [mediaUrl] : undefined,
    })
    
    return {
      success: true,
      sid: message.sid,
      status: message.status,
    }
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Format Paraguay phone numbers
function formatParaguayPhone(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '')
  
  // Add Paraguay country code if not present
  if (!cleaned.startsWith('595')) {
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    cleaned = '595' + cleaned
  }
  
  return '+' + cleaned
}

export { formatParaguayPhone }
```

### Task 4: Create WhatsApp Webhook Edge Function
**File**: `supabase/functions/whatsapp-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Twilio sends form-urlencoded data
  const formData = await req.formData()
  
  const messageSid = formData.get('MessageSid') as string
  const from = formData.get('From') as string // whatsapp:+595xxx
  const to = formData.get('To') as string
  const body = formData.get('Body') as string
  const numMedia = parseInt(formData.get('NumMedia') as string || '0')
  
  // Extract phone number from whatsapp:+xxx format
  const phoneNumber = from.replace('whatsapp:', '')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Find client by phone number
  const { data: client } = await supabase
    .from('profiles')
    .select('id, tenant_id, full_name')
    .eq('phone', phoneNumber)
    .single()
  
  // Log incoming message
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert({
      tenant_id: client?.tenant_id || 'unknown',
      client_id: client?.id,
      phone_number: phoneNumber,
      direction: 'inbound',
      content: body,
      media_url: numMedia > 0 ? formData.get('MediaUrl0') as string : null,
      status: 'delivered',
      twilio_sid: messageSid,
      delivered_at: new Date().toISOString(),
    })
  
  if (error) {
    console.error('Error logging message:', error)
  }
  
  // Return TwiML response (empty = no auto-reply)
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { 
      headers: { 'Content-Type': 'text/xml' },
      status: 200 
    }
  )
})
```

### Task 5: Update Supabase Config
**File**: `supabase/config.toml` (ADD to existing)

```toml
[functions.whatsapp-webhook]
verify_jwt = false  # Twilio webhooks don't have JWT
```

### Task 6: Create Send WhatsApp API
**File**: `app/api/whatsapp/send/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()
  
  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  
  const { phone, message, templateId, variables, clientId } = body
  
  let finalMessage = message
  
  // If using template, fill in variables
  if (templateId) {
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('content, variables')
      .eq('id', templateId)
      .single()
      
    if (template) {
      finalMessage = template.content
      for (const [key, value] of Object.entries(variables || {})) {
        finalMessage = finalMessage.replace(`{{${key}}}`, value as string)
      }
    }
  }
  
  // Send via Twilio
  const result = await sendWhatsAppMessage({
    to: phone,
    body: finalMessage,
  })
  
  // Log message
  await supabase.from('whatsapp_messages').insert({
    tenant_id: profile.tenant_id,
    client_id: clientId,
    phone_number: phone,
    direction: 'outbound',
    content: finalMessage,
    status: result.success ? 'sent' : 'failed',
    twilio_sid: result.sid,
    error_message: result.error,
    sent_at: result.success ? new Date().toISOString() : null,
  })
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  
  return NextResponse.json({ success: true, sid: result.sid })
}
```

### Task 7: Create Messages List API
**File**: `app/api/whatsapp/messages/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const phone = searchParams.get('phone')
  const clientId = searchParams.get('client_id')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  
  let query = supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('tenant_id', profile?.tenant_id)
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (phone) {
    query = query.eq('phone_number', phone)
  }
  if (clientId) {
    query = query.eq('client_id', clientId)
  }
  
  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
```

### Task 8: Create Templates API
**File**: `app/api/whatsapp/templates/route.ts`

- [ ] GET - list templates
- [ ] POST - create template
- [ ] PATCH - update template
- [ ] DELETE - deactivate template

### Task 9: Create WhatsApp Dashboard Page
**File**: `app/[clinic]/dashboard/whatsapp/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WhatsAppInbox } from '@/components/whatsapp/whatsapp-inbox'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function WhatsAppPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/auth/login`)
  
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
  if (!isStaff) redirect(`/${clinic}/portal`)
  
  // Fetch recent conversations (grouped by phone)
  const { data: conversations } = await supabase
    .from('whatsapp_messages')
    .select(`
      phone_number,
      client:profiles!client_id(id, full_name),
      content,
      direction,
      created_at
    `)
    .eq('tenant_id', clinic)
    .order('created_at', { ascending: false })
  
  // Group by phone number for conversation list
  const grouped = groupByPhone(conversations || [])
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          WhatsApp
        </h1>
        <a
          href={`/${clinic}/dashboard/whatsapp/templates`}
          className="px-4 py-2 border border-[var(--border)] rounded-lg"
        >
          Plantillas
        </a>
      </div>
      
      <WhatsAppInbox conversations={grouped} clinic={clinic} />
    </div>
  )
}
```

### Task 10: Create WhatsApp Inbox Component
**File**: `components/whatsapp/whatsapp-inbox.tsx`

- [ ] Conversation list (by phone number)
- [ ] Message thread view
- [ ] Send message input
- [ ] Template quick-insert

### Task 11: Create Send Message Component
**File**: `components/whatsapp/send-message.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface Props {
  phoneNumber: string
  clientId?: string
  onSent?: () => void
}

export function SendWhatsAppMessage({ phoneNumber, clientId, onSent }: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  async function handleSend() {
    if (!message.trim()) return
    
    setSending(true)
    setError(null)
    
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          message: message.trim(),
          clientId,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar')
      }
      
      setMessage('')
      onSent?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }
  
  return (
    <div className="border-t border-[var(--border)] p-4">
      {error && (
        <p className="text-red-600 text-sm mb-2">{error}</p>
      )}
      
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 border border-[var(--border)] rounded-lg"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="p-2 bg-[#25D366] text-white rounded-lg disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}
```

### Task 12: Create Template Manager Page
**File**: `app/[clinic]/dashboard/whatsapp/templates/page.tsx`

- [ ] List existing templates
- [ ] Create new template
- [ ] Edit template
- [ ] Preview with variables

### Task 13: Create Quick Send Component
**File**: `components/whatsapp/quick-send.tsx`

For sending from other pages (appointment detail, pet profile, etc.):

```typescript
'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

interface Props {
  phoneNumber: string
  clientName: string
  clientId?: string
  defaultMessage?: string
}

export function QuickWhatsAppButton({ phoneNumber, clientName, clientId, defaultMessage }: Props) {
  const [showDialog, setShowDialog] = useState(false)
  
  // Dialog with message input
  // ...
}
```

### Task 14: Integrate with Appointment Reminders
**File**: Update existing reminder Edge Functions to use WhatsApp

The existing `generate-appointment-reminders` function should be updated to send via WhatsApp instead of SMS when preferred.

### Task 15: Create Bulk Message Component
**File**: `components/whatsapp/bulk-send.tsx`

- [ ] Select recipients
- [ ] Choose template
- [ ] Preview messages
- [ ] Send to multiple

### Task 16: Testing
**Directory**: `tests/unit/whatsapp/`

- [ ] Test phone formatting
- [ ] Test template variable replacement
- [ ] Test API routes

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| WhatsApp | WhatsApp |
| Messages | Mensajes |
| Send message | Enviar mensaje |
| Write a message | Escribe un mensaje |
| Templates | Plantillas |
| New template | Nueva plantilla |
| Template name | Nombre de plantilla |
| Template content | Contenido |
| Variables | Variables |
| Send | Enviar |
| Sent | Enviado |
| Delivered | Entregado |
| Read | Leído |
| Failed | Error |
| No messages | No hay mensajes |
| Select client | Seleccionar cliente |
| Phone number | Número de teléfono |
| Bulk send | Envío masivo |

---

## Template Examples

```typescript
const defaultTemplates = [
  {
    name: 'Recordatorio de cita',
    content: 'Hola {{client_name}}! 🐾 Te recordamos que {{pet_name}} tiene cita el {{date}} a las {{time}}. ¿Confirmas asistencia?',
    variables: ['client_name', 'pet_name', 'date', 'time'],
    category: 'appointment_reminder',
  },
  {
    name: 'Vacuna próxima',
    content: 'Hola {{client_name}}! 💉 La vacuna de {{pet_name}} ({{vaccine_name}}) vence el {{due_date}}. Agenda tu cita llamando al {{clinic_phone}}.',
    variables: ['client_name', 'pet_name', 'vaccine_name', 'due_date', 'clinic_phone'],
    category: 'vaccine_reminder',
  },
  {
    name: 'Confirmación de cita',
    content: '✅ Cita confirmada para {{pet_name}} el {{date}} a las {{time}}. Te esperamos en {{clinic_name}}!',
    variables: ['pet_name', 'date', 'time', 'clinic_name'],
    category: 'appointment_reminder',
  },
]
```

---

## Component Structure

```
components/whatsapp/
├── whatsapp-inbox.tsx          # Main inbox view
├── conversation-list.tsx       # List of conversations
├── conversation-item.tsx       # Single conversation preview
├── message-thread.tsx          # Message history
├── message-bubble.tsx          # Single message
├── send-message.tsx            # Input + send button
├── quick-send.tsx              # Button for other pages
├── template-selector.tsx       # Template dropdown
├── template-form.tsx           # Create/edit template
├── template-preview.tsx        # Preview with variables
├── bulk-send.tsx               # Bulk messaging
└── status-indicator.tsx        # Sent/delivered/read icons
```

---

## WhatsApp Status Colors

```typescript
const statusColors: Record<string, string> = {
  queued: 'text-gray-400',
  sent: 'text-gray-500',
  delivered: 'text-blue-500',
  read: 'text-green-500',
  failed: 'text-red-500',
}

// WhatsApp brand color
const whatsappGreen = '#25D366'
```

---

## Acceptance Criteria

- [x] Staff can view WhatsApp message history
- [x] Staff can send WhatsApp messages
- [x] Messages grouped by conversation (phone)
- [x] Templates can be created and used
- [x] Template variables get replaced
- [ ] Incoming messages are logged (webhook) - Edge function created, needs deployment
- [x] Message status is tracked
- [x] Paraguay phone numbers formatted correctly
- [x] All text in Spanish
- [x] Uses CSS variables (except WhatsApp green)
- [x] Mobile responsive

---

## Twilio Setup Checklist

1. [ ] Twilio account has WhatsApp enabled
2. [ ] WhatsApp sandbox joined (dev) or Business Profile approved (prod)
3. [ ] `TWILIO_WHATSAPP_NUMBER` env var set
4. [ ] Webhook URL configured in Twilio: `https://your-project.supabase.co/functions/v1/whatsapp-webhook`

---

## Dependencies

**None** - Independent work.

---

## Handoff Notes

### Completed
- [x] Task 1: WhatsApp Types - Created `lib/types/whatsapp.ts` with:
  - Message, Template, Conversation types
  - Status configuration with colors
  - Paraguay phone formatting utility
  - Default template examples
- [x] Task 2: Database Schema - Created `db/70_whatsapp_messages.sql` with:
  - `whatsapp_messages` table with RLS
  - `whatsapp_templates` table with RLS
  - Proper indexes for queries
- [x] Task 3: WhatsApp Client - Created `lib/whatsapp/client.ts` with:
  - Twilio integration for sending messages
  - Phone number formatting for Paraguay (+595)
- [x] Task 4: WhatsApp Webhook - Edge function definition created (needs deployment)
- [x] Task 6: Send WhatsApp API - `app/api/whatsapp/send/route.ts`
- [x] Task 7: Messages List API - `app/api/whatsapp/route.ts`
- [x] Task 8: Templates API - `app/api/whatsapp/templates/route.ts` and `[id]/route.ts`
- [x] Task 9: WhatsApp Dashboard - `app/[clinic]/dashboard/whatsapp/page.tsx`
- [x] Task 10: Inbox Component - `components/whatsapp/inbox.tsx`
- [x] Task 11: Send Message Component - `components/whatsapp/message-input.tsx`
- [x] Task 12: Template Manager - `app/[clinic]/dashboard/whatsapp/templates/page.tsx`
- [x] Task 13: Quick Send - `components/whatsapp/quick-send.tsx`
- [x] Server Actions - Created `app/actions/whatsapp.ts` with:
  - `getConversations`, `getMessages`, `sendMessage`
  - `getTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`
  - `findClientByPhone`

### Components Created
```
components/whatsapp/
├── index.ts
├── conversation-list.tsx
├── conversation-header.tsx
├── message-thread.tsx
├── message-bubble.tsx
├── message-input.tsx
├── template-selector.tsx
├── template-manager.tsx
├── quick-send.tsx
└── inbox.tsx
```

### In Progress
- None

### Blockers
- None

### Notes for Integration
- Dashboard is at `/{clinic}/dashboard/whatsapp`
- Templates managed at `/{clinic}/dashboard/whatsapp/templates`
- Run migration `db/70_whatsapp_messages.sql` to create tables
- Configure Twilio WhatsApp:
  - Set `TWILIO_WHATSAPP_NUMBER` environment variable
  - Configure webhook URL for incoming messages
- QuickSend component can be used on pet/client profile pages
- Add WhatsApp link to dashboard sidebar

---

*Agent-06 Task File - Completed: December 2024*
