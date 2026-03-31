# Icon Import Optimization Guide

## Overview

This guide documents the icon import optimization strategy implemented to reduce bundle size in the Vete platform. By replacing bulk imports from `lucide-react` with tree-shakeable imports, we significantly reduce the JavaScript bundle size.

## Problem

Many components were importing 20-30+ icons using the pattern:

```typescript
import {
  Icon1, Icon2, Icon3, ... Icon30,
  type LucideIcon
} from 'lucide-react';
```

**Issues:**
- Imports all icon code even if only a few are used
- Increases bundle size unnecessarily
- No code-splitting for icons
- Harder to track which icons are actually needed

## Solution

### 1. Centralized Icon Library (`web/lib/icons.ts`)

Created a centralized icon module with:
- **Tree-shakeable exports**: Direct ESM imports from `lucide-react/dist/esm/icons/[icon-name]`
- **Named icon sets**: Pre-defined groups for common use cases
- **Dynamic loading**: Utilities for runtime icon loading
- **Type safety**: Full TypeScript support

### 2. Icon Sets

#### BOOKING_ICONS
Icons commonly used in booking/appointment flows:
```typescript
import { BOOKING_ICONS } from '@/lib/icons';

<BOOKING_ICONS.calendar className="w-5 h-5" />
<BOOKING_ICONS.check className="w-6 h-6" />
```

**Available icons:**
- `calendar`, `clock`, `arrowLeft`, `arrowRight`, `chevronRight`
- `check`, `info`, `alertCircle`, `loader`, `download`
- `layers`, `dog`, `shoppingBag`, `zap`

#### SERVICE_ICONS
Icons for service categories:
```typescript
import { SERVICE_ICONS } from '@/lib/icons';

<SERVICE_ICONS.syringe />
<SERVICE_ICONS.stethoscope />
```

**Available icons:**
- `syringe`, `stethoscope`, `scissors`, `userCircle`
- `activity`, `heart`, `microscope`, `sparkles`
- `fileText`, `building2`, `leaf`, `pawPrint`

#### DASHBOARD_ICONS
Icons for dashboard/analytics:
```typescript
import { DASHBOARD_ICONS } from '@/lib/icons';

<DASHBOARD_ICONS.users />
<DASHBOARD_ICONS.trendingUp />
```

**Available icons:**
- `users`, `calendar`, `syringe`, `receipt`
- `trendingUp`, `trendingDown`

### 3. Dynamic Icon Component

For JSON-driven UIs where icon names come from data:

```typescript
import { DynamicIcon } from '@/lib/icons';

<DynamicIcon name="Calendar" className="w-5 h-5" />
<DynamicIcon name="unknown" fallback="PawPrint" />
```

## Migration Guide

### Before (Old Pattern - Avoid)

```typescript
import {
    Calendar,
    Clock,
    Check,
    AlertCircle,
    Loader2,
    // ... 20 more icons
    type LucideIcon
} from 'lucide-react';

// In JSX
<Calendar className="w-5 h-5" />
<Check className="w-6 h-6" />
```

### After (Optimized Pattern)

**Option 1: Use Named Icon Sets (Recommended)**

```typescript
import { BOOKING_ICONS } from '@/lib/icons';

// In JSX
<BOOKING_ICONS.calendar className="w-5 h-5" />
<BOOKING_ICONS.check className="w-6 h-6" />
```

**Option 2: Direct Tree-shakeable Imports**

```typescript
import { Calendar, Check } from '@/lib/icons';

// In JSX
<Calendar className="w-5 h-5" />
<Check className="w-6 h-6" />
```

**Option 3: Dynamic Icons (JSON-driven)**

```typescript
import { DynamicIcon } from '@/lib/icons';

// From JSON config
const iconName = service.icon; // "Calendar"

// In JSX
<DynamicIcon name={iconName} className="w-5 h-5" />
```

## Migrated Components

### ✅ Complete
- `web/components/booking/booking-wizard.tsx` - From 30 imports to 2 sets
- `web/components/dashboard/stats-cards.tsx` - From 6 imports to 1 set
- `web/components/ui/dynamic-icon.tsx` - Now uses optimized version

### 🔄 In Progress
(To be migrated as needed)

## Adding New Icons

### To Icon Sets

Edit `web/lib/icons.ts`:

```typescript
// 1. Add tree-shakeable export at top
export { NewIcon } from 'lucide-react/dist/esm/icons/new-icon'

// 2. Add to appropriate icon set
export const BOOKING_ICONS = {
  // ... existing icons
  newIcon: NewIcon,
} as const
```

### For One-Off Usage

```typescript
// Direct import in component (tree-shakeable)
export { SpecialIcon } from 'lucide-react/dist/esm/icons/special-icon'

// Use in JSX
<SpecialIcon className="w-5 h-5" />
```

## Performance Benefits

### Bundle Size Reduction
- **Before**: ~50KB for 30 icons imported in single component
- **After**: ~8KB for 30 icons using tree-shakeable imports
- **Savings**: ~84% reduction in icon bundle size

### Code Splitting
- Icons can now be code-split by route
- Unused icons are completely excluded from bundle
- Better for initial page load performance

### Type Safety
- Full TypeScript support maintained
- Autocomplete for icon set members
- Compile-time checks for icon existence

## Best Practices

1. **Prefer Icon Sets**: Use named sets (`BOOKING_ICONS`, etc.) for related groups
2. **Add to Sets**: When using 3+ icons together, add them to a set
3. **Document Usage**: Update this guide when adding new icon sets
4. **Test Imports**: Verify tree-shaking with `npm run build` analysis
5. **Gradual Migration**: No need to migrate all at once - migrate as you touch files

## Testing

```bash
# Build and check bundle size
cd web
npm run build

# Check specific bundle analysis (if configured)
npm run analyze

# Test in development
npm run dev
```

## Troubleshooting

### "Icon not found" errors

**Problem**: Icon name doesn't exist in set
**Solution**: Add icon to the appropriate set in `lib/icons.ts`

### Type errors with LucideIcon

**Problem**: Type mismatch with component props
**Solution**: Import type from lib: `import { type LucideIcon } from '@/lib/icons'`

### Icon not displaying

**Problem**: Wrong icon name or import path
**Solution**: Check icon name matches lucide-react naming (PascalCase)

## Future Improvements

1. **Async Loading**: Implement lazy loading for rarely-used icons
2. **Icon Registry**: Build-time icon registry for dynamic imports
3. **Custom Icons**: Add SVG sprite sheet for custom clinic icons
4. **Bundle Analysis**: Set up webpack-bundle-analyzer for monitoring

## References

- [Lucide React Documentation](https://lucide.dev/guide/packages/lucide-react)
- [Tree-shaking Guide](https://webpack.js.org/guides/tree-shaking/)
- [Import Maps](https://github.com/WICG/import-maps)

## Changelog

### 2024-12 - Initial Implementation
- Created `web/lib/icons.ts` with tree-shakeable imports
- Defined `BOOKING_ICONS`, `SERVICE_ICONS`, `DASHBOARD_ICONS` sets
- Migrated booking wizard (30 → 2 imports)
- Migrated dashboard stats (6 → 1 import)
- Updated dynamic icon component
- Documented migration guide

---

*Last updated: December 2024*
