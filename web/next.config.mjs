/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
// import withBundleAnalyzer from '@next/bundle-analyzer'; // Temporarily disabled for build
import path from 'path';
import { fileURLToPath } from 'url';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy
 * - Development: Allow 'unsafe-eval' for Next.js Fast Refresh and HMR
 * - Production: Strict CSP without eval
 */
const ContentSecurityPolicy = isDev
  ? `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline' https://unpkg.com;
img-src 'self' blob: data: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com https://assets.ruralmakro.org https://www.4pets.com.py https://www.ruralcenter.com.py https://www.bayer.com https://*.cloudinary.com https://images.unsplash.com https://assets.petco.com https://www.royalcanin.com https://www.bd.com https://http2.mlstatic.com https://m.media-amazon.com https://cdn.shopify.com https://d36tnp772eyphs.cloudfront.net https://www.nexgard.com.ar https://s.turbifycdn.com https://cdn.awsli.com.br https://s7d9.scene7.com https://www.idexx.com https://www.bbraunusa.com https://www.purina.com.py https://purina.com.py https://images.pexels.com https://acdn-us.mitiendanube.com https://adimax.com.br https://agropecuariaelproductor.com https://budgetvetcare.b-cdn.net https://canadapetcare.b-cdn.net https://koniglab.com https://mma.prnewswire.com https://naricitas.pet https://www.alisul.com.br https://www.ciudaddemascotas.com https://www.direct4pet.co.uk https://www.farmina.com https://www.ferplast.com https://www.msd-animal-health-hub.co.uk https://www.nutrire.ind.br https://www.pedigree.com.mx https://www.petshed.com https://www.schroedercia.com.py https://www.vetoquinolusa.com https://placehold.co;
    font-src 'self';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tile.openstreetmap.org https://va.vercel-scripts.com https://*.sentry.io https://*.ingest.sentry.io;
    frame-ancestors 'self';
  `
  : `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline' https://unpkg.com;
    img-src 'self' blob: data: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com https://assets.ruralmakro.org https://www.4pets.com.py https://www.ruralcenter.com.py https://www.bayer.com https://*.cloudinary.com https://images.unsplash.com https://assets.petco.com https://www.royalcanin.com https://www.bd.com https://http2.mlstatic.com https://m.media-amazon.com https://cdn.shopify.com https://d36tnp772eyphs.cloudfront.net https://www.nexgard.com.ar https://s.turbifycdn.com https://cdn.awsli.com.br https://s7d9.scene7.com https://www.idexx.com https://www.bbraunusa.com https://www.purina.com.py https://purina.com.py https://images.pexels.com https://acdn-us.mitiendanube.com https://adimax.com.br https://agropecuariaelproductor.com https://budgetvetcare.b-cdn.net https://canadapetcare.b-cdn.net https://koniglab.com https://mma.prnewswire.com https://naricitas.pet https://www.alisul.com.br https://www.ciudaddemascotas.com https://www.direct4pet.co.uk https://www.farmina.com https://www.ferplast.com https://www.msd-animal-health-hub.co.uk https://www.nutrire.ind.br https://www.pedigree.com.mx https://www.petshed.com https://www.schroedercia.com.py https://www.vetoquinolusa.com https://placehold.co;
    font-src 'self';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tile.openstreetmap.org https://va.vercel-scripts.com https://*.sentry.io https://*.ingest.sentry.io;
    frame-ancestors 'self';
  `;

/**
 * Security headers for all routes
 * ARCH-024: Add Security Headers
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim(),
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
];

const nextConfig = {
  // Enable standalone output for Docker deployments
  // This creates a minimal server.js in .next/standalone
  output: 'standalone',

  // Set workspace root to web directory to fix multiple lockfiles warning
  // This tells Next.js that the web directory is the root for output file tracing
  outputFileTracingRoot: __dirname,


  // TypeScript and ESLint settings
  typescript: {
    // TODO: Fix remaining TS errors properly
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack optimizations for better performance
  webpack: (config, { dev, isServer }) => {
    // Suppress known harmless warnings from dependencies
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      // next-intl dynamic import parsing warnings (harmless)
      {
        module: /next-intl/,
        message: /Parsing of .* for build dependencies failed/,
      },
      // Webpack serialization warnings (harmless)
      {
        message: /Serializing big strings/,
      },
      // OpenTelemetry dynamic require warnings from Sentry instrumentation (harmless)
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency/,
      },
    ];

    // Fix for Windows: use polling for file watching to avoid race conditions
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Only apply optimizations in production builds to avoid dev issues
    if (!dev && !isServer) {
      // Aggressive code splitting to reduce chunk sizes
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          maxSize: 512000, // 512KB max chunk size
          minSize: 100000, // 100KB min chunk size
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate store components into smaller chunks
            storeFilters: {
              test: /[\\/]store[\\/]filters[\\/]/,
              name: 'store-filters',
              chunks: 'all',
              priority: 30,
            },
            storeComponents: {
              test: /[\\/]store[\\/](enhanced-product-card|quick-view-modal)[\\/]/,
              name: 'store-cards',
              chunks: 'all',
              priority: 25,
            },
            // Core vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/](react|react-dom|lucide-react|clsx)[\\/]/,
              name: 'core-vendor',
              chunks: 'all',
              priority: 20,
            },
            // Supabase and other large libs
            dataLibs: {
              test: /[\\/]node_modules[\\/](@supabase|framer-motion|date-fns)[\\/]/,
              name: 'data-libs',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };
    }

    return config;
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'supabase.co',
        pathname: '/storage/v1/object/**',
      },
      // Product image sources from seed data
      {
        protocol: 'https',
        hostname: 'assets.ruralmakro.org',
      },
      {
        protocol: 'https',
        hostname: 'www.4pets.com.py',
      },
      {
        protocol: 'https',
        hostname: 'www.ruralcenter.com.py',
      },
      {
        protocol: 'https',
        hostname: 'www.bayer.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.petco.com',
      },
      {
        protocol: 'https',
        hostname: 'www.royalcanin.com',
      },
      {
        protocol: 'https',
        hostname: 'www.bd.com',
      },
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'd36tnp772eyphs.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'www.nexgard.com.ar',
      },
      // Additional CDNs for product images
      {
        protocol: 'https',
        hostname: 's.turbifycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.awsli.com.br',
      },
      {
        protocol: 'https',
        hostname: 's7d9.scene7.com',
      },
      {
        protocol: 'https',
        hostname: 'www.idexx.com',
      },
      {
        protocol: 'https',
        hostname: 'www.bbraunusa.com',
      },
      {
        protocol: 'https',
        hostname: 'www.purina.com.py',
      },
      {
        protocol: 'https',
        hostname: 'purina.com.py',
      },
      // Additional legitimate product sources
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'acdn-us.mitiendanube.com',
      },
      {
        protocol: 'https',
        hostname: 'adimax.com.br',
      },
      {
        protocol: 'https',
        hostname: 'agropecuariaelproductor.com',
      },
      {
        protocol: 'https',
        hostname: 'budgetvetcare.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'canadapetcare.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'koniglab.com',
      },
      {
        protocol: 'https',
        hostname: 'mma.prnewswire.com',
      },
      {
        protocol: 'https',
        hostname: 'naricitas.pet',
      },
      {
        protocol: 'https',
        hostname: 'www.alisul.com.br',
      },
      {
        protocol: 'https',
        hostname: 'www.ciudaddemascotas.com',
      },
      {
        protocol: 'https',
        hostname: 'www.direct4pet.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'www.farmina.com',
      },
      {
        protocol: 'https',
        hostname: 'www.ferplast.com',
      },
      {
        protocol: 'https',
        hostname: 'www.msd-animal-health-hub.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'www.nutrire.ind.br',
      },
      {
        protocol: 'https',
        hostname: 'www.pedigree.com.mx',
      },
      {
        protocol: 'https',
        hostname: 'www.petshed.com',
      },
      {
        protocol: 'https',
        hostname: 'www.schroedercia.com.py',
      },
      {
        protocol: 'https',
        hostname: 'www.vetoquinolusa.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable lazy loading by default and add quality optimization
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    dangerouslyAllowSVG: false, // Security: prevent SVG XSS attacks
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // SVG CSP if enabled
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Redirects for deprecated routes
  async redirects() {
    return [
      // Redirect old dashboard to admin (if needed in future)
      // {
      //   source: '/:clinic/dashboard',
      //   destination: '/:clinic/admin/dashboard',
      //   permanent: false,
      // },
    ];
  },
};

// Wrap with Sentry for error tracking and source maps
const sentryWebpackPluginOptions = {
  // Sentry organization and project settings
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress source map upload logs in CI
  silent: !process.env.CI,

  // Upload source maps for better error tracking
  widenClientFileUpload: true,

  // Hide source maps from production bundle
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Enable automatic Vercel monitors if deployed on Vercel
  automaticVercelMonitors: true,
};

  // Configure bundle analyzer
  // const bundleAnalyzer = withBundleAnalyzer({
  //   enabled: process.env.ANALYZE === 'true',
  // });
  
  // Only wrap with Sentry if DSN is configured
  let finalConfig = process.env.SENTRY_DSN
    ? withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions)
    : withNextIntl(nextConfig);
  
  export default finalConfig;
