'use client'

/**
 * Client-side Stripe loader
 *
 * Provides a singleton Stripe.js instance for use in React components.
 * Used with @stripe/react-stripe-js for Elements integration.
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get or create the Stripe instance.
 * Uses singleton pattern to avoid multiple Stripe loads.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

/**
 * Stripe Elements appearance options
 * Themed to match the clinic branding
 */
export const stripeElementsAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: 'var(--primary)',
    colorBackground: 'var(--bg-paper)',
    colorText: 'var(--text-primary)',
    colorDanger: '#ef4444',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    spacingUnit: '4px',
    borderRadius: '12px',
  },
  rules: {
    '.Input': {
      border: '1px solid var(--border)',
      boxShadow: 'none',
      padding: '12px',
    },
    '.Input:focus': {
      border: '1px solid var(--primary)',
      boxShadow: '0 0 0 1px var(--primary)',
    },
    '.Input--invalid': {
      border: '1px solid #ef4444',
    },
    '.Label': {
      fontWeight: '500',
      marginBottom: '6px',
    },
  },
}

/**
 * Stripe Elements options for card setup
 */
export const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: 'var(--text-primary)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      '::placeholder': {
        color: 'var(--text-muted)',
      },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
}
