import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  rating: 'good' | 'needs-improvement' | 'poor'
  description: string
  threshold: { good: number; poor: number }
}

// Mock data - in a real implementation, this would come from your analytics backend
const mockMetrics: PerformanceMetric[] = [
  {
    name: 'Largest Contentful Paint (LCP)',
    value: 1800,
    unit: 'ms',
    rating: 'good',
    description: 'Time until the largest element is rendered',
    threshold: { good: 2500, poor: 4000 },
  },
  {
    name: 'First Input Delay (FID)',
    value: 85,
    unit: 'ms',
    rating: 'good',
    description: 'Time from first user interaction to browser response',
    threshold: { good: 100, poor: 300 },
  },
  {
    name: 'Cumulative Layout Shift (CLS)',
    value: 0.08,
    unit: '',
    rating: 'good',
    description: 'Measure of visual stability during page load',
    threshold: { good: 0.1, poor: 0.25 },
  },
  {
    name: 'Time to First Byte (TTFB)',
    value: 650,
    unit: 'ms',
    rating: 'good',
    description: 'Time from request start to first byte received',
    threshold: { good: 800, poor: 1800 },
  },
]

function getRatingIcon(rating: string) {
  switch (rating) {
    case 'good':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'poor':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-yellow-500" />
  }
}

function getRatingBadge(rating: string) {
  const variants = {
    good: 'bg-green-100 text-green-800 hover:bg-green-100',
    'needs-improvement': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    poor: 'bg-red-100 text-red-800 hover:bg-red-100',
  } as const

  return (
    <Badge variant="secondary" className={variants[rating as keyof typeof variants]}>
      {rating === 'needs-improvement' ? 'Needs Improvement' : rating}
    </Badge>
  )
}

async function PerformanceMetrics() {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {mockMetrics.map((metric) => (
        <Card key={metric.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
            {getRatingIcon(metric.rating)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metric.value}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {metric.unit}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              {getRatingBadge(metric.rating)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Good: &lt; {metric.threshold.good}
              {metric.unit}, Poor: &gt; {metric.threshold.poor}
              {metric.unit}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PerformanceMetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function PerformancePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance</h2>
          <p className="text-muted-foreground">
            Monitor your application&apos;s Core Web Vitals and performance metrics
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <Suspense fallback={<PerformanceMetricsSkeleton />}>
          <PerformanceMetrics />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>About Core Web Vitals</CardTitle>
            <CardDescription>
              Understanding what these metrics mean and how to improve them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">What are Core Web Vitals?</h4>
                <p className="text-sm text-muted-foreground">
                  Core Web Vitals are a set of real-world, user-centered metrics that quantify
                  key aspects of the user experience. They measure loading performance, visual
                  stability, and interactivity.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Why do they matter?</h4>
                <p className="text-sm text-muted-foreground">
                  Google uses Core Web Vitals as ranking factors for search results. Better
                  performance leads to higher search rankings, improved user experience, and
                  increased conversion rates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Health check and system information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">API Health: Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">Database: Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">Monitoring: Active</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Last updated: {new Date().toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}