# Add New Feature

Add a new feature to the veterinary platform following established patterns.

## When to Use

- **Use for**: New pages, components, API routes, or functionality
- **Critical for**: Multi-tenant features, database changes, authenticated routes

## Good Pattern - User Story Format

Before implementing, document the feature using this structure:

```markdown
## User Story
As a [pet owner/vet/admin], I want to [action] so that [benefit].

## Acceptance Criteria
**Scenario 1: Happy Path**
- Given I am [user type] on [page/context]
- When I [action]
- Then [expected result]
- And [secondary result]

**Scenario 2: Edge Case**
- Given [edge condition]
- When I [action]
- Then [graceful handling]

## Technical Requirements
- [ ] Database changes needed
- [ ] API routes needed
- [ ] Components needed
- [ ] Tests required
```

## Bad Pattern - Avoid This

```markdown
## Story
Add a new feature.

## Requirements
- It should work
- Looks good
- Fast
```

**Why this is bad:**
- No user context
- Vague acceptance criteria
- No testable requirements
- No technical specification

## Implementation Steps

### 1. Database (if needed)

Create migration in `web/db/XX_feature_name.sql`:

```sql
-- Good: Complete migration with RLS
CREATE TABLE IF NOT EXISTS feature_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- columns
);

ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic isolation" ON feature_table
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE id = auth.uid())
  );
```

```sql
-- Bad: Missing RLS
CREATE TABLE feature_table (
  id SERIAL PRIMARY KEY,
  -- No clinic_id, no RLS
);
```

### 2. API Routes

Create in `web/app/api/[resource]/route.ts`:

```typescript
// Good: Complete pattern
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tenant context
  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  // Data fetch with tenant filter
  const { data, error } = await supabase
    .from('feature_table')
    .select('*')
    .eq('clinic_id', profile.clinic_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

```typescript
// Bad: Missing checks
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('feature_table').select('*')
  return NextResponse.json(data)
}
```

**Why bad:**
- No authentication
- No tenant isolation
- No error handling

### 3. Components

```tsx
// Good: Server Component with theme
interface FeatureCardProps {
  clinic: string
  title: string
}

export async function FeatureCard({ clinic, title }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-lg bg-[var(--bg-paper)] shadow-md">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
    </div>
  )
}
```

```tsx
// Bad: Hardcoded colors
export function FeatureCard({ title }) {
  return (
    <div style={{ padding: 24, background: '#fff' }}>
      <h3 style={{ color: '#333' }}>{title}</h3>
    </div>
  )
}
```

**Why bad:**
- No TypeScript types
- Inline styles instead of Tailwind
- Hardcoded colors break theming

### 4. Tests

```typescript
// Good: Complete test with scenarios
describe('FeatureAPI', () => {
  it('returns 401 without authentication', async () => {
    const response = await fetch('/api/feature')
    expect(response.status).toBe(401)
  })

  it('returns data for authenticated user', async () => {
    // Setup auth mock
    const response = await authenticatedFetch('/api/feature')
    expect(response.status).toBe(200)
    expect(response.data).toBeDefined()
  })

  it('isolates data by clinic', async () => {
    // Verify no cross-tenant leakage
  })
})
```

## Module Configuration

If feature should be toggleable per clinic, add to `config.json`:

```json
{
  "settings": {
    "modules": {
      "new_feature": true
    }
  }
}
```

Then check in component:
```tsx
const clinicData = await getClinicData(clinic)
if (!clinicData.settings.modules.new_feature) {
  return null
}
```

## Final Must-Pass Checklist

- [ ] User story documented with acceptance criteria
- [ ] Database has RLS policies (if new tables)
- [ ] API routes check authentication
- [ ] API routes filter by clinic_id
- [ ] Components use theme CSS variables
- [ ] Components have TypeScript props interface
- [ ] Mobile-first responsive design
- [ ] Tests cover happy path and edge cases
- [ ] No hardcoded clinic names or colors
- [ ] Spanish language text (if user-facing)
