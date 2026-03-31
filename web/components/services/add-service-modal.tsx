'use client'

import { useState, useMemo } from 'react'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { useTranslations } from 'next-intl'
import { PetSelector } from './pet-selector'
import { useCart } from '@/context/cart-context'
import { ShoppingBag, Loader2, Check, Calculator } from 'lucide-react'
import {
  getServicePriceForSize,
  hasSizeBasedPricing,
  formatPriceGs,
  SIZE_SHORT_LABELS,
  getSizeBadgeColor,
} from '@/lib/utils/pet-size'
import type { Service, ServiceVariant, PetForService } from '@/lib/types/services'

interface AddServiceModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to close the modal */
  onClose: () => void
  /** The service being added */
  service: Service
  /** The specific variant being added */
  variant: ServiceVariant
  /** Optional callback after successfully adding to cart */
  onSuccess?: () => void
}

/**
 * Add Service to Cart Modal
 *
 * Modal that allows users to select a pet and see the calculated price
 * before adding a service to their cart.
 */
export function AddServiceModal({
  isOpen,
  onClose,
  service,
  variant,
  onSuccess,
}: AddServiceModalProps) {
  const { addItem } = useCart()
  const t = useTranslations()
  const [selectedPet, setSelectedPet] = useState<PetForService | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  // Check if this variant has size-based pricing
  const variantHasSizePricing = hasSizeBasedPricing(variant.size_pricing)

  // Calculate price based on selected pet
  const calculatedPrice = useMemo(() => {
    if (!selectedPet || !variantHasSizePricing) return variant.price_value

    // Get the explicit price for this pet's size
    const sizePrice = getServicePriceForSize(variant.size_pricing, selectedPet.size_category)
    return sizePrice ?? variant.price_value
  }, [selectedPet, variant, variantHasSizePricing])

  // Price difference from base
  const priceDifference = calculatedPrice - variant.price_value

  const handleAddToCart = async () => {
    if (!selectedPet) return

    setIsAdding(true)

    // Simulate small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300))

    addItem({
      id: `${service.id}-${selectedPet.id}-${variant.name}`,
      name: `${service.title} - ${variant.name}`,
      price: calculatedPrice,
      type: 'service',
      image_url: service.image,
      description: variant.description || service.summary,
      // Service-specific fields
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      pet_size: selectedPet.size_category,
      service_id: service.id,
      variant_name: variant.name,
      base_price: variant.price_value,
    })

    setIsAdding(false)
    setJustAdded(true)

    // Reset and close after brief success display
    setTimeout(() => {
      setJustAdded(false)
      setSelectedPet(null)
      onClose()
      onSuccess?.()
    }, 1500)
  }

  const handleClose = () => {
    if (!isAdding) {
      setSelectedPet(null)
      setJustAdded(false)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${t('common.add')} ${t('services.service')}`}
      description={`${service.title} - ${variant.name}`}
      size="lg"
      closeOnBackdrop={!isAdding}
    >
      <div className="space-y-6">
        {/* Service Info */}
        <div className="flex items-start gap-4 rounded-xl bg-[var(--bg-subtle)] p-4">
          {service.image && (
            <img
              src={service.image}
              alt={service.title}
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-grow">
            <h3 className="mb-1 font-bold text-[var(--text-primary)]">{service.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{variant.name}</p>
            {variantHasSizePricing && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <Calculator className="h-3.5 w-3.5" />
                <span>Precio varía según tamaño de mascota</span>
              </div>
            )}
          </div>
        </div>

        {/* Pet Selector */}
        <div>
          <PetSelector onSelect={setSelectedPet} selectedPetId={selectedPet?.id} />
        </div>

        {/* Price Calculation */}
        {selectedPet && (
          <div className="from-[var(--primary)]/5 to-[var(--primary)]/10 border-[var(--primary)]/20 rounded-xl border bg-gradient-to-r p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Mascota:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-primary)]">{selectedPet.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSizeBadgeColor(selectedPet.size_category)}`}
                >
                  {SIZE_SHORT_LABELS[selectedPet.size_category]}
                </span>
              </div>
            </div>

            {variantHasSizePricing && (
              <>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Precio base:</span>
                  <span className="text-[var(--text-secondary)]">
                    {formatPriceGs(variant.price_value)}
                  </span>
                </div>
                {priceDifference !== 0 && (
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Ajuste por tamaño:</span>
                    <span className={priceDifference > 0 ? 'text-amber-600' : 'text-green-600'}>
                      {priceDifference > 0 ? '+' : ''}
                      {formatPriceGs(priceDifference)}
                    </span>
                  </div>
                )}
                <div className="bg-[var(--primary)]/20 my-3 h-px" />
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)]">Total:</span>
              <span className="text-2xl font-black text-[var(--primary)]">
                {formatPriceGs(calculatedPrice)}
              </span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <ModalFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={isAdding}
            className="rounded-xl px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!selectedPet || isAdding || justAdded}
            className={`flex items-center gap-2 rounded-xl px-6 py-2 font-bold transition-all ${
              justAdded
                ? 'bg-green-500 text-white'
                : 'bg-[var(--primary)] text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
            }`}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Agregando...
              </>
            ) : justAdded ? (
              <>
                <Check className="h-4 w-4" />
                Agregado
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Agregar al Carrito
              </>
            )}
          </button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
