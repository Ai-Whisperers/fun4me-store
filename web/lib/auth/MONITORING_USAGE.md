# Auth Monitoring Usage Guide

**Epic:** S004 - Auth Hardening  
**Task:** T002 - Implement failed login monitoring

## Overview

This module provides comprehensive authentication monitoring and failed login detection for the Vete application. It logs all authentication attempts and can detect suspicious patterns.

## Features

- ✅ Log all authentication attempts (success/failure)
- ✅ Track IP addresses and user agents
- ✅ Detect repeated failed login attempts
- ✅ IP-based abuse detection
- ✅ Admin dashboard analytics
- ✅ Automatic security alerts

## Quick Start

### 1. Database Migration

The `auth_logs` table is created automatically via migration:
```bash
# Apply the migration (if using Supabase CLI)
supabase db push
```

### 2. Basic Usage

```typescript
import { logSuccessfulLogin, logFailedLogin } from '@/lib/auth'

// Log successful login
await logSuccessfulLogin('user@example.com')

// Log failed login with reason
await logFailedLogin('user@example.com', 'invalid_password')
```

### 3. Automatic Monitoring with Wrapper

```typescript
import { withAuthMonitoring } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Wrap your auth operations
const monitoredSignIn = withAuthMonitoring(
  supabase.auth.signInWithPassword,
  'signInWithPassword'
)

// Use it normally - monitoring happens automatically
const result = await monitoredSignIn({
  email: 'user@example.com',
  password: 'password123'
})
```

## Integration Examples

### API Route Integration

```typescript
// app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { logSuccessfulLogin, logFailedLogin, checkSuspiciousActivity, getClientInfo } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      // Log the failed attempt
      await logFailedLogin(email, error.message)
      
      // Check for suspicious activity
      const clientInfo = await getClientInfo()
      const alerts = await checkSuspiciousActivity(email, clientInfo.ip)
      
      if (alerts.length > 0) {
        console.warn('Suspicious activity detected:', alerts)
        // You could implement additional security measures here
        // like temporary account lockout or CAPTCHA requirement
      }
      
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    // Log successful login
    await logSuccessfulLogin(email)
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### Server Action Integration

```typescript
'use server'

import { logSuccessfulLogin, logFailedLogin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function signInAction(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    await logFailedLogin(email, error.message)
    return { error: error.message }
  }
  
  await logSuccessfulLogin(email)
  return { success: true }
}
```

### Client-Side Hook Integration

```typescript
// hooks/useAuthMonitoring.ts
import { useEffect } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { logSuccessfulLogin, logFailedLogin } from '@/lib/auth'

export function useAuthMonitoring() {
  const supabase = useSupabaseClient()
  const user = useUser()
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email) {
          await logSuccessfulLogin(session.user.email)
        } else if (event === 'SIGN_IN_ERROR') {
          // Note: This requires custom error handling to get the email
          // since Supabase doesn't provide it in the error callback
        }
      }
    )
    
    return () => subscription.unsubscribe()
  }, [supabase])
}
```

## Security Monitoring

### Check for Suspicious Activity

```typescript
import { checkSuspiciousActivity } from '@/lib/auth'

// Check for patterns by email and IP
const alerts = await checkSuspiciousActivity('user@example.com', '192.168.1.100')

if (alerts.length > 0) {
  alerts.forEach(alert => {
    switch (alert.type) {
      case 'repeated_failures':
        console.warn(`${alert.attemptCount} failed attempts for ${alert.email}`)
        break
      case 'ip_abuse':
        console.warn(`${alert.attemptCount} failed attempts from IP ${alert.ip}`)
        break
    }
  })
}
```

### Admin Dashboard Analytics

```typescript
import { getAuthActivitySummary } from '@/lib/auth'

// Get last 24 hours of auth activity
const summary = await getAuthActivitySummary(24)

console.log({
  totalAttempts: summary.totalAttempts,
  successRate: summary.successfulAttempts / summary.totalAttempts,
  topFailureReasons: summary.failureReasons
})
```

## Configuration

### Thresholds

Current detection thresholds (can be customized in `monitoring.ts`):
- **Email-based**: 5 failed attempts in 15 minutes
- **IP-based**: 10 failed attempts in 15 minutes

### Database Retention

Consider setting up a cron job to clean old logs:

```sql
-- Delete auth logs older than 90 days
DELETE FROM auth_logs WHERE timestamp < NOW() - INTERVAL '90 days';
```

## Security Considerations

1. **IP Detection**: Uses `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` headers
2. **Privacy**: Email addresses are stored for monitoring but should comply with your privacy policy
3. **Rate Limiting**: This monitoring complements but doesn't replace rate limiting
4. **Alerts**: Consider integrating with your alerting system for real-time notifications

## Troubleshooting

### Common Issues

1. **Headers not available**: Ensure you're calling `getClientInfo()` in server context
2. **Database errors**: Check Supabase connection and RLS policies
3. **Missing logs**: Verify the migration was applied successfully

### Debugging

Enable debug logging:
```typescript
// Set in your environment
NEXT_PUBLIC_DEBUG_AUTH_MONITORING=true
```

## Next Steps

1. **Integration Testing**: Test with your existing auth flows
2. **Alerting**: Connect to your monitoring/alerting system
3. **Dashboard**: Create admin views for auth activity
4. **Account Lockout**: Implement temporary lockout for suspicious activity
5. **CAPTCHA**: Add CAPTCHA for repeated failed attempts