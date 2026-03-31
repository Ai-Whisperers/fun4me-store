# REF-004: Add Barrel Exports to All Component Directories

## Priority: P3 - Low
## Category: Refactoring
## Affected Areas: web/components/

## Description

Many component directories lack barrel exports (index.ts files), leading to verbose import statements throughout the codebase.

## Current State

```typescript
// Without barrel exports - verbose imports
import { AppointmentCard } from '@/components/appointments/appointment-card'
import { AppointmentList } from '@/components/appointments/appointment-list'
import { AppointmentForm } from '@/components/appointments/appointment-form'

// Directories WITH index.ts (good):
// - ui/, invoices/, calendar/, landing/, whatsapp/, store/

// Directories WITHOUT index.ts (need adding):
// - about/, appointments/, auth/, cart/, clinical/,
// - consents/, faq/, finance/, forms/, hospital/,
// - insurance/, lab/, loyalty/, messaging/, onboarding/,
// - pets/, portal/, safety/, search/, services/, tools/
```

## Proposed Solution

Add index.ts to all component directories:

```typescript
// components/appointments/index.ts
export { AppointmentCard } from './appointment-card'
export { AppointmentList } from './appointment-list'
export { AppointmentForm } from './appointment-form'
export { CancelButton } from './cancel-button'
export { RescheduleDialog } from './reschedule-dialog'

// Re-export types
export type { AppointmentCardProps } from './appointment-card'
```

### Import After Fix

```typescript
// Clean barrel import
import {
  AppointmentCard,
  AppointmentList,
  AppointmentForm
} from '@/components/appointments'
```

## Implementation Steps

1. [ ] List all directories needing index.ts
2. [ ] Generate index.ts for each
3. [ ] Update imports in codebase (optional - old imports still work)
4. [ ] Add eslint rule to prefer barrel imports (optional)

## Script to Generate

```bash
#!/bin/bash
# generate-barrel-exports.sh
for dir in web/components/*/; do
  if [ ! -f "$dir/index.ts" ]; then
    echo "Creating index.ts in $dir"
    echo "// Auto-generated barrel exports" > "$dir/index.ts"
    for file in "$dir"*.tsx; do
      name=$(basename "$file" .tsx)
      componentName=$(echo "$name" | sed -r 's/(^|-)([a-z])/\U\2/g')
      echo "export { $componentName } from './$name'" >> "$dir/index.ts"
    done
  fi
done
```

## Acceptance Criteria

- [ ] All component directories have index.ts
- [ ] Existing imports still work
- [ ] New code uses barrel imports
- [ ] TypeScript types properly exported

## Estimated Effort

- Script creation: 30 minutes
- Manual fixes: 2 hours
- Import updates (optional): 4 hours
- **Total: 2.5-6.5 hours**
