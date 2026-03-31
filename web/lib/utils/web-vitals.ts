import { onCLS } from 'web-vitals/onCLS.js'
import { onFCP } from 'web-vitals/onFCP.js'  
import { onLCP } from 'web-vitals/onLCP.js'
import { onTTFB } from 'web-vitals/onTTFB.js'
import { onINP } from 'web-vitals/onINP.js'
import * as Sentry from '@sentry/nextjs'

interface VitalsMetric {
  name: string
  value: number
  id: string
  navigationType?: string
  rating?: 'good' | 'needs-improvement' | 'poor'
}

/**
 * Send Web Vitals metrics to Sentry for performance monitoring
 * This captures Core Web Vitals and other important performance metrics
 */
function sendToSentry(metric: VitalsMetric) {
  // Add the metric to Sentry as a custom metric
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: `${metric.name}: ${metric.value}`,
    level: 'info',
    data: metric,
  })

  // Set as Sentry tag for filtering and analysis
  Sentry.setTag(`webvital.${metric.name.toLowerCase()}`, metric.value)
  
  // Send as custom measurement to Sentry
  Sentry.setMeasurement(metric.name, metric.value, 'millisecond')
}

/**
 * Send Web Vitals to analytics endpoint
 * This allows for custom analytics and dashboard creation
 */
async function sendToAnalytics(metric: VitalsMetric) {
  try {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      rating: metric.rating,
    })

    // Use navigator.sendBeacon for reliability, fallback to fetch
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon('/api/analytics/web-vitals', body)
    } else {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {
        // Silently fail - analytics shouldn't break user experience
      })
    }
  } catch (error) {
    // Silently fail - analytics shouldn't break user experience
    console.warn('Failed to send web vitals to analytics:', error)
  }
}

function handleMetric(metric: VitalsMetric) {
  // Send to Sentry for error monitoring and performance tracking
  sendToSentry(metric)
  
  // Send to custom analytics endpoint
  sendToAnalytics(metric)
}

/**
 * Initialize Web Vitals collection
 * Call this in your app layout or _app file
 */
export function initWebVitals() {
  try {
    // Core Web Vitals (web-vitals v4 uses onXXX instead of getXXX)
    onCLS(handleMetric) // Cumulative Layout Shift
    onLCP(handleMetric) // Largest Contentful Paint
    // Note: FID removed in web-vitals v4, replaced by INP
    
    // Other important metrics
    onFCP(handleMetric) // First Contentful Paint
    onTTFB(handleMetric) // Time to First Byte
    
    // INP is the successor to FID
    onINP(handleMetric) // Interaction to Next Paint
  } catch (error) {
    // Silently fail if web-vitals library has issues
    console.warn('Failed to initialize web vitals:', error)
  }
}

/**
 * Get performance rating based on Core Web Vitals thresholds
 */
export function getVitalsRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (name) {
    case 'CLS':
      if (value <= 0.1) return 'good'
      if (value <= 0.25) return 'needs-improvement'
      return 'poor'
    
    case 'FID':
    case 'INP':
      if (value <= 100) return 'good'
      if (value <= 300) return 'needs-improvement'
      return 'poor'
    
    case 'LCP':
      if (value <= 2500) return 'good'
      if (value <= 4000) return 'needs-improvement'
      return 'poor'
    
    case 'FCP':
      if (value <= 1800) return 'good'
      if (value <= 3000) return 'needs-improvement'
      return 'poor'
    
    case 'TTFB':
      if (value <= 800) return 'good'
      if (value <= 1800) return 'needs-improvement'
      return 'poor'
    
    default:
      return 'good' // Unknown metric, assume good
  }
}