'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dynamic Chart Component Wrapper
 * 
 * Code-splits recharts to reduce bundle size
 * 
 * Note: Using `any` for ComponentType because next/dynamic loses type info.
 * This is a known Next.js limitation with dynamic imports.
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Loading component for charts
const ChartLoader = () => (
  <div className="flex justify-center items-center h-64 w-full">
    <div className="animate-pulse bg-gray-200 rounded h-full w-full flex items-center justify-center">
      <span className="text-gray-500">Loading chart...</span>
    </div>
  </div>
)

// Dynamic imports for recharts components
export const DynamicLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    loading: ChartLoader,
    ssr: false,
  }
) as ComponentType<any>

export const DynamicBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  {
    loading: ChartLoader,
    ssr: false,
  }
) as ComponentType<any>

export const DynamicPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  {
    loading: ChartLoader,
    ssr: false,
  }
) as ComponentType<any>

export const DynamicAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  {
    loading: ChartLoader,
    ssr: false,
  }
) as ComponentType<any>

export const DynamicComposedChart = dynamic(
  () => import('recharts').then((mod) => mod.ComposedChart),
  {
    loading: ChartLoader,
    ssr: false,
  }
) as ComponentType<any>

// Chart components
export const DynamicLine = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
) as ComponentType<any>

export const DynamicBar = dynamic(
  () => import('recharts').then((mod) => mod.Bar),
  { ssr: false }
) as ComponentType<any>

export const DynamicArea = dynamic(
  () => import('recharts').then((mod) => mod.Area),
  { ssr: false }
) as ComponentType<any>

export const DynamicPie = dynamic(
  () => import('recharts').then((mod) => mod.Pie),
  { ssr: false }
) as ComponentType<any>

export const DynamicCell = dynamic(
  () => import('recharts').then((mod) => mod.Cell),
  { ssr: false }
) as ComponentType<any>

// Axis components
export const DynamicXAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
) as ComponentType<any>

export const DynamicYAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
) as ComponentType<any>

export const DynamicCartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
) as ComponentType<any>

// Tooltip and Legend
export const DynamicTooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
) as ComponentType<any>

export const DynamicLegend = dynamic(
  () => import('recharts').then((mod) => mod.Legend),
  { ssr: false }
) as ComponentType<any>

export const DynamicResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
) as ComponentType<any>