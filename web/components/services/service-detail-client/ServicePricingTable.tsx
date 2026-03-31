/**
 * Service Pricing Table Component
 *
 * Interactive pricing table with variant selection and add-to-cart functionality.
 */

'use client'

import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  hasSizeBasedPricing,
  formatPriceGs,
  SIZE_SHORT_LABELS,
  getSizeBadgeColor,
} from '@/lib/utils/pet-size'
import type { Service, ServiceVariant, PetForService, ServiceDetailConfig, CalculatedPrices } from './types'

interface VariantCartStatus {
  petsInCart: string[]
  petNames: string[]
}

interface ServicePricingTableProps {
  service: Service
  config: ServiceDetailConfig
  isLoggedIn: boolean
  selectedPets: PetForService[]
  calculatedPrices: CalculatedPrices
  variantCartStatus: Map<string, VariantCartStatus>
  showPetPrompt: boolean
  alreadyInCartMessage: string | null
  addingVariant: string | null
  justAddedVariant: string | null
  onAddToCart: (variant: ServiceVariant) => void
}

export function ServicePricingTable({
  service,
  config,
  isLoggedIn,
  selectedPets,
  calculatedPrices,
  variantCartStatus,
  showPetPrompt,
  alreadyInCartMessage,
  addingVariant,
  justAddedVariant,
  onAddToCart,
}: ServicePricingTableProps) {
  const t = useTranslations('services')

  // Check if any variant has size-based pricing
  const hasSizeDependentVariants = service.variants?.some((v) =>
    hasSizeBasedPricing(v.size_pricing)
  )

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-gray-100 bg-white shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 p-6">
        <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
          {t('pricingAndVariants')}
        </h2>
        {selectedPets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Icons.PawPrint className="h-4 w-4 text-[var(--primary)]" />
            {selectedPets.map((pet) => (
              <div
                key={pet.id}
                className="bg-[var(--primary)]/10 flex items-center gap-1.5 rounded-full px-3 py-1.5"
              >
                <span className="text-sm font-bold text-[var(--primary)]">{pet.name}</span>
                {hasSizeDependentVariants && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${getSizeBadgeColor(
                      pet.size_category
                    )}`}
                  >
                    {SIZE_SHORT_LABELS[pet.size_category]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pet selection prompt */}
      {showPetPrompt && selectedPets.length === 0 && (
        <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 p-4">
          <Icons.AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">{t('selectPetFirst')}</p>
        </div>
      )}

      {/* Already in cart feedback */}
      {alreadyInCartMessage && (
        <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 p-4">
          <Icons.Info className="h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-sm font-medium text-blue-800">{alreadyInCartMessage}</p>
        </div>
      )}

      {/* Pricing Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[var(--bg-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <tr>
              <th className="px-6 py-4">
                {config.ui_labels?.services?.table_variant || t('variant')}
              </th>
              <th className="px-6 py-4 text-right">
                {config.ui_labels?.services?.table_price || t('price')}
              </th>
              {isLoggedIn && <th className="w-32 px-6 py-4 text-center">{t('action')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {service.variants?.map((variant, idx) => (
              <VariantRow
                key={idx}
                variant={variant}
                priceInfo={calculatedPrices[variant.name]}
                cartStatus={variantCartStatus.get(variant.name)}
                selectedPets={selectedPets}
                isLoggedIn={isLoggedIn}
                isAdding={addingVariant === variant.name}
                justAdded={justAddedVariant === variant.name}
                onAddToCart={onAddToCart}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =============================================================================
// Variant Row Sub-component
// =============================================================================

interface VariantRowProps {
  variant: ServiceVariant
  priceInfo?: CalculatedPrices[string]
  cartStatus?: VariantCartStatus
  selectedPets: PetForService[]
  isLoggedIn: boolean
  isAdding: boolean
  justAdded: boolean
  onAddToCart: (variant: ServiceVariant) => void
}

function VariantRow({
  variant,
  priceInfo,
  cartStatus,
  selectedPets,
  isLoggedIn,
  isAdding,
  justAdded,
  onAddToCart,
}: VariantRowProps) {
  const t = useTranslations('services')
  const variantHasSizePricing = hasSizeBasedPricing(variant.size_pricing)
  const petsAlreadyInCart = cartStatus?.petNames || []

  return (
    <tr className="transition-colors hover:bg-gray-50">
      {/* Variant Info Cell */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          {variant.image && (
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              <img
                src={variant.image}
                alt={variant.name}
                className="h-full w-full object-cover p-1"
              />
            </div>
          )}
          <div>
            <div className="text-lg font-bold leading-tight text-[var(--text-primary)]">
              {variant.name}
            </div>
            {variant.description && (
              <div className="mt-1 text-sm text-[var(--text-muted)]">{variant.description}</div>
            )}
          </div>
        </div>
        {variantHasSizePricing && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <Icons.Calculator className="h-3.5 w-3.5" />
            <span>{t('priceByPetSize')}</span>
          </div>
        )}
        {petsAlreadyInCart.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
            <Icons.CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('alreadyInCart', { names: petsAlreadyInCart.join(', ') })}</span>
          </div>
        )}
      </td>

      {/* Price Cell */}
      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end gap-1">
          {selectedPets.length > 0 && priceInfo ? (
            <>
              {priceInfo.isSizeDependent && priceInfo.petPrices.length > 1 ? (
                <div className="space-y-1">
                  {priceInfo.petPrices.map((petPrice) => (
                    <div key={petPrice.petId} className="flex items-center justify-end gap-2">
                      <span className="text-xs text-[var(--text-muted)]">{petPrice.petName}:</span>
                      <span className="text-sm font-bold text-[var(--primary)]">
                        {formatPriceGs(petPrice.price)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 border-t border-gray-200 pt-1">
                    <span className="inline-block rounded-full bg-[var(--primary)] px-3 py-1 text-sm font-black text-white">
                      {t('total')}: {formatPriceGs(priceInfo.totalPrice)}
                    </span>
                  </div>
                </div>
              ) : priceInfo.petPrices.length === 1 ? (
                <span className="inline-block rounded-full bg-[var(--primary)] px-3 py-1 font-black text-white">
                  {formatPriceGs(priceInfo.petPrices[0].price)}
                </span>
              ) : (
                <span className="inline-block rounded-full bg-[var(--primary)] px-3 py-1 font-black text-white">
                  {formatPriceGs(priceInfo.totalPrice)}
                </span>
              )}
            </>
          ) : (
            <span className="inline-block rounded-full bg-[var(--bg-subtle)] px-3 py-1 font-black text-[var(--primary)]">
              {variant.price_display}
            </span>
          )}
        </div>
      </td>

      {/* Action Cell */}
      {isLoggedIn && (
        <td className="px-6 py-4">
          <div className="flex flex-col items-center gap-2">
            {variant.price_value > 0 ? (
              <button
                type="button"
                onClick={() => onAddToCart(variant)}
                disabled={isAdding || justAdded || selectedPets.length === 0}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  justAdded
                    ? 'bg-green-500 text-white'
                    : selectedPets.length === 0
                      ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                      : 'bg-[var(--primary)] text-white hover:brightness-110'
                } disabled:opacity-70`}
                title={selectedPets.length === 0 ? t('selectPetToAdd') : t('addToCart')}
              >
                {isAdding ? (
                  <>
                    <Icons.Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">{t('adding')}</span>
                  </>
                ) : justAdded ? (
                  <>
                    <Icons.Check className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('added')}</span>
                  </>
                ) : (
                  <>
                    <Icons.ShoppingBag className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {selectedPets.length > 1
                        ? t('addForCount', { count: selectedPets.length })
                        : t('add')}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">{t('priceOnRequest')}</span>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
