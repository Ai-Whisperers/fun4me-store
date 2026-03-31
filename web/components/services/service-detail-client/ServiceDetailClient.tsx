/**
 * Service Detail Client Component
 *
 * Main orchestrator for service detail page.
 * Manages state and coordinates between sub-components.
 */

'use client'

import { useState, useMemo } from 'react'
import { useCart } from '@/context/cart-context'
import { useServiceCartStatus } from '@/hooks/use-cart-variant-status'
import {
  getServicePriceForSize,
  hasSizeBasedPricing,
} from '@/lib/utils/pet-size'
import { ServiceHero } from './ServiceHero'
import { ServiceDescription } from './ServiceDescription'
import { ServicePricingTable } from './ServicePricingTable'
import { ServiceSidebar } from './ServiceSidebar'
import type { ServiceDetailClientProps, ServiceVariant, PetForService, CalculatedPrices } from './types'

export function ServiceDetailClient({
  service,
  allServices,
  config,
  clinic,
  isLoggedIn,
}: ServiceDetailClientProps) {
  const { addItem } = useCart()
  const [selectedPets, setSelectedPets] = useState<PetForService[]>([])
  const [addingVariant, setAddingVariant] = useState<string | null>(null)
  const [justAddedVariant, setJustAddedVariant] = useState<string | null>(null)
  const [showPetPrompt, setShowPetPrompt] = useState(false)
  const [alreadyInCartMessage, setAlreadyInCartMessage] = useState<string | null>(null)

  // Track which pets have each variant in cart
  const variantCartStatus = useServiceCartStatus(service.id)

  // Check if any variant has size-based pricing
  const hasSizeDependentVariants = useMemo(
    () => service.variants?.some((v) => hasSizeBasedPricing(v.size_pricing)),
    [service.variants]
  )

  // Get selected pet IDs for the selector
  const selectedPetIds = useMemo(() => selectedPets.map((p) => p.id), [selectedPets])

  // Calculate prices for all variants based on selected pets
  const calculatedPrices = useMemo<CalculatedPrices>(() => {
    if (!service.variants) return {}

    return service.variants.reduce((acc, variant) => {
      const variantHasSizePricing = hasSizeBasedPricing(variant.size_pricing)

      const petPrices = selectedPets.map((pet) => {
        const price = variantHasSizePricing
          ? (getServicePriceForSize(variant.size_pricing, pet.size_category) ?? variant.price_value)
          : variant.price_value
        return { petId: pet.id, petName: pet.name, petSize: pet.size_category, price }
      })

      const totalPrice = petPrices.reduce((sum, p) => sum + p.price, 0)

      acc[variant.name] = {
        basePrice: variant.price_value,
        petPrices,
        totalPrice,
        isSizeDependent: variantHasSizePricing,
      }
      return acc
    }, {} as CalculatedPrices)
  }, [service.variants, selectedPets])

  // Handle add to cart
  const handleAddToCart = async (variant: ServiceVariant) => {
    if (selectedPets.length === 0) {
      setShowPetPrompt(true)
      const petSelector = document.getElementById('pet-selector-card')
      if (petSelector) {
        petSelector.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    const cartStatus = variantCartStatus.get(variant.name)
    const petsAlreadyInCart = new Set(cartStatus?.petsInCart || [])
    const petsToAdd = selectedPets.filter((pet) => !petsAlreadyInCart.has(pet.id))

    if (petsToAdd.length === 0) {
      const petNames = selectedPets.map((p) => p.name).join(', ')
      setAlreadyInCartMessage(
        selectedPets.length === 1
          ? `${petNames} ya tiene este servicio en el carrito`
          : `${petNames} ya tienen este servicio en el carrito`
      )
      setTimeout(() => setAlreadyInCartMessage(null), 3000)
      return
    }

    setAddingVariant(variant.name)
    setShowPetPrompt(false)
    setAlreadyInCartMessage(null)

    await new Promise((resolve) => setTimeout(resolve, 300))

    const priceInfo = calculatedPrices[variant.name]

    for (const pet of petsToAdd) {
      const petPrice = priceInfo?.petPrices.find((p) => p.petId === pet.id)
      const calculatedPrice = petPrice?.price ?? variant.price_value

      addItem({
        id: `${service.id}-${pet.id}-${variant.name}`,
        name: `${service.title} - ${variant.name}`,
        price: calculatedPrice,
        type: 'service',
        image_url: variant.image || service.image,
        description: variant.description || service.summary,
        pet_id: pet.id,
        pet_name: pet.name,
        pet_size: pet.size_category,
        service_id: service.id,
        service_icon: service.icon,
        variant_name: variant.name,
        base_price: variant.price_value,
      })
    }

    if (petsToAdd.length < selectedPets.length) {
      const skippedPets = selectedPets.filter((p) => petsAlreadyInCart.has(p.id))
      const skippedNames = skippedPets.map((p) => p.name).join(', ')
      setAlreadyInCartMessage(`${skippedNames} ya tiene${skippedPets.length > 1 ? 'n' : ''} este servicio`)
      setTimeout(() => setAlreadyInCartMessage(null), 3000)
    }

    setAddingVariant(null)
    setJustAddedVariant(variant.name)
    setTimeout(() => setJustAddedVariant(null), 2000)
  }

  const handlePetSelectionChange = (pets: PetForService[]) => {
    setSelectedPets(pets)
    setShowPetPrompt(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] pb-20">
      <ServiceHero service={service} allServices={allServices} clinic={clinic} />

      <div className="container relative z-20 mx-auto grid items-start gap-8 px-4 py-8 md:px-6 lg:grid-cols-3">
        {/* Left Column: Main Info */}
        <div className="space-y-8 lg:col-span-2">
          <ServiceDescription service={service} config={config} />

          <ServicePricingTable
            service={service}
            config={config}
            isLoggedIn={isLoggedIn}
            selectedPets={selectedPets}
            calculatedPrices={calculatedPrices}
            variantCartStatus={variantCartStatus}
            showPetPrompt={showPetPrompt}
            alreadyInCartMessage={alreadyInCartMessage}
            addingVariant={addingVariant}
            justAddedVariant={justAddedVariant}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Right Column: Sidebar */}
        <ServiceSidebar
          service={service}
          config={config}
          clinic={clinic}
          isLoggedIn={isLoggedIn}
          selectedPetIds={selectedPetIds}
          showPetPrompt={showPetPrompt}
          hasSizeDependentVariants={hasSizeDependentVariants || false}
          onPetSelectionChange={handlePetSelectionChange}
        />
      </div>
    </div>
  )
}
