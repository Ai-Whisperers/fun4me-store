import type { ImageProps } from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
}

/**
 * Get optimized image props for Next.js Image component
 */
export function getOptimizedImageProps(
  props: OptimizedImageProps,
  index?: number
): Partial<ImageProps> {
  const { src, alt, width = 400, height = 400, priority, className } = props

  // First 4 images are priority (above fold)
  const isPriority = priority ?? (index !== undefined && index < 4)

  return {
    src,
    alt,
    width,
    height,
    priority: isPriority,
    loading: isPriority ? 'eager' : 'lazy',
    className,
    // Placeholder blur for better UX
    placeholder: 'blur' as const,
    blurDataURL: generateBlurDataURL(width, height),
  }
}

/**
 * Generate a simple blur placeholder
 */
export function generateBlurDataURL(width: number, height: number): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
    </svg>
  `
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Get responsive image sizes attribute
 */
export function getResponsiveSizes(config: {
  sm?: string
  md?: string
  lg?: string
  default: string
}): string {
  const parts: string[] = []

  if (config.sm) parts.push(`(max-width: 640px) ${config.sm}`)
  if (config.md) parts.push(`(max-width: 768px) ${config.md}`)
  if (config.lg) parts.push(`(max-width: 1024px) ${config.lg}`)
  parts.push(config.default)

  return parts.join(', ')
}
