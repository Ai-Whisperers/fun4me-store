# Authentication Configuration Documentation

**Created**: February 6, 2026  
**Task**: T001 - Review Supabase auth configuration  
**Epic**: v003-security-devops/s004-auth-hardening

---

## Current Supabase Authentication Settings

### Project Information
- **Project URL**: `https://okddppczckbjdotrxiev.supabase.co`
- **Project ID**: `okddppczckbjdotrxiev`
- **Environment**: Development/Production Hybrid

### JWT Configuration
- **JWT Expiry Time**: Default 3600s (1 hour)
- **Refresh Token Rotation**: ❌ **NOT ENABLED** (Security Risk)
- **JWT Algorithm**: HS256 (default)
- **Custom JWT Secret**: Not configured (using Supabase default)

### Session Management
- **Session Timeout**: 1 hour (follows JWT expiry)
- **Persistent Sessions**: ✅ Enabled (localStorage)
- **Session Invalidation on Password Change**: ⚠️ **NEEDS VERIFICATION**
- **Auto Refresh**: Enabled by default

### Email Authentication
- **Email Signup**: ✅ Enabled (`enable_signup = true`)
- **Email Confirmations**: ❌ Disabled (`enable_confirmations = false`)
- **Double Confirm Changes**: ✅ Enabled (`double_confirm_changes = true`)
- **Password Requirements**: Using Supabase defaults (6 chars minimum)

### Rate Limiting & Security
- **Failed Login Monitoring**: ❌ **NOT IMPLEMENTED** (Security Gap)
- **Auth Rate Limiting**: ✅ Custom implementation via `action-rate-limit.ts`
  - **Auth Actions**: 5 requests per minute
  - **Contact Forms**: 5 requests per minute  
  - **IP-based Tracking**: ✅ Enabled
- **Account Lockout**: ❌ Not configured

### URL & Redirect Configuration
- **Site URL**: `http://localhost:3000` (Development)
- **Additional Redirect URLs**: `http://localhost:3000/**`
- **Production URLs**: ⚠️ **NEEDS CONFIGURATION**

---

## Security Assessment

### ✅ Current Strengths
1. **Rate Limiting**: Custom rate limiting implementation for auth actions
2. **Tenant Isolation**: RLS (Row Level Security) policies in place
3. **Environment Separation**: Proper env var management with validation
4. **Session Persistence**: Configured for good UX
5. **Email Double Confirmation**: Prevents accidental changes

### ❌ Critical Security Gaps
1. **No Refresh Token Rotation**: Tokens remain valid until expiry
2. **Missing Failed Login Monitoring**: No tracking of brute force attempts
3. **No Account Lockout**: Unlimited failed login attempts allowed
4. **Short JWT Expiry**: 1 hour may cause frequent re-auth (UX issue)
5. **Email Confirmations Disabled**: New accounts not verified

### ⚠️ Areas Needing Review
1. **Session Invalidation**: Need to verify password change behavior
2. **JWT Payload**: Need to verify no sensitive data included
3. **Production URLs**: Need to configure proper redirect URLs
4. **Password Policy**: May need stronger requirements for production

---

## Recommended Security Improvements

### High Priority
1. **Enable Refresh Token Rotation**
   ```toml
   [auth]
   refresh_token_rotation_enabled = true
   ```

2. **Implement Failed Login Monitoring** (See T002)
   - Log failed attempts to database
   - Alert on suspicious patterns
   - Consider account lockout after N failures

3. **Enable Email Confirmations for Production**
   ```toml
   [auth.email]
   enable_confirmations = true
   ```

### Medium Priority
1. **Increase JWT Expiry** (Balance security/UX)
   - Consider 4-8 hours for better UX
   - Ensure refresh token rotation works properly

2. **Configure Production URLs**
   - Set proper `site_url` for production
   - Configure production redirect URLs

3. **Strengthen Password Policy**
   - Consider 8+ character minimum
   - Add complexity requirements

### Low Priority
1. **Session Timeout Warnings**
   - Implement client-side session timeout warnings
   - Auto-refresh before expiry

2. **Security Headers**
   - Verify HSTS, CSP headers in production
   - Consider additional security headers

---

## Configuration Files Reference

### Primary Configuration
- **Supabase Config**: `/supabase/config.toml`
- **Environment**: `.env.local`
- **Auth Client**: `/lib/supabase/client.ts`
- **Auth Core**: `/lib/auth/core.ts`

### Rate Limiting
- **Implementation**: `/lib/auth/action-rate-limit.ts`
- **Configuration**: `/lib/rate-limit.ts`

### Middleware
- **API Auth**: `/lib/auth/api-wrapper.ts`
- **Auth Middleware**: `/lib/middleware/auth.ts`

---

## Testing & Verification Commands

### Check Current Configuration
```bash
# Run configuration check script
node scripts/check-supabase-config.mjs

# Check auth settings in Supabase Dashboard
# Navigate to: Authentication → Settings
```

### Manual Verification Needed
1. **Supabase Dashboard** → Authentication → Settings:
   - [ ] Verify JWT expiry time
   - [ ] Check if refresh token rotation is enabled
   - [ ] Review rate limiting settings
   - [ ] Verify password requirements

2. **Test Session Behavior**:
   - [ ] Change password and verify other sessions invalidate
   - [ ] Test failed login attempts logging
   - [ ] Verify JWT payload contains no sensitive data

---

## Next Steps (From T002)

1. **Implement Failed Login Monitoring**
   - Create `auth_logs` table
   - Add logging to auth events
   - Set up alerting for suspicious patterns

2. **Production Environment Setup**
   - Configure production URLs
   - Enable email confirmations
   - Set appropriate JWT expiry times

3. **Security Monitoring**
   - Monitor failed login patterns
   - Alert on multiple failed attempts
   - Track session invalidation events

---

**Documentation Status**: ✅ Complete  
**Last Updated**: February 6, 2026  
**Next Review**: After T002 implementation