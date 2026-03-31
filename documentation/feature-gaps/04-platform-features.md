# Platform-Wide Feature Gaps

This document covers cross-cutting platform features that affect all user personas, including infrastructure, integrations, accessibility, and multi-tenant capabilities.

---

## 1. Multi-Tenant Platform

### Current State
- ✅ Dynamic routing via `[clinic]` parameter
- ✅ JSON-CMS content per tenant
- ✅ Theme injection per tenant
- ✅ Database isolation via RLS policies

### Missing Features

#### 1.1 Tenant Onboarding Wizard 🟡 HIGH
**User Story**: As a new clinic owner, I want a guided setup process.

**Requirements**:
- Create new tenant record
- Basic clinic information
- Upload logo
- Configure theme colors
- Add first admin user
- Initial service catalog setup
- Enable/disable modules

**Implementation**:
- Create `/onboarding/*` route flow
- Admin tenant management dashboard

---

#### 1.2 Tenant Billing & Subscriptions 🟡 HIGH
**User Story**: As platform owner, I want to bill tenants monthly.

**Requirements**:
- Subscription tiers (Basic, Pro, Enterprise)
- Usage-based billing options
- Payment processing (Stripe Connect)
- Invoice generation
- Usage metering (users, storage, SMS)
- Subscription management portal

**Database Addition Needed**:
```sql
CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  plan TEXT NOT NULL, -- 'basic', 'pro', 'enterprise'
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_usage (
  id UUID PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  period_start DATE,
  sms_count INT DEFAULT 0,
  email_count INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  active_users INT DEFAULT 0
);
```

---

#### 1.3 Super Admin Dashboard 🟢 MEDIUM
**User Story**: As platform owner, I want to manage all tenants.

**Requirements**:
- List all tenants
- Tenant health metrics
- Suspend/activate tenants
- Impersonate tenant users
- Global announcements
- System-wide settings

---

#### 1.4 White-Label Configuration 🟢 MEDIUM
**User Story**: As platform owner, I want tenants to have fully branded experiences.

**Requirements**:
- Custom domain support
- Remove platform branding
- Custom email sender domains
- Custom SMS sender IDs
- Tenant-specific terms/privacy

---

## 2. Authentication & Security

### Current State
- ✅ Supabase Auth (email/password, Google OAuth)
- ✅ RLS policies on all tables
- ✅ Role-based access (owner, vet, admin)

### Missing Features

#### 2.1 Password Reset UI 🔴 CRITICAL
**User Story**: As a user, I want to reset my password when forgotten.

**Requirements**:
- "Forgot password" link on login page
- Email with reset link
- Reset password form
- Success confirmation

**Implementation**:
- `web/app/[clinic]/portal/forgot-password/page.tsx`
- `web/app/[clinic]/portal/reset-password/page.tsx`
- Use Supabase's `auth.resetPasswordForEmail()`

---

#### 2.2 Email Verification Indicator 🟡 HIGH
**User Story**: As a user, I want to know if my email is verified.

**Requirements**:
- Show verification status in profile
- Resend verification email button
- Restrict features until verified (optional)

---

#### 2.3 Two-Factor Authentication 🟡 HIGH
**User Story**: As a security-conscious user, I want to enable 2FA.

**Requirements**:
- TOTP-based 2FA (Google Authenticator, etc.)
- Setup flow with QR code
- Backup codes
- Recovery process

**Note**: Supabase MFA support available

---

#### 2.4 Session Management 🟡 HIGH
**User Story**: As a user, I want to see and manage my active sessions.

**Requirements**:
- List active sessions (device, location, last active)
- Terminate specific sessions
- "Log out everywhere" option
- Session timeout configuration

---

#### 2.5 OAuth Provider Expansion 🟢 MEDIUM
**User Story**: As a user, I want more login options.

**Requirements**:
- Facebook login
- Apple login
- Account linking

---

## 3. Notification Infrastructure

### Current State
- ✅ `notification_queue` table
- ✅ `notification_templates` table
- ✅ Edge Functions for email/SMS
- ✅ Reminder generation functions

### Missing Features

#### 3.1 Push Notifications 🟡 HIGH
**User Story**: As a mobile user, I want push notifications.

**Requirements**:
- Firebase Cloud Messaging (FCM) integration
- Device token management
- Notification preferences per device
- Silent vs alert notifications

**Database Addition**:
```sql
CREATE TABLE user_devices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  fcm_token TEXT NOT NULL,
  device_type TEXT, -- 'ios', 'android', 'web'
  device_name TEXT,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

---

#### 3.2 WhatsApp Business API 🟢 MEDIUM
**User Story**: As a clinic, I want to send WhatsApp messages.

**Requirements**:
- WhatsApp Business API integration
- Template message approval
- Session messages
- Media support
- Opt-in management

---

#### 3.3 Notification Center UI 🟡 HIGH
**User Story**: As a user, I want to see all notifications in one place.

**Requirements**:
- Bell icon in header
- Unread count badge
- Dropdown with recent notifications
- Full page notification list
- Mark as read functionality
- Notification preferences

**Components Needed**:
- `web/components/layout/notification-bell.tsx`
- `web/app/[clinic]/portal/notifications/page.tsx`

---

#### 3.4 Delivery Status Tracking 🟢 MEDIUM
**User Story**: As an admin, I want to see if notifications were delivered.

**Requirements**:
- Track sent/delivered/failed status
- Bounce handling for email
- SMS delivery receipts
- Retry logic for failures

---

## 4. File Storage & Media

### Current State
- ✅ Supabase Storage for pet photos, vaccines, etc.
- ✅ Bucket policies configured
- Basic image upload in components

### Missing Features

#### 4.1 File Size Validation 🟡 HIGH
**User Story**: As a user, I want clear feedback on file size limits.

**Requirements**:
- Client-side file size checking
- Clear error messages
- Suggested image compression
- Maximum file sizes per type

---

#### 4.2 Image Optimization 🟡 HIGH
**User Story**: As a user, I want fast-loading images.

**Requirements**:
- Automatic image resizing on upload
- WebP conversion
- Thumbnail generation
- CDN caching

**Implementation**: Use Supabase Image Transformation or external service

---

#### 4.3 Document Preview 🟢 MEDIUM
**User Story**: As a user, I want to preview documents before download.

**Requirements**:
- PDF preview in browser
- Image gallery/lightbox
- Document thumbnails

---

#### 4.4 Storage Quota Management 🟢 MEDIUM
**User Story**: As an admin, I want to monitor storage usage.

**Requirements**:
- Current storage used
- Quota limits per tenant
- Usage alerts
- File cleanup tools

---

## 5. Internationalization (i18n)

### Current State
- Spanish only (Paraguay market)
- Hardcoded strings in components

### Missing Features

#### 5.1 Translation Framework 🟢 MEDIUM
**User Story**: As a user, I want the app in my language.

**Requirements**:
- Setup next-intl or similar
- Extract all strings to translation files
- Language selector
- RTL support (if applicable)
- Date/number formatting by locale

**Languages**: Spanish (default), English, Portuguese (potential markets)

---

#### 5.2 Content Translation 🟢 MEDIUM
**User Story**: As an admin, I want to translate my clinic's content.

**Requirements**:
- Multilingual JSON content files
- Translation management UI
- Fallback language handling

---

## 6. Search & Navigation

### Current State
- Basic pet search with fuzzy matching
- Standard navigation

### Missing Features

#### 6.1 Global Search 🟡 HIGH
**User Story**: As a user, I want to search for anything from one place.

**Requirements**:
- Command palette (Cmd+K)
- Search across pets, clients, appointments, invoices
- Recent searches
- Quick actions from search

**Implementation**: Consider cmdk library

---

#### 6.2 Breadcrumb Navigation 🟢 MEDIUM
**User Story**: As a user, I want to know where I am in the app.

**Requirements**:
- Dynamic breadcrumbs on all pages
- Clickable navigation
- Mobile-friendly display

---

#### 6.3 Keyboard Shortcuts 🟢 MEDIUM
**User Story**: As a power user, I want keyboard shortcuts.

**Requirements**:
- Shortcuts for common actions
- Shortcut help overlay (?)
- Customizable shortcuts

---

## 7. Accessibility

### Current State
- Basic Tailwind accessibility
- No dedicated accessibility testing

### Missing Features

#### 7.1 Screen Reader Support 🟡 HIGH
**User Story**: As a visually impaired user, I want to use the platform.

**Requirements**:
- Proper ARIA labels
- Focus management
- Skip navigation links
- Form labels and errors

---

#### 7.2 Keyboard Navigation 🟡 HIGH
**User Story**: As a user without a mouse, I want full keyboard access.

**Requirements**:
- Tab navigation order
- Focus indicators
- Keyboard-accessible dropdowns/modals
- No keyboard traps

---

#### 7.3 Color Contrast Compliance 🟡 HIGH
**User Story**: As a user with low vision, I want readable text.

**Requirements**:
- WCAG 2.1 AA compliance
- High contrast mode option
- Check all color combinations

---

## 8. Performance & Optimization

### Current State
- ✅ Materialized views for dashboard performance
- Next.js automatic code splitting
- Basic optimization

### Missing Features

#### 8.1 Performance Monitoring 🟢 MEDIUM
**User Story**: As a developer, I want to monitor app performance.

**Requirements**:
- Core Web Vitals tracking
- Error tracking (Sentry)
- API response time monitoring
- User experience metrics

---

#### 8.2 Offline Support 🟢 MEDIUM
**User Story**: As a user with poor connectivity, I want basic offline access.

**Requirements**:
- Service worker setup
- Offline data caching
- Sync when reconnected
- Offline indicator

---

#### 8.3 Progressive Web App (PWA) 🟡 HIGH
**User Story**: As a mobile user, I want to install the app.

**Requirements**:
- Web manifest
- Service worker
- Install prompt
- App-like experience

---

## 9. API & Integrations

### Current State
- Internal API routes
- No external API

### Missing Features

#### 9.1 Public API 🟢 MEDIUM
**User Story**: As a developer, I want to integrate with this platform.

**Requirements**:
- RESTful API endpoints
- API key authentication
- Rate limiting
- API documentation (OpenAPI/Swagger)
- Webhooks for events

---

#### 9.2 Zapier/Make Integration 🟢 MEDIUM
**User Story**: As an admin, I want to connect with other tools.

**Requirements**:
- Zapier app (triggers and actions)
- Common automations (new appointment → calendar)
- No-code integration options

---

#### 9.3 PIMS Integration 🟢 MEDIUM
**User Story**: As a clinic migrating from another system, I want data import.

**Requirements**:
- Import from common PIMS
- Data mapping tools
- Migration validation
- Historical data support

---

## 10. Mobile Experience

### Current State
- Responsive web design
- Mobile-optimized layouts
- No native app

### Missing Features

#### 10.1 Native Mobile App 🟢 MEDIUM
**User Story**: As a mobile user, I want a native app experience.

**Requirements**:
- React Native app
- iOS and Android
- Push notifications
- Offline support
- Camera integration

**Scope**: Consider Expo for faster development

---

#### 10.2 Mobile-Specific Features 🟡 HIGH
**User Story**: As a mobile user, I want features optimized for my device.

**Requirements**:
- Swipe gestures
- Pull-to-refresh
- Bottom navigation
- Touch-optimized inputs
- Location services (nearby clinics)

---

## 11. Analytics & Monitoring

### Current State
- Basic dashboard metrics
- No external analytics

### Missing Features

#### 11.1 Usage Analytics 🟢 MEDIUM
**User Story**: As platform owner, I want to understand user behavior.

**Requirements**:
- Page views and sessions
- Feature usage tracking
- User flows
- Privacy-compliant (GDPR)

**Options**: Plausible, PostHog, or custom

---

#### 11.2 Error Monitoring 🟡 HIGH
**User Story**: As a developer, I want to know about errors in production.

**Requirements**:
- Error capture and alerting
- Stack traces
- User context
- Release tracking

**Implementation**: Sentry recommended

---

#### 11.3 Uptime Monitoring 🟡 HIGH
**User Story**: As platform owner, I want to know if the service is down.

**Requirements**:
- Endpoint health checks
- Alert notifications
- Status page
- Incident management

---

## Implementation Checklist

### Critical (Must Have)
- [ ] Password reset UI
- [ ] Email verification indicator

### High Priority
- [ ] Two-factor authentication
- [ ] Session management
- [ ] Push notifications
- [ ] Notification center UI
- [ ] File size validation
- [ ] Image optimization
- [ ] Global search
- [ ] Screen reader support
- [ ] Keyboard navigation
- [ ] Color contrast compliance
- [ ] PWA setup
- [ ] Error monitoring
- [ ] Uptime monitoring

### Medium Priority
- [ ] Tenant onboarding wizard
- [ ] Tenant billing
- [ ] Super admin dashboard
- [ ] White-label configuration
- [ ] OAuth expansion
- [ ] WhatsApp integration
- [ ] Delivery status tracking
- [ ] Document preview
- [ ] Storage quota management
- [ ] Translation framework
- [ ] Content translation
- [ ] Breadcrumb navigation
- [ ] Keyboard shortcuts
- [ ] Performance monitoring
- [ ] Offline support
- [ ] Public API
- [ ] Zapier integration
- [ ] PIMS integration
- [ ] Native mobile app
- [ ] Usage analytics
