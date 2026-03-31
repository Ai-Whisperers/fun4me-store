'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Users, Crown, AlertCircle, Building2, Heart, Tag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ClientSelector } from './client-selector'
import { MessageComposer } from './message-composer'
import { MessageReview } from './message-review'
import { SendProgress } from './send-progress'
import type {
  Client,
  MessageChannel,
  BulkMessagingStep,
  FilterOption,
  MessageTemplate,
  SendResult,
} from './types'

interface BulkMessagingProps {
  clinic: string
  isOpen: boolean
  onClose: () => void
}

const FILTER_CONFIGS: Omit<FilterOption, 'label'>[] = [
  { id: 'all', icon: Users, color: 'bg-blue-100 text-blue-700' },
  { id: 'vip', icon: Crown, color: 'bg-amber-100 text-amber-700' },
  { id: 'recent', icon: Tag, color: 'bg-green-100 text-green-700' },
  { id: 'inactive', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
  { id: 'criadero', icon: Building2, color: 'bg-purple-100 text-purple-700' },
  { id: 'rescate', icon: Heart, color: 'bg-pink-100 text-pink-700' },
]

const TEMPLATE_IDS = ['reminder', 'promo', 'checkup', 'custom'] as const

/**
 * Bulk Messaging Modal
 *
 * A multi-step wizard for sending bulk messages to clients via WhatsApp, Email, or SMS.
 * Split into smaller components for maintainability:
 * - ClientSelector: Step 1 - Select recipients
 * - MessageComposer: Step 2 - Compose message
 * - MessageReview: Step 3 - Review before sending
 * - SendProgress: Step 4 - Sending progress and results
 */
export function BulkMessaging({ clinic, isOpen, onClose }: BulkMessagingProps): React.ReactElement {
  const t = useTranslations('dashboard.bulkMessaging')
  const tCommon = useTranslations('common')

  // State
  const [step, setStep] = useState<BulkMessagingStep>('select')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [channel, setChannel] = useState<MessageChannel>('whatsapp')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sendProgress, setSendProgress] = useState(0)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)

  // Build filter options with labels
  const filterOptions: FilterOption[] = useMemo(() =>
    FILTER_CONFIGS.map((config) => ({
      ...config,
      label: t(`filters.${config.id}`),
    })), [t])

  // Build message templates with labels
  const messageTemplates: MessageTemplate[] = useMemo(() =>
    TEMPLATE_IDS.map((id) => ({
      id,
      title: t(`templates.${id}`),
      message: id === 'custom' ? '' : t(`templateMessages.${id}`),
    })), [t])

  // Fetch clients based on filter
  useEffect(() => {
    if (!isOpen) return

    const fetchClients = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/clients?clinic=${clinic}&filter=${selectedFilter}`)
        if (response.ok) {
          const data = await response.json()
          setClients(data.clients || [])
        } else {
          // Mock data for development
          setClients([
            {
              id: '1',
              full_name: 'Juan Pérez',
              email: 'juan@email.com',
              phone: '+595 981 123456',
              pets_count: 2,
              tags: ['vip'],
            },
            {
              id: '2',
              full_name: 'María García',
              email: 'maria@email.com',
              phone: '+595 982 654321',
              pets_count: 1,
              tags: [],
            },
            {
              id: '3',
              full_name: 'Carlos López',
              email: 'carlos@email.com',
              phone: '+595 983 111222',
              pets_count: 3,
              tags: ['criadero'],
            },
          ])
        }
      } catch (error) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching clients:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchClients()
  }, [clinic, selectedFilter, isOpen])

  // Get filtered clients based on search
  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  )

  // Handlers
  const toggleClient = useCallback((clientId: string): void => {
    setSelectedClients((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }, [])

  const selectAllFiltered = useCallback((): void => {
    setSelectedClients(new Set(filteredClients.map((c) => c.id)))
  }, [filteredClients])

  const clearSelection = useCallback((): void => {
    setSelectedClients(new Set())
  }, [])

  const handleSelectTemplate = useCallback(
    (templateId: string): void => {
      setSelectedTemplate(templateId)
      const template = messageTemplates.find((t) => t.id === templateId)
      if (template && template.id !== 'custom') {
        setMessage(template.message)
      }
    },
    [messageTemplates]
  )

  const handleSend = async (): Promise<void> => {
    setStep('sending')
    const clientIds = Array.from(selectedClients)
    let success = 0
    let failed = 0

    for (let i = 0; i < clientIds.length; i++) {
      try {
        // Simulate sending
        await new Promise((resolve) => setTimeout(resolve, 300))
        success++
      } catch (_error: unknown) {
        failed++
      }
      setSendProgress(Math.round(((i + 1) / clientIds.length) * 100))
    }

    setSendResult({ success, failed })
  }

  const resetAndClose = useCallback((): void => {
    setStep('select')
    setSelectedClients(new Set())
    setMessage('')
    setSelectedTemplate(null)
    setSendProgress(0)
    setSendResult(null)
    onClose()
  }, [onClose])

  // Step descriptions for header
  const stepDescriptions: Record<BulkMessagingStep, string> = useMemo(() => ({
    select: t('steps.select'),
    compose: t('steps.compose'),
    review: t('steps.review'),
    sending: t('steps.sending'),
  }), [t])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl bg-white md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-[700px] md:-translate-x-1/2 md:-translate-y-1/2"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,var(--primary))] px-6 py-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-white" />
                <div>
                  <h2 className="text-lg font-bold text-white">{t('title')}</h2>
                  <p className="text-sm text-white/70">{stepDescriptions[step]}</p>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30"
                aria-label={tCommon('close')}
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Step Content */}
            {step === 'select' && (
              <ClientSelector
                clients={filteredClients}
                selectedClients={selectedClients}
                isLoading={isLoading}
                searchQuery={searchQuery}
                selectedFilter={selectedFilter}
                filterOptions={filterOptions}
                labels={{
                  search_placeholder: t('searchPlaceholder'),
                  selected_count: t('selectedCount', { count: selectedClients.size, total: filteredClients.length }),
                  select_all: t('selectAll'),
                  clear: t('clear'),
                  continue_with: t('continueWith', { count: selectedClients.size }),
                }}
                onSearchChange={setSearchQuery}
                onFilterChange={setSelectedFilter}
                onToggleClient={toggleClient}
                onSelectAll={selectAllFiltered}
                onClearSelection={clearSelection}
                onContinue={() => setStep('compose')}
              />
            )}

            {step === 'compose' && (
              <MessageComposer
                channel={channel}
                message={message}
                selectedTemplate={selectedTemplate}
                templates={messageTemplates}
                labels={{
                  channel: t('channel'),
                  channels: {
                    whatsapp: t('channels.whatsapp'),
                    email: t('channels.email'),
                    sms: t('channels.sms'),
                  },
                  template: t('template'),
                  message: t('message'),
                  variables_hint: t('variablesHint'),
                  back: tCommon('back'),
                  review: t('steps.review'),
                }}
                onChannelChange={setChannel}
                onTemplateSelect={handleSelectTemplate}
                onMessageChange={setMessage}
                onBack={() => setStep('select')}
                onContinue={() => setStep('review')}
              />
            )}

            {step === 'review' && (
              <MessageReview
                selectedCount={selectedClients.size}
                channel={channel}
                message={message}
                labels={{
                  client_label: t('clientLabel'),
                  channel_label: t('channelLabel'),
                  message_label: t('messageLabel'),
                  confirm_send: t('confirmSend'),
                  send_warning: t('sendWarning', { count: selectedClients.size }),
                  edit: tCommon('edit'),
                  send: t('send'),
                }}
                onBack={() => setStep('compose')}
                onSend={handleSend}
              />
            )}

            {step === 'sending' && (
              <SendProgress
                progress={sendProgress}
                result={sendResult}
                labels={{
                  sending: t('steps.sending'),
                  completed: t('completed'),
                  sent_count: sendResult ? t('sentCount', { success: sendResult.success }) : '',
                  failed_count: sendResult ? t('failedCount', { failed: sendResult.failed }) : '',
                  close: tCommon('close'),
                }}
                onClose={resetAndClose}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Re-export types for external use
export type { BulkMessagingProps }
export type * from './types'
