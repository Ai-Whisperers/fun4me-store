'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import type { ImageGalleryProps } from './types'

export function ImageGallery({
  images,
  productName,
  inStock,
  hasDiscount,
  discountPercentage,
}: ImageGalleryProps): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextImage = (): void => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = (): void => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="relative w-full bg-gray-50 md:w-1/2">
      <div className="relative aspect-square">
        <Image
          src={images[currentIndex]?.image_url || '/placeholder-product.svg'}
          alt={images[currentIndex]?.alt_text || productName}
          fill
          className="object-contain p-6"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Out of Stock Overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-white">
              <AlertCircle className="h-4 w-4" />
              Sin Stock
            </span>
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && discountPercentage && (
          <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
            -{discountPercentage}%
          </span>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-colors hover:bg-white"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-colors hover:bg-white"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-4">
          {images.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === currentIndex
                  ? 'border-[var(--primary)]'
                  : 'border-transparent hover:border-gray-300'
              }`}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <Image src={img.image_url} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
