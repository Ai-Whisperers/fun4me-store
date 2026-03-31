'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dynamic PDF Component Wrapper
 * 
 * Code-splits @react-pdf/renderer to reduce bundle size
 * 
 * Note: Using `any` for ComponentType because next/dynamic loses type info
 * and @react-pdf/renderer types are complex. This is a known Next.js limitation.
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Loading component for PDF operations
const PDFLoader = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
    <span className="text-sm text-gray-500">Generating PDF...</span>
  </div>
)

// Dynamic imports for PDF components
export const DynamicDocument = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.Document),
  {
    loading: PDFLoader,
    ssr: false,
  }
) as ComponentType<any>

export const DynamicPage = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.Page),
  { ssr: false }
) as ComponentType<any>

export const DynamicText = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.Text),
  { ssr: false }
) as ComponentType<any>

export const DynamicView = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.View),
  { ssr: false }
) as ComponentType<any>

export const DynamicImage = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.Image),
  { ssr: false }
) as ComponentType<any>

export const DynamicPDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  {
    loading: PDFLoader,
    ssr: false,
  }
) as ComponentType<any>

export const DynamicPDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  {
    loading: PDFLoader,
    ssr: false,
  }
) as ComponentType<any>

// Dynamic utility functions (these are not components, so don't use next/dynamic)
export const getDynamicPdf = async () => {
  const mod = await import('@react-pdf/renderer')
  return mod.pdf
}

export const getDynamicStyleSheet = async () => {
  const mod = await import('@react-pdf/renderer')
  return mod.StyleSheet
}

export const getDynamicRenderToBuffer = async () => {
  const mod = await import('@react-pdf/renderer')
  return mod.renderToBuffer
}

export const getDynamicRenderToStream = async () => {
  const mod = await import('@react-pdf/renderer')
  return mod.renderToStream
}

/**
 * Hook to dynamically import PDF utilities
 */
export const useDynamicPDF = () => {
  const loadPDFUtils = async () => {
    const { pdf, StyleSheet, renderToBuffer, renderToStream } = await import('@react-pdf/renderer')
    return { pdf, StyleSheet, renderToBuffer, renderToStream }
  }

  return { loadPDFUtils }
}