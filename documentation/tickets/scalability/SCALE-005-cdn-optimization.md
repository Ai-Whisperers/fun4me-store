# SCALE-005: CDN & Static Asset Optimization

## Priority: P3
## Category: Scalability
## Status: Not Started
## Epic: [EPIC-14: Load Testing & Scalability](../epics/EPIC-14-load-testing-scalability.md)

## Description
Optimize static asset delivery through CDN configuration, image optimization, and bundle size reduction.

## Current State
- Vercel Edge Network in use
- Images served from Supabase Storage
- No explicit image optimization
- Bundle size not monitored

## Proposed Solution

### Image Optimization
```typescript
// next.config.ts
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
};
```

### Optimized Image Component
```tsx
// components/ui/optimized-image.tsx
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  priority = false,
  className
}: OptimizedImageProps) {
  // Transform Supabase URLs for optimization
  const optimizedSrc = src.includes('supabase.co')
    ? `${src}?width=${width}&quality=80`
    : src;

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      className={className}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    />
  );
}
```

### Bundle Analysis
```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "bundle-check": "bundlewatch"
  },
  "bundlewatch": {
    "files": [
      {
        "path": ".next/static/chunks/pages/**/*.js",
        "maxSize": "200kB"
      },
      {
        "path": ".next/static/chunks/main-*.js",
        "maxSize": "100kB"
      }
    ]
  }
}
```

### Dynamic Imports
```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

// Before: Always loaded
import { HeavyChart } from '@/components/charts/heavy-chart';

// After: Loaded on demand
const HeavyChart = dynamic(
  () => import('@/components/charts/heavy-chart').then(mod => mod.HeavyChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

// Route-based code splitting (automatic in Next.js App Router)
// Each page is automatically a separate chunk
```

### Static Asset Headers
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache static assets aggressively
  if (request.nextUrl.pathname.match(/\.(js|css|woff2?|png|jpg|svg)$/)) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  }

  return response;
}
```

### Preconnect & Prefetch
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://xxx.supabase.co" />
        <link rel="dns-prefetch" href="https://xxx.supabase.co" />

        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Implementation Steps
1. Configure Next.js Image optimization
2. Implement optimized image component
3. Set up bundle analysis in CI
4. Add dynamic imports for heavy components
5. Configure static asset caching headers
6. Add preconnect hints
7. Monitor Core Web Vitals

## Acceptance Criteria
- [ ] Images optimized (WebP/AVIF)
- [ ] Bundle size < 200kB per route
- [ ] Lighthouse Performance > 90
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] FID < 100ms

## Bundle Size Targets
| Chunk | Target | Current |
|-------|--------|---------|
| Main bundle | < 100kB | TBD |
| Per-page chunks | < 50kB | TBD |
| Shared chunks | < 150kB | TBD |
| Total initial | < 300kB | TBD |

## Related Files
- `next.config.ts` - Next.js configuration
- `components/ui/` - Image components
- `app/layout.tsx` - Root layout
- `middleware.ts` - Headers middleware

## Estimated Effort
- 8 hours
  - Image optimization: 2h
  - Bundle analysis: 2h
  - Dynamic imports: 2h
  - Caching/preconnect: 2h
