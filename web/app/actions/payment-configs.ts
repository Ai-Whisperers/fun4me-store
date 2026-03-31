'use server'

import { setSystemConfig, getSystemConfigs } from './system-configs'
import { actionSuccess, actionError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export const PAYMENT_PROVIDERS = [
  { value: 'stripe', label: 'Stripe (Internacional)' },
  { value: 'bancard', label: 'Bancard (Tarjetas)' },
  { value: 'tigo_money', label: 'Tigo Money (QR)' },
] as const

export const getPaymentProviderConfig = async (clinicSlug: string) => {
  const result = await getSystemConfigs(clinicSlug)
  
  if (!result.success) {
    return actionError('No se pudieron cargar las configuraciones de pago.')
  }

  const configs = result.data || []
  const paymentConfig = {
    provider: configs.find(c => c.key === 'payment_provider')?.value || 'stripe',
    stripe: {
      enabled: configs.find(c => c.key === 'stripe_enabled')?.value === 'true',
      publishableKey: configs.find(c => c.key === 'stripe_publishable_key')?.value || '',
      webhookSecret: configs.find(c => c.key === 'stripe_webhook_secret')?.value || '',
    },
    bancard: {
      enabled: configs.find(c => c.key === 'bancard_enabled')?.value === 'true',
      publicKey: configs.find(c => c.key === 'bancard_public_key')?.value || '',
      environment: (configs.find(c => c.key === 'bancard_environment')?.value as 'sandbox' | 'production') || 'sandbox',
    },
    tigo_money: {
      enabled: configs.find(c => c.key === 'tigo_money_enabled')?.value === 'true',
      apiKey: configs.find(c => c.key === 'tigo_money_api_key')?.value || '',
      environment: (configs.find(c => c.key === 'tigo_money_environment')?.value as 'sandbox' | 'production') || 'sandbox',
    },
  }

  return actionSuccess(paymentConfig)
}

export const setPaymentProvider = async (clinicSlug: string, provider: string) => {
  try {
    const result = await setSystemConfig(
      clinicSlug, 
      'payment_provider', 
      provider, 
      `Proveedor de pago seleccionado: ${provider}`
    )
    return result
  } catch (error) {
    logger.error('Failed to set payment provider', {
      error: error instanceof Error ? error : undefined,
      tenant: clinicSlug,
      provider,
    })
    return actionError('No se pudo guardar el proveedor de pago.')
  }
}

export const updateStripeConfig = async (
  clinicSlug: string, 
  config: { enabled: boolean; publishableKey: string; webhookSecret: string }
) => {
  try {
    await Promise.all([
      setSystemConfig(clinicSlug, 'stripe_enabled', config.enabled.toString(), 'Activar pagos con Stripe'),
      setSystemConfig(clinicSlug, 'stripe_publishable_key', config.publishableKey, 'Clave pública de Stripe'),
      setSystemConfig(clinicSlug, 'stripe_webhook_secret', config.webhookSecret, 'Secreto webhook de Stripe'),
    ])
    return actionSuccess()
  } catch (error) {
    logger.error('Failed to update Stripe config', {
      error: error instanceof Error ? error : undefined,
      tenant: clinicSlug,
    })
    return actionError('No se pudo guardar la configuración de Stripe.')
  }
}

export const updateBancardConfig = async (
  clinicSlug: string, 
  config: { enabled: boolean; publicKey: string; environment: 'sandbox' | 'production' }
) => {
  try {
    await Promise.all([
      setSystemConfig(clinicSlug, 'bancard_enabled', config.enabled.toString(), 'Activar pagos con Bancard'),
      setSystemConfig(clinicSlug, 'bancard_public_key', config.publicKey, 'Clave pública de Bancard'),
      setSystemConfig(clinicSlug, 'bancard_environment', config.environment, 'Ambiente de Bancard'),
    ])
    return actionSuccess()
  } catch (error) {
    logger.error('Failed to update Bancard config', {
      error: error instanceof Error ? error : undefined,
      tenant: clinicSlug,
    })
    return actionError('No se pudo guardar la configuración de Bancard.')
  }
}

export const updateTigoMoneyConfig = async (
  clinicSlug: string, 
  config: { enabled: boolean; apiKey: string; environment: 'sandbox' | 'production' }
) => {
  try {
    await Promise.all([
      setSystemConfig(clinicSlug, 'tigo_money_enabled', config.enabled.toString(), 'Activar pagos con Tigo Money'),
      setSystemConfig(clinicSlug, 'tigo_money_api_key', config.apiKey, 'Clave API de Tigo Money'),
      setSystemConfig(clinicSlug, 'tigo_money_environment', config.environment, 'Ambiente de Tigo Money'),
    ])
    return actionSuccess()
  } catch (error) {
    logger.error('Failed to update Tigo Money config', {
      error: error instanceof Error ? error : undefined,
      tenant: clinicSlug,
    })
    return actionError('No se pudo guardar la configuración de Tigo Money.')
  }
}