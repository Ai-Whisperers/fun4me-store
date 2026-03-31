# Theme System

Per-clinic dynamic theming using CSS variables and JSON configuration.

> **Location**: `web/components/clinic-theme-provider.tsx`
> **Configuration**: `web/.content_data/[clinic]/theme.json`
> **Types**: `web/lib/types/clinic-config.ts`
> **Last Updated**: January 2026

---

## Overview

The theme system enables each clinic tenant to have unique branding without code changes:

- **JSON-CMS Configuration**: Colors, fonts, shadows defined in `theme.json`
- **CSS Variable Injection**: Runtime application of theme values
- **17 Color Categories**: Comprehensive design system support
- **Responsive & Accessible**: All themes maintain contrast ratios

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    theme.json (per clinic)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ colors  │ │gradients│ │  fonts  │ │   ui    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              ClinicThemeProvider (Client Component)          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ useEffect: Injects CSS variables into :root         │    │
│  │ - document.documentElement.style.setProperty()      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CSS Variables on :root                    │
│  --primary, --secondary, --bg-default, --text-primary, ...  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tailwind + Components                     │
│  bg-[var(--primary)], text-[var(--text-secondary)], etc.    │
└─────────────────────────────────────────────────────────────┘
```

---

## Theme JSON Structure

### Complete theme.json Example

```json
{
  "colors": {
    "primary": {
      "main": "#2F5233",
      "light": "#4E7C54",
      "dark": "#1A331D",
      "contrast": "#FFFFFF",
      "50": "#f0f7f1",
      "100": "#dcece0",
      "500": "#2F5233",
      "900": "#182a1b",
      "rgb": "47, 82, 51"
    },
    "secondary": { /* same structure */ },
    "accent": "#F0C808",
    "background": {
      "default": "#FAFBFC",
      "paper": "#FFFFFF",
      "subtle": "#F2F4F6",
      "dark": "#1A331D",
      "hero": "#2F5233",
      "surface": "#FFFFFF",
      "surfaceElevated": "#FEFEFE",
      "surfaceOverlay": "rgba(0, 0, 0, 0.5)"
    },
    "text": {
      "primary": "#1F2937",
      "secondary": "#4B5563",
      "muted": "#9CA3AF",
      "invert": "#FFFFFF",
      "link": "#2F5233",
      "linkHover": "#1A331D",
      "disabled": "#D1D5DB"
    },
    "border": {
      "light": "#E5E7EB",
      "default": "#D1D5DB",
      "dark": "#9CA3AF",
      "focus": "#2F5233"
    },
    "status": {
      "success": { "main": "#10B981", "bg": "#ECFDF5", "border": "#A7F3D0" },
      "warning": { "main": "#F59E0B", "bg": "#FFFBEB", "border": "#FDE68A" },
      "error": { "main": "#EF4444", "bg": "#FEF2F2", "border": "#FECACA" },
      "info": { "main": "#3B82F6", "bg": "#EFF6FF", "border": "#BFDBFE" }
    },
    "neutral": { "50": "#fafafa", "500": "#71717a", "900": "#18181b" },
    "interactive": {
      "hover": "rgba(47, 82, 51, 0.04)",
      "active": "rgba(47, 82, 51, 0.08)",
      "focus": "rgba(47, 82, 51, 0.12)",
      "focusRing": "rgba(47, 82, 51, 0.2)"
    },
    "input": {
      "bg": "#FFFFFF",
      "border": "#D1D5DB",
      "borderFocus": "#2F5233",
      "placeholder": "#9CA3AF"
    },
    "chart": { "1": "#2F5233", "2": "#F0C808", ... },
    "accents": { "teal": "#14B8A6", "purple": "#8B5CF6", ... }
  },
  "gradients": {
    "hero": "linear-gradient(135deg, #2F5233 0%, #1A331D 100%)",
    "primary": "linear-gradient(135deg, #4E7C54 0%, #2F5233 100%)",
    "accent": "linear-gradient(135deg, #F0C808 0%, #F5D74D 100%)"
  },
  "fonts": {
    "heading": "'Montserrat', sans-serif",
    "body": "'Inter', sans-serif",
    "mono": "'JetBrains Mono', monospace"
  },
  "typography": {
    "h1": { "size": "3.5rem", "weight": "900", "line_height": "1.1" },
    "body": { "size": "1rem", "weight": "400", "line_height": "1.6" }
  },
  "ui": {
    "border_radius": "16px",
    "border_radius_sm": "8px",
    "shadow_card": "0 4px 20px -2px rgb(47 82 51 / 0.12)",
    "shadow_button": "0 4px 14px 0 rgb(47 82 51 / 0.25)"
  },
  "spacing": {
    "section_padding": "6rem",
    "container_max_width": "1280px",
    "card_padding": "2rem"
  },
  "animations": {
    "transition_fast": "150ms ease",
    "transition_normal": "300ms ease",
    "hover_scale": "1.02",
    "hover_lift": "-4px"
  }
}
```

---

## CSS Variables Reference

### 1. Primary Color (Full Scale)

| Variable | Purpose | Example |
|----------|---------|---------|
| `--primary` | Main brand color | `#2F5233` |
| `--primary-light` | Lighter variant | `#4E7C54` |
| `--primary-dark` | Darker variant | `#1A331D` |
| `--primary-contrast` | Text on primary | `#FFFFFF` |
| `--primary-50` to `--primary-950` | Full color scale | 11 shades |
| `--primary-rgb` | RGB for opacity | `47, 82, 51` |

### 2. Secondary Color (Full Scale)

Same structure as primary:
- `--secondary`, `--secondary-light`, `--secondary-dark`, `--secondary-contrast`
- `--secondary-50` to `--secondary-950`
- `--secondary-rgb`

### 3. Background Colors

| Variable | Purpose | Default |
|----------|---------|---------|
| `--bg-default` | Page background | `#FAFBFC` |
| `--bg-paper` | Card/panel background | `#FFFFFF` |
| `--bg-subtle` | Subtle sections | `#F2F4F6` |
| `--bg-dark` | Dark mode/footer | `#1A331D` |
| `--bg-hero` | Hero section | `#2F5233` |
| `--bg-surface` | Surface layer | `#FFFFFF` |
| `--bg-surface-elevated` | Elevated surface | `#FEFEFE` |
| `--bg-surface-overlay` | Modal overlay | `rgba(0,0,0,0.5)` |

### 4. Text Colors

| Variable | Purpose |
|----------|---------|
| `--text-primary` | Main body text |
| `--text-main` | Alias for primary |
| `--text-secondary` | Secondary text |
| `--text-muted` | Muted/hint text |
| `--text-invert` | Text on dark bg |
| `--text-link` | Link color |
| `--text-link-hover` | Link hover |
| `--text-disabled` | Disabled state |

### 5. Border Colors

| Variable | Purpose |
|----------|---------|
| `--border-light` | Subtle borders |
| `--border-default` | Standard borders |
| `--border-color` | Alias for default |
| `--border-dark` | Strong borders |
| `--border-focus` | Focus state |

### 6. Status/Semantic Colors

Each status has main color + background + border:

| Category | Variables |
|----------|-----------|
| Success | `--success`, `--success-bg`, `--status-success`, `--status-success-bg` |
| Warning | `--warning`, `--warning-bg`, `--status-warning`, `--status-warning-bg` |
| Error | `--error`, `--error-bg`, `--status-error`, `--status-error-bg` |
| Info | `--info`, `--info-bg`, `--status-info`, `--status-info-bg` |

### 7. Interactive States

| Variable | Purpose |
|----------|---------|
| `--hover-bg` | Hover background |
| `--active-bg` | Active/pressed |
| `--focus-bg` | Focus background |
| `--focus-ring` | Focus ring color |
| `--disabled-bg` | Disabled state |
| `--selected-bg` | Selected state |

### 8. Form Input Colors

| Variable | Purpose |
|----------|---------|
| `--input-bg` | Input background |
| `--input-border` | Default border |
| `--input-border-hover` | Hover border |
| `--input-border-focus` | Focus border |
| `--input-placeholder` | Placeholder text |
| `--input-ring` | Focus ring |

### 9. Chart Colors

12 chart colors for data visualization:
- `--chart-1` through `--chart-12`

### 10. Accent Colors

Named accent colors for variety:
- `--accent-teal`, `--accent-purple`, `--accent-pink`
- `--accent-orange`, `--accent-cyan`, `--accent-lime`
- `--accent-amber`, `--accent-rose`, `--accent-indigo`
- `--accent-emerald`

### 11. Gradients

| Variable | Purpose |
|----------|---------|
| `--gradient-hero` | Hero section gradient |
| `--gradient-primary` | Primary gradient |
| `--gradient-accent` | Accent gradient |
| `--gradient-dark` | Dark gradient |
| `--gradient-card` | Card gradient |
| `--gradient-to-right` | Directional |
| `--gradient-to-bottom` | Directional |
| `--gradient-radial` | Radial gradient |

### 12. Fonts

| Variable | Purpose |
|----------|---------|
| `--font-heading` | Headings |
| `--font-body` | Body text |
| `--font-mono` | Monospace |

### 13. Typography

| Variable | Purpose |
|----------|---------|
| `--font-size-h1` to `--font-size-small` | Font sizes |
| `--font-weight-h1` to `--font-weight-small` | Font weights |
| `--line-height-h1` to `--line-height-small` | Line heights |

### 14. Border Radius

| Variable | Purpose |
|----------|---------|
| `--radius` | Default radius |
| `--radius-sm` | Small elements |
| `--radius-lg` | Large elements |
| `--radius-xl` | Extra large |
| `--radius-full` | Pill shape (9999px) |

### 15. Shadows

| Variable | Purpose |
|----------|---------|
| `--shadow-sm` | Subtle shadow |
| `--shadow-md` | Medium shadow |
| `--shadow-lg` | Large shadow |
| `--shadow-xl` | Extra large |
| `--shadow-card` | Card shadow (branded) |
| `--shadow-button` | Button shadow (branded) |
| `--shadow-input` | Input shadow |
| `--shadow-dropdown` | Dropdown shadow |

### 16. Spacing

| Variable | Purpose |
|----------|---------|
| `--section-padding` | Section vertical padding |
| `--container-max-width` | Max container width |
| `--card-padding` | Card internal padding |
| `--input-padding` | Input padding |

### 17. Animations

| Variable | Purpose |
|----------|---------|
| `--transition-fast` | Quick transitions |
| `--transition-normal` | Standard transitions |
| `--transition-slow` | Slow transitions |
| `--hover-scale` | Scale on hover |
| `--hover-lift` | Lift on hover |

---

## Provider Setup

### Layout Integration

```tsx
// app/[clinic]/layout.tsx
import { ClinicThemeProvider } from '@/components/clinic-theme-provider'
import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'

interface Props {
  children: React.ReactNode
  params: Promise<{ clinic: string }>
}

export default async function ClinicLayout({ children, params }: Props) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  if (!clinicData) notFound()

  return (
    <html lang="es">
      <body>
        <ClinicThemeProvider theme={clinicData.theme} />
        {children}
      </body>
    </html>
  )
}
```

### How It Works

```tsx
'use client'

export function ClinicThemeProvider({ theme }: { theme: ClinicTheme }): null {
  useEffect(() => {
    const root = document.documentElement

    // Helper to set CSS property if value exists
    const setProp = (name: string, value: string | undefined): void => {
      if (value) root.style.setProperty(name, value)
    }

    // Helper to convert hex to RGB for opacity variants
    const hexToRgb = (hex: string): string | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : null
    }

    // Apply all 17 color categories...
    setProp('--primary', theme.colors.primary.main)
    // ...

  }, [theme])

  return null  // Renders nothing, just injects CSS
}
```

---

## Usage in Components

### Basic Usage

```tsx
// Use CSS variables with Tailwind's arbitrary value syntax
<div className="bg-[var(--bg-paper)] text-[var(--text-primary)]">
  <h1 className="text-[var(--primary)] font-[var(--font-heading)]">
    Welcome
  </h1>
  <p className="text-[var(--text-secondary)]">
    Description text
  </p>
</div>
```

### Buttons

```tsx
<button className="
  bg-[var(--primary)]
  text-[var(--primary-contrast)]
  hover:bg-[var(--primary-dark)]
  shadow-[var(--shadow-button)]
  rounded-[var(--radius)]
  transition-all duration-[var(--transition-fast)]
">
  Click Me
</button>
```

### Cards

```tsx
<div className="
  bg-[var(--bg-paper)]
  border border-[var(--border-light)]
  rounded-[var(--radius-lg)]
  shadow-[var(--shadow-card)]
  p-[var(--card-padding)]
">
  Card content
</div>
```

### Forms

```tsx
<input className="
  bg-[var(--input-bg)]
  border border-[var(--input-border)]
  hover:border-[var(--input-border-hover)]
  focus:border-[var(--input-border-focus)]
  focus:ring-2 focus:ring-[var(--input-ring)]
  rounded-[var(--radius-sm)]
  placeholder:text-[var(--input-placeholder)]
"/>
```

### Status Messages

```tsx
// Success
<div className="bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]">
  Success message
</div>

// Error
<div className="bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error-border)]">
  Error message
</div>
```

### Gradients

```tsx
<section className="bg-[var(--gradient-hero)] text-[var(--text-invert)]">
  Hero Section
</section>

<div className="bg-[var(--gradient-card)]">
  Card with gradient
</div>
```

### Opacity Variants with RGB

```tsx
// Use RGB values for custom opacity
<div className="bg-[rgba(var(--primary-rgb),0.1)]">
  10% primary background
</div>

<div className="bg-[rgba(var(--primary-rgb),0.5)]">
  50% primary background
</div>
```

### Charts

```tsx
import { PieChart, Pie, Cell } from 'recharts'

function Chart({ data }) {
  // Access CSS variables in JS
  const getColor = (index: number) =>
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--chart-${index + 1}`)

  return (
    <PieChart>
      <Pie data={data}>
        {data.map((_, index) => (
          <Cell key={index} fill={getColor(index)} />
        ))}
      </Pie>
    </PieChart>
  )
}
```

---

## Creating a New Clinic Theme

### 1. Copy Template

```bash
cp -r web/.content_data/_TEMPLATE web/.content_data/newclinic
```

### 2. Customize theme.json

Key customization points:

1. **Brand Colors**: Update `primary` and `secondary` with clinic colors
2. **RGB Values**: Generate RGB strings for opacity variants
3. **Gradients**: Update gradients to use new brand colors
4. **Shadows**: Optionally brand shadows with primary color tint
5. **Typography**: Choose appropriate fonts

### 3. Generate Color Scales

Use a tool like [UIColors.app](https://uicolors.app) to generate 50-950 scale from main color.

### 4. Test Contrast

Ensure all text/background combinations meet WCAG AA:
- `--text-primary` on `--bg-default` → 4.5:1 minimum
- `--primary-contrast` on `--primary` → 4.5:1 minimum

---

## Type Definitions

```typescript
interface ClinicTheme {
  colors: ThemeColors
  gradients: ThemeGradients
  fonts: ThemeFonts
  typography?: ThemeTypography
  ui: ThemeUI
  spacing?: ThemeSpacing
  animations?: ThemeAnimations
}

interface ColorScale {
  main: string
  light: string
  dark: string
  contrast: string
  '50'?: string  // through '950'
  rgb?: string   // e.g., "47, 82, 51"
}

interface ThemeColors {
  primary: ColorScale
  secondary: ColorScale
  accent?: string
  background: BackgroundColors
  text: TextColors
  border: BorderColors
  status: StatusColors
  neutral?: NeutralColors
  interactive?: InteractiveColors
  input?: InputColors
  chart?: ChartColors
  accents?: AccentColors
}
```

See `web/lib/types/clinic-config.ts` for complete type definitions.

---

## Current Clinic Themes

| Clinic | Primary Color | Secondary | Style |
|--------|---------------|-----------|-------|
| `adris` | Forest Green (`#2F5233`) | Gold (`#F0C808`) | Natural, earthy |
| `petlife` | Ocean Blue (`#0EA5E9`) | Coral (`#F97316`) | Modern, vibrant |
| `_TEMPLATE` | Blue (`#3B82F6`) | Emerald (`#10B981`) | Default template |

---

## Best Practices

### DO

- Use CSS variables for ALL colors - never hardcode
- Use semantic variables (`--text-primary`) over direct colors (`--primary`)
- Test themes in both light areas and dark sections
- Include RGB variants for opacity use cases
- Maintain WCAG AA contrast ratios

### DON'T

- Hardcode hex colors in components: `bg-blue-500`
- Skip the contrast color in ColorScale
- Forget to update gradients when changing brand colors
- Use `!important` to override theme variables
- Create component-specific colors outside the theme

### Component Pattern

```tsx
// GOOD - Uses theme variables
<button className="bg-[var(--primary)] text-[var(--primary-contrast)]">

// BAD - Hardcoded colors
<button className="bg-green-600 text-white">
```

---

## Fallback System

`globals.css` provides sensible defaults for all CSS variables:

```css
:root {
  --primary: #3B82F6;
  --bg-default: #FAFAFA;
  --text-primary: #18181B;
  /* ... all defaults ... */
}
```

This ensures:
1. No flash of unstyled content before JS loads
2. Graceful fallback if theme.json is missing/invalid
3. SSR works correctly before hydration

---

## Related Documentation

- [Multi-Tenancy Architecture](multi-tenancy.md)
- [JSON-CMS System](../features/json-cms.md)
- [Adding a New Clinic](../development/adding-clinic.md)
- [Context Providers](context-providers.md)
