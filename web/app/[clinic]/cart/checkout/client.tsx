'use client'
import { useState, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useCart } from '@/context/cart-context'
import Link from 'next/link'
import {
  ShoppingBag,
  Printer,
  MessageCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileWarning,
} from 'lucide-react'
import type { ClinicConfig } from '@/lib/clinics'
import { PrescriptionUpload } from '@/components/store/prescription-upload'
import { PetSelector, type Pet } from '@/components/store/pet-selector'
import { PrescriptionCheckoutBanner } from '@/components/store/prescription-warning'
import { PrintableReceipt } from '@/components/store/printable-receipt'
import { ErrorBoundary } from '@/components/error/error-boundary'
import { PaymentWrapper } from '@/components/payments/PaymentWrapper'

// TICKET-BIZ-003: Proper checkout with stock validation
// FEAT-013: Prescription verification with pet selection

interface StockError {
  id: string
  name: string
  requested: number
  available: number
}

interface CheckoutResult {
  success: boolean
  invoice?: {
    id: string
    invoice_number: string
    total: number
  }
  paymentIntent?: {
    id: string
    clientSecret: string
    provider: string
  }
  error?: string
  stockErrors?: StockError[]
}

interface CheckoutClientProps {
  readonly config: ClinicConfig
}

export default function CheckoutClient({ config }: CheckoutClientProps) {
  const { clinic } = useParams() as { clinic: string }
  const t = useTranslations('checkout')
  const tc = useTranslations('common')
  const { user, loading } = useAuthRedirect()
  const { items, total, clearCart, discount } = useCart()
  const labels = config.ui_labels?.checkout || {}
  const currency = config.settings?.currency || 'PYG'
  const whatsappNumber = config.contact?.whatsapp_number
  // BUG-015: Tax rate from config, default 10% (IVA Paraguay)
  const taxRate = config.settings?.tax_rate ?? 0.1
  const taxName = config.settings?.tax_name ?? 'IVA'

  const [isProcessing, setIsProcessing] = useState(false)
  // BUG-014: Ref for immediate double-click prevention (before React state update)
  const isSubmittingRef = useRef(false)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  // Store items at checkout time for receipt printing (cart gets cleared)
  const [checkoutItems, setCheckoutItems] = useState<typeof items | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [stockErrors, setStockErrors] = useState<StockError[]>([])
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false)

  // Prescription tracking: map of item.id -> prescription file URL
  const [prescriptions, setPrescriptions] = useState<Record<string, string>>({})

  // FEAT-013: Pet selection for prescription products
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [selectedPetName, setSelectedPetName] = useState<string | null>(null)

  // Handle pet selection - track both ID and name for receipt
  const handlePetSelect = (petId: string | null, pet?: Pet) => {
    setSelectedPetId(petId)
    setSelectedPetName(pet?.name || null)
  }

  // Items that require prescriptions
  const prescriptionItems = useMemo(
    () => items.filter((item) => item.type === 'product' && item.requires_prescription),
    [items]
  )

  // Check if all prescription items have uploads
  const missingPrescriptions = useMemo(
    () => prescriptionItems.filter((item) => !prescriptions[item.id]),
    [prescriptionItems, prescriptions]
  )

  // FEAT-013: Check if pet is required and selected
  const needsPetSelection = prescriptionItems.length > 0
  const hasPetSelected = !needsPetSelection || !!selectedPetId
  const hasAllPrescriptions = missingPrescriptions.length === 0

  const canCheckout = items.length > 0 && hasAllPrescriptions && hasPetSelected

  const handlePrescriptionUpload = (itemId: string, fileUrl: string) => {
    setPrescriptions((prev) => ({ ...prev, [itemId]: fileUrl }))
  }

  const handlePrescriptionRemove = (itemId: string) => {
    setPrescriptions((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  if (loading) return <div className="p-4">{tc('loading')}</div>
  if (!user) return null

  const handleCheckout = async () => {
    // BUG-014: Immediate blocking before React state update
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    // FEAT-013: Validate pet selection for prescription items
    if (needsPetSelection && !selectedPetId) {
      setCheckoutError(t('errors.petRequired'))
      isSubmittingRef.current = false
      return
    }

    // Validate prescriptions before checkout
    if (missingPrescriptions.length > 0) {
      setCheckoutError(t('errors.prescriptionsRequired'))
      isSubmittingRef.current = false
      return
    }

    setIsProcessing(true)
    setCheckoutError(null)
    setStockErrors([])

    try {
      const response = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            type: item.type,
            quantity: item.quantity,
            requires_prescription: item.requires_prescription,
            prescription_file_url: prescriptions[item.id] || null,
          })),
          clinic,
          // FEAT-013: Include pet_id for prescription verification
          pet_id: needsPetSelection ? selectedPetId : null,
          requires_prescription_review: prescriptionItems.length > 0,
        }),
      })

      const result: CheckoutResult = await response.json()

      if (response.ok && result.success) {
        // Save items BEFORE clearing cart (for receipt printing)
        setCheckoutItems([...items])
        setCheckoutResult(result)
        clearCart()
        
        // If no payment intent (e.g. cash/mock), confirm immediately
        if (!result.paymentIntent) {
          setIsPaymentConfirmed(true)
        }
      } else {
        setCheckoutError(result.error || t('errors.processingError'))
        if (result.stockErrors) {
          setStockErrors(result.stockErrors)
        }
      }
    } catch (error) {
      console.error('[Checkout] Error processing checkout:', error)
      setCheckoutError(t('errors.connectionError'))
    } finally {
      isSubmittingRef.current = false
      setIsProcessing(false)
    }
  }

  const handlePaymentSuccess = () => {
    setIsPaymentConfirmed(true)
  }

  const handlePaymentCancel = () => {
    // User chose to pay later, show success state anyway since invoice is created
    setIsPaymentConfirmed(true)
  }

  const handlePrint = () => {
    globalThis?.print?.()
  }

  const generateWhatsAppLink = (invoiceNumber?: string) => {
    if (!whatsappNumber) return '#'

    let message = invoiceNumber
      ? t('whatsapp.withOrder', { clinicName: config.name, orderNumber: invoiceNumber })
      : t('whatsapp.newOrder', { clinicName: config.name })

    if (!invoiceNumber) {
      items.forEach((item) => {
        message += `• ${item.quantity}x ${item.name} (${item.type === 'service' ? t('itemType.service') : t('itemType.product')})\n`
      })
    }

    const formattedTotal = new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: currency,
    }).format(total)
    message += `\n*${t('total')}: ${formattedTotal}*\n`
    message += `\n${t('whatsapp.myData')}: ${user.email}`

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  // Payment state - show payment wrapper if we have an intent and payment isn't confirmed yet
  if (checkoutResult?.paymentIntent && !isPaymentConfirmed) {
    return (
      <div className="min-h-screen bg-[var(--bg-default)] p-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
              Pedido Recibido
            </h1>
            <p className="text-[var(--text-secondary)]">
              Su pedido #{checkoutResult.invoice?.invoice_number} ha sido creado.
              Por favor complete el pago a continuación.
            </p>
          </div>

          <PaymentWrapper
            tenantId={clinic}
            amount={checkoutResult.invoice?.total || 0}
            currency={currency}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    )
  }

  // Success state - order completed
  if (checkoutResult?.success && isPaymentConfirmed) {
    // Reconstruct items for receipt (cart was cleared, but we saved the result)
    const successTotal = checkoutResult.invoice?.total || 0
    const successSubtotal = successTotal / (1 + taxRate)

    return (
      <>
        {/* Screen content - hidden when printing */}
        <div className="checkout-screen-content min-h-screen bg-[var(--bg-default)] p-8">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mb-4 text-3xl font-bold text-[var(--text-primary)]">
              {t('success.title')}
            </h1>
            <p className="mb-2 text-[var(--text-secondary)]">
              {t('success.message')}
            </p>
            <p className="mb-6 text-lg font-bold text-[var(--primary)]">
              {t('success.orderNumber')}: {checkoutResult.invoice?.invoice_number}
            </p>

            <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
              <p className="mb-4 text-[var(--text-secondary)]">{t('success.totalToPay')}:</p>
              <p className="text-3xl font-bold text-[var(--primary)]">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
                  checkoutResult.invoice?.total || 0
                )}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Print receipt button */}
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-800 px-6 py-3 font-bold text-white shadow-md transition hover:bg-gray-700"
              >
                <Printer className="h-5 w-5" /> {t('printReceipt')}
              </button>

              {whatsappNumber && (
                <a
                  href={generateWhatsAppLink(checkoutResult.invoice?.invoice_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 font-bold text-white shadow-md transition hover:brightness-110"
                >
                  <MessageCircle className="h-5 w-5" /> {t('success.whatsappButton')}
                </a>
              )}
              <Link
                href={`/${clinic}/store`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition hover:brightness-110"
              >
                {t('success.continueShopping')}
              </Link>
              <Link
                href={`/${clinic}/portal/dashboard`}
                className="text-[var(--text-secondary)] hover:text-[var(--primary)]"
              >
                {t('success.goToPortal')}
              </Link>
            </div>
          </div>
        </div>

        {/* Printable receipt - only visible when printing */}
        <PrintableReceipt
          config={config}
          clinicSlug={clinic}
          items={(checkoutItems || []).map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            type: item.type as 'product' | 'service',
            requires_prescription: item.requires_prescription,
            image_url: item.image_url,
          }))}
          subtotal={successSubtotal}
          taxRate={taxRate}
          taxName={taxName}
          total={successTotal}
          currency={currency}
          invoiceNumber={checkoutResult.invoice?.invoice_number}
          customerEmail={user?.email || undefined}
          petName={selectedPetName || undefined}
          isQuote={false}
        />
      </>
    )
  }

  // Calculate totals for receipt
  const subtotalAmount = total
  const totalWithTax = Math.max(0, total - discount) * (1 + taxRate)

  return (
    <>
      {/* Screen content - hidden when printing */}
      <div className="checkout-screen-content min-h-screen bg-[var(--bg-default)] p-8">
        <h1 className="mb-6 text-3xl font-bold text-[var(--text-primary)]">
          {labels.title || t('title')}
        </h1>

      {/* Error display */}
      {checkoutError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-red-700">{checkoutError}</p>
            {stockErrors.length > 0 && (
              <ul className="mt-2 text-sm text-red-600">
                {stockErrors.map((err) => (
                  <li key={err.id}>
                    {err.name}: {t('stockError', { requested: err.requested, available: err.available })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[var(--text-secondary)]">
          {labels.empty || t('emptyCart')}
        </p>
      ) : (
        <div className="space-y-4">
          {/* FEAT-013: Enhanced prescription section with pet selector */}
          {prescriptionItems.length > 0 && (
            <div className="space-y-4">
              {/* Prescription status banner */}
              <ErrorBoundary>
                <PrescriptionCheckoutBanner
                  itemCount={prescriptionItems.length}
                  hasPetSelected={hasPetSelected}
                  hasAllPrescriptions={hasAllPrescriptions}
                />
              </ErrorBoundary>

              {/* Pet selector for prescription products */}
              <ErrorBoundary>
                <PetSelector
                  selectedPetId={selectedPetId}
                  onSelect={handlePetSelect}
                  clinic={clinic}
                  required={true}
                  label={t('petSelector.label')}
                  helpText={t('petSelector.helpText')}
                />
              </ErrorBoundary>
            </div>
          )}

          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="overflow-hidden rounded-xl bg-white shadow-sm"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {item.image_url ? (
                    <>
                      { }
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    </>
                  ) : (
                    <ShoppingBag className="h-12 w-12 text-[var(--primary)]" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                      {item.requires_prescription && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <FileWarning className="h-3 w-3" />
                          {t('prescription')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {item.type === 'service' ? t('itemType.service') : t('itemType.product')} × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-[var(--primary)]">
                  {new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
                    item.price * item.quantity
                  )}
                </span>
              </div>

              {/* Prescription upload section for items that require it */}
              {item.requires_prescription && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <ErrorBoundary>
                    <PrescriptionUpload
                      clinic={clinic}
                      productId={item.id}
                      initialUrl={prescriptions[item.id]}
                      onUpload={(url) => handlePrescriptionUpload(item.id, url)}
                      onRemove={() => handlePrescriptionRemove(item.id)}
                      compact={false}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          ))}

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{t('subtotal')}</span>
              <span className="font-medium">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
                  total
                )}
              </span>
            </div>
            <div className="mb-4 flex items-center justify-between">
              {/* BUG-015: Tax rate from config */}
              <span className="text-[var(--text-secondary)]">{taxName} ({(taxRate * 100).toFixed(0)}%)</span>
              <span className="font-medium">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
                  total * taxRate
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-xl font-bold text-[var(--text-primary)]">{t('total')}</span>
              <span className="text-xl font-bold text-[var(--primary)]">
                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
                  Math.max(0, total - discount) * (1 + taxRate)
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              onClick={handleCheckout}
              disabled={isProcessing || !canCheckout}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> {tc('processing')}
                </>
              ) : needsPetSelection && !selectedPetId ? (
                <>
                  <FileWarning className="h-5 w-5" /> {t('selectPet')}
                </>
              ) : missingPrescriptions.length > 0 ? (
                <>
                  <FileWarning className="h-5 w-5" /> {t('missingPrescriptions', { count: missingPrescriptions.length })}
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" /> {t('confirmOrder')}
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-200 px-4 py-3 font-bold text-gray-800 transition hover:bg-gray-300"
            >
              <Printer className="h-5 w-5" /> {labels.print_btn || t('print')}
            </button>
          </div>
        </div>
      )}
        <Link href={`/${clinic}/cart`} className="mt-6 inline-block text-blue-600 hover:underline">
          {labels.back_cart || t('backToCart')}
        </Link>
      </div>

      {/* Printable receipt - only visible when printing (Cotización) */}
      <PrintableReceipt
        config={config}
        clinicSlug={clinic}
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          type: item.type as 'product' | 'service',
          requires_prescription: item.requires_prescription,
          image_url: item.image_url,
        }))}
        subtotal={subtotalAmount}
        taxRate={taxRate}
        taxName={taxName}
        total={totalWithTax}
        currency={currency}
        customerEmail={user?.email || undefined}
        petName={selectedPetName || undefined}
        isQuote={true}
      />
    </>
  )
}
