'use client'

import Image from 'next/image'

interface HeroImageProps {
  src: string
  alt: string
  priority?: boolean
}

/**
 * Optimized hero image component using next/image
 * Replaces CSS background-image for better SEO and performance
 */
export function HeroImage({ src, alt, priority = true }: HeroImageProps) {
  return (
    <div className="absolute inset-0 z-0">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={85}
        sizes="100vw"
        className="scale-105 object-cover object-center"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYI/8QAIhAAAgIBBAEFAAAAAAAAAAAAAQIDBAUABhEhMQcSQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAABAX/xAAaEQACAgMAAAAAAAAAAAAAAAABAgADESEx/9oADAMBAAIRAxEAPwDQm5NwVcHhaOQvQyTNdkWKNIwAQWUkksT4UKScA+dVu3d64rK4ynkqz2I4bkSzRrKoDhWGRyCNGjVWxCSvk4x4Af/Z"
      />
      {/* Gradient overlays for text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
    </div>
  )
}
