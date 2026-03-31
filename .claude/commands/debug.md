# Debug Issues

Systematic approach to debugging issues in the veterinary platform.

## Common Issue Categories

### 1. Build Errors

**Symptoms**: `npm run build` fails

**Check**:
1. TypeScript errors: `npm run lint`
2. Missing dependencies: Delete `node_modules` and `npm install`
3. Tailwind issues: Ensure using v3.4.x (NOT v4)
4. Next.js cache: Delete `.next/` folder

**Common Fixes**:
```bash
cd web
rm -rf .next node_modules
npm install
npm run build
```

### 2. Database/Supabase Errors

**Symptoms**: Data not loading, 500 errors, RLS violations

**Check**:
1. Environment variables in `.env.local`
2. RLS policies on affected table
3. User authentication state
4. Profile exists for user

**Debug Steps**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Check user's profile
SELECT * FROM profiles WHERE id = 'user-uuid';

-- Test query without RLS (admin only)
SET session_replication_role = replica;
SELECT * FROM your_table;
SET session_replication_role = DEFAULT;
```

### 3. Authentication Issues

**Symptoms**: Login fails, session not persisting

**Check**:
1. Supabase Auth settings in dashboard
2. Redirect URLs configured
3. Cookies being set correctly
4. `createClient` using correct import (server vs client)

### 4. Styling/Theme Issues

**Symptoms**: Colors wrong, layout broken

**Check**:
1. CSS variables being set in `ClinicThemeProvider`
2. Tailwind classes using `var(--color-name)`
3. Theme.json has correct color values
4. Build not caching old styles

**Debug Theme**:
```javascript
// In browser console
getComputedStyle(document.documentElement).getPropertyValue('--primary')
```

### 5. Multi-Tenant Issues

**Symptoms**: Wrong clinic data, mixed content

**Check**:
1. URL has correct clinic slug
2. `getClinicData()` returning correct clinic
3. API routes filtering by `clinic_id`
4. RLS using correct tenant isolation

### 6. Content Not Updating

**Symptoms**: JSON changes not reflected

**Check**:
1. File saved correctly in `.content_data/`
2. Development server restarted
3. Browser cache cleared
4. `generateStaticParams` returns new clinic

## Logging

Add logging for debugging:

```typescript
// Server-side
console.log('[API] Request:', { method, path, body })

// Client-side
console.log('[Component] State:', state)
```

## Useful Queries

```sql
-- Recent errors (if logging table exists)
SELECT * FROM audit_logs
WHERE level = 'error'
ORDER BY created_at DESC
LIMIT 20;

-- User's access
SELECT p.role, t.name as clinic
FROM profiles p
JOIN tenants t ON p.clinic_id = t.id
WHERE p.id = 'user-uuid';
```

## When Stuck

1. Check browser Network tab for failed requests
2. Check browser Console for JavaScript errors
3. Check server logs (Vercel dashboard or terminal)
4. Verify database state in Supabase dashboard
5. Test API endpoints directly with curl/Postman
