'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  getPaymentProviderConfig, 
  setPaymentProvider,
  updateStripeConfig,
  updateBancardConfig,
  updateTigoMoneyConfig,
  PAYMENT_PROVIDERS 
} from '@/app/actions/payment-configs'
import { useAsyncData } from '@/lib/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, CreditCard, QrCode, Building } from 'lucide-react'

interface PaymentGatewaySettingsProps {
  clinicSlug: string
}

const stripeSchema = z.object({
  enabled: z.boolean(),
  publishableKey: z.string().min(1, 'La clave pública es requerida'),
  webhookSecret: z.string().min(1, 'El secreto webhook es requerido'),
})

const bancardSchema = z.object({
  enabled: z.boolean(),
  publicKey: z.string().min(1, 'La clave pública es requerida'),
  environment: z.enum(['sandbox', 'production']),
})

const tigoMoneySchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().min(1, 'La clave API es requerida'),
  environment: z.enum(['sandbox', 'production']),
})

export function PaymentGatewaySettings({ clinicSlug }: PaymentGatewaySettingsProps) {
  const [activeTab, setActiveTab] = useState('provider')
  const [isSaving, setIsSaving] = useState(false)

  const { data: configResult, isLoading, error } = useAsyncData(
    () => getPaymentProviderConfig(clinicSlug),
    [clinicSlug]
  )

  const providerForm = useForm({
    defaultValues: {
      provider: 'stripe',
    },
  })

  const stripeForm = useForm({
    resolver: zodResolver(stripeSchema),
    defaultValues: {
      enabled: false,
      publishableKey: '',
      webhookSecret: '',
    },
  })

  const bancardForm = useForm({
    resolver: zodResolver(bancardSchema),
    defaultValues: {
      enabled: false,
      publicKey: '',
      environment: 'sandbox' as const,
    },
  })

  const tigoMoneyForm = useForm({
    resolver: zodResolver(tigoMoneySchema),
    defaultValues: {
      enabled: false,
      apiKey: '',
      environment: 'sandbox' as const,
    },
  })

  useEffect(() => {
    if (configResult?.success && configResult.data) {
      providerForm.setValue('provider', configResult.data.provider)
      stripeForm.reset(configResult.data.stripe)
      bancardForm.reset(configResult.data.bancard)
      tigoMoneyForm.reset(configResult.data.tigo_money)
    }
  }, [configResult, providerForm, stripeForm, bancardForm, tigoMoneyForm])

  const handleProviderSave = async (data: { provider: string }) => {
    setIsSaving(true)
    try {
      const result = await setPaymentProvider(clinicSlug, data.provider)
      if (result.success) {
        setIsSaving(false)
      }
    } catch (error) {
      setIsSaving(false)
    }
  }

  const handleStripeSave = async (data: z.infer<typeof stripeSchema>) => {
    setIsSaving(true)
    try {
      const result = await updateStripeConfig(clinicSlug, data)
      if (result.success) {
        setIsSaving(false)
      }
    } catch (error) {
      setIsSaving(false)
    }
  }

  const handleBancardSave = async (data: z.infer<typeof bancardSchema>) => {
    setIsSaving(true)
    try {
      const result = await updateBancardConfig(clinicSlug, data)
      if (result.success) {
        setIsSaving(false)
      }
    } catch (error) {
      setIsSaving(false)
    }
  }

  const handleTigoMoneySave = async (data: z.infer<typeof tigoMoneySchema>) => {
    setIsSaving(true)
    try {
      const result = await updateTigoMoneyConfig(clinicSlug, data)
      if (result.success) {
        setIsSaving(false)
      }
    } catch (error) {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !configResult?.success || !configResult.data) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Error cargando configuración de pago</p>
      </div>
    )
  }

  return (
    <Tabs defaultValue={activeTab} onChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="provider">Proveedor Principal</TabsTrigger>
        <TabsTrigger value="stripe">Stripe</TabsTrigger>
        <TabsTrigger value="bancard">Bancard</TabsTrigger>
        <TabsTrigger value="tigo_money">Tigo Money</TabsTrigger>
      </TabsList>

      <TabsContent value="provider" className="space-y-6">
        <Card className="p-6">
          <form onSubmit={providerForm.handleSubmit(handleProviderSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Proveedor de Pago Principal</Label>
              <Select
                value={providerForm.watch('provider')}
                onValueChange={(value) => providerForm.setValue('provider', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Configuración
            </Button>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="stripe" className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Stripe - Pagos Internacionales
            </h3>
          </div>

          <form onSubmit={stripeForm.handleSubmit(handleStripeSave)} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={stripeForm.watch('enabled')}
                onCheckedChange={(checked) => stripeForm.setValue('enabled', checked)}
              />
              <Label>Activar pagos con Stripe</Label>
            </div>

            {stripeForm.watch('enabled') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stripe-publishable-key">Clave Pública</Label>
                  <Input
                    id="stripe-publishable-key"
                    type="password"
                    placeholder="pk_test_..."
                    {...stripeForm.register('publishableKey')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook-secret">Secreto Webhook</Label>
                  <Input
                    id="stripe-webhook-secret"
                    type="password"
                    placeholder="whsec_..."
                    {...stripeForm.register('webhookSecret')}
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Configuración
            </Button>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="bancard" className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Bancard - Tarjetas de Crédito/Débito
            </h3>
          </div>

          <form onSubmit={bancardForm.handleSubmit(handleBancardSave)} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={bancardForm.watch('enabled')}
                onCheckedChange={(checked) => bancardForm.setValue('enabled', checked)}
              />
              <Label>Activar pagos con Bancard</Label>
            </div>

            {bancardForm.watch('enabled') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bancard-public-key">Clave Pública</Label>
                  <Input
                    id="bancard-public-key"
                    type="password"
                    placeholder="Clave pública de Bancard"
                    {...bancardForm.register('publicKey')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bancard-environment">Ambiente</Label>
                  <Select
                    value={bancardForm.watch('environment')}
                    onValueChange={(value) => bancardForm.setValue('environment', value as 'sandbox' | 'production')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                      <SelectItem value="production">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Configuración
            </Button>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="tigo_money" className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <QrCode className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Tigo Money - Pagos con QR
            </h3>
          </div>

          <form onSubmit={tigoMoneyForm.handleSubmit(handleTigoMoneySave)} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={tigoMoneyForm.watch('enabled')}
                onCheckedChange={(checked) => tigoMoneyForm.setValue('enabled', checked)}
              />
              <Label>Activar pagos con Tigo Money</Label>
            </div>

            {tigoMoneyForm.watch('enabled') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tigo-money-api-key">Clave API</Label>
                  <Input
                    id="tigo-money-api-key"
                    type="password"
                    placeholder="Clave API de Tigo Money"
                    {...tigoMoneyForm.register('apiKey')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tigo-money-environment">Ambiente</Label>
                  <Select
                    value={tigoMoneyForm.watch('environment')}
                    onValueChange={(value) => tigoMoneyForm.setValue('environment', value as 'sandbox' | 'production')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                      <SelectItem value="production">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Configuración
            </Button>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
