'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn, Sparkles, Trophy, Percent } from 'lucide-react'
import type { StoreProductImage } from '@/lib/types/store'

interface Props {
  images: StoreProductImage[]
  productName: string
  hasDiscount?: boolean
  discountPercentage?: number | null
  isNewArrival?: boolean
  isBestSeller?: boolean
}

export default function ProductGallery({
  images,
  productName,
  hasDiscount,
  discountPercentage,
  isNewArrival,
  isBestSeller,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  const currentImage = images[selectedIndex]

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white">
        {/* Badges */}
        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
          {hasDiscount && discountPercentage && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
              <Percent className="h-4 w-4" />-{discountPercentage}%
            </span>
          )}
          {isNewArrival && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4" />
              Nuevo
            </span>
          )}
          {isBestSeller && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white">
              <Trophy className="h-4 w-4" />
              Top Venta
            </span>
          )}
        </div>

        {/* Zoom Button */}
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur transition-colors hover:bg-white"
          aria-label="Ampliar imagen"
        >
          <ZoomIn className="h-5 w-5 text-gray-700" />
        </button>

        {/* Image */}
        <div className="relative h-full w-full">
          <Image
            src={currentImage?.image_url || '/placeholder-product.svg'}
            alt={currentImage?.alt_text || productName}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur transition-colors hover:bg-white"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg backdrop-blur transition-colors hover:bg-white"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                selectedIndex === index
                  ? 'ring-[var(--primary)]/20 border-[var(--primary)] ring-2'
                  : 'hover:border-[var(--primary)]/50 border-[var(--border-default)]'
              }`}
              aria-label={`Ver imagen ${index + 1} de ${productName}`}
              aria-selected={selectedIndex === index}
            >
              <Image
                src={image.image_url}
                alt={image.alt_text || `${productName} - Imagen ${index + 1}`}
                fill
                className="object-contain p-1"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
          >
            <span className="sr-only">Cerrar</span>
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="relative aspect-square w-full max-w-4xl">
            <Image
              src={currentImage?.image_url || '/placeholder-product.svg'}
              alt={currentImage?.alt_text || productName}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Zoom Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="h-8 w-8 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20"
                aria-label="Siguiente imagen"
              >
                <ChevronRight className="h-8 w-8 text-white" />
              </button>
            </>
          )}

          {/* Zoom Thumbnails */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2"
              role="tablist"
              aria-label="Miniaturas de imagenes"
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedIndex(index)
                  }}
                  className={`h-3 w-3 rounded-full transition-all ${
                    selectedIndex === index ? 'scale-125 bg-white' : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-selected={selectedIndex === index}
                  role="tab"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
