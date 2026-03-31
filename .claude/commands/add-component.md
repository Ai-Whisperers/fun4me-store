# Add Component

Create a new React component following project patterns.

## Component Location

- **UI Components**: `web/components/ui/` - Reusable UI primitives
- **Feature Components**: `web/components/[feature]/` - Domain-specific
- **Layout Components**: `web/components/layout/` - Navigation, headers

## Standard Template

### Server Component (Default)

```tsx
// components/feature/FeatureName.tsx
import { getClinicData } from '@/lib/clinics'

interface FeatureNameProps {
  clinic: string
  title: string
  // Add props
}

export async function FeatureName({ clinic, title }: FeatureNameProps) {
  const clinicData = await getClinicData(clinic)

  return (
    <section className="py-12 px-4">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">
        {title}
      </h2>
      {/* Component content */}
    </section>
  )
}
```

### Client Component

```tsx
// components/feature/InteractiveFeature.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface InteractiveFeatureProps {
  initialValue: string
  onSubmit: (value: string) => void
}

export function InteractiveFeature({
  initialValue,
  onSubmit
}: InteractiveFeatureProps) {
  const [value, setValue] = useState(initialValue)

  const handleSubmit = () => {
    onSubmit(value)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 rounded-lg bg-[var(--bg-paper)]"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-4 py-2 rounded border border-[var(--border)]"
      />
      <button
        onClick={handleSubmit}
        className="mt-4 px-6 py-2 rounded bg-[var(--primary)] text-[var(--primary-contrast)]"
      >
        Submit
      </button>
    </motion.div>
  )
}
```

## Styling Guidelines

### Use Theme Variables
```tsx
// GOOD
className="bg-[var(--primary)] text-[var(--text-primary)]"

// BAD
className="bg-blue-500 text-gray-900"
```

### Responsive Design
```tsx
// Mobile-first
className="text-sm md:text-base lg:text-lg"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

### Common Patterns
```tsx
// Cards
className="p-6 rounded-lg bg-[var(--bg-paper)] shadow-md"

// Buttons
className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-contrast)] hover:opacity-90 transition-opacity"

// Inputs
className="w-full px-4 py-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
```

## Icon Usage

```tsx
import { Calendar, User, Phone } from 'lucide-react'

// Use with theme colors
<Calendar className="w-5 h-5 text-[var(--primary)]" />
```

## Animation

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>
```

## Checklist

- [ ] Props interface defined
- [ ] Server Component unless interactivity needed
- [ ] Theme CSS variables used
- [ ] Mobile-first responsive
- [ ] Proper TypeScript types
- [ ] Accessibility considered (aria labels, roles)
- [ ] Loading/error states if async
