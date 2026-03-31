'use client'

import { MessageSquare, Mail, Phone } from 'lucide-react'
import type { MessageChannel, MessageTemplate } from './types'

interface MessageComposerProps {
  channel: MessageChannel
  message: string
  selectedTemplate: string | null
  templates: MessageTemplate[]
  labels: {
    channel: string
    channels: { whatsapp: string; email: string; sms: string }
    template: string
    message: string
    variables_hint: string
    back: string
    review: string
  }
  onChannelChange: (channel: MessageChannel) => void
  onTemplateSelect: (templateId: string) => void
  onMessageChange: (message: string) => void
  onBack: () => void
  onContinue: () => void
}

const CHANNEL_CONFIG = [
  { id: 'whatsapp', icon: MessageSquare, color: 'green' },
  { id: 'email', icon: Mail, color: 'blue' },
  { id: 'sms', icon: Phone, color: 'purple' },
] as const

export function MessageComposer({
  channel,
  message,
  selectedTemplate,
  templates,
  labels,
  onChannelChange,
  onTemplateSelect,
  onMessageChange,
  onBack,
  onContinue,
}: MessageComposerProps): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Channel Selection */}
        <ChannelSelector channel={channel} labels={labels} onChannelChange={onChannelChange} />

        {/* Templates */}
        <TemplateSelector
          templates={templates}
          selectedTemplate={selectedTemplate}
          label={labels.template}
          onSelect={onTemplateSelect}
        />

        {/* Message */}
        <MessageInput
          message={message}
          label={labels.message}
          hint={labels.variables_hint}
          onChange={onMessageChange}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium transition-colors hover:bg-gray-100"
        >
          {labels.back}
        </button>
        <button
          onClick={onContinue}
          disabled={!message.trim()}
          className="flex-1 rounded-lg bg-[var(--primary)] py-3 font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {labels.review}
        </button>
      </div>
    </div>
  )
}

/**
 * Channel selection buttons
 */
function ChannelSelector({
  channel,
  labels,
  onChannelChange,
}: {
  channel: MessageChannel
  labels: { channel: string; channels: { whatsapp: string; email: string; sms: string } }
  onChannelChange: (channel: MessageChannel) => void
}): React.ReactElement {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{labels.channel}</label>
      <div className="flex gap-3">
        {CHANNEL_CONFIG.map((ch) => {
          const Icon = ch.icon
          const label = labels.channels[ch.id]
          return (
            <button
              key={ch.id}
              onClick={() => onChannelChange(ch.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 transition-colors ${
                channel === ch.id
                  ? `border-${ch.color}-500 bg-${ch.color}-50 text-${ch.color}-700`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Template selection grid
 */
function TemplateSelector({
  templates,
  selectedTemplate,
  label,
  onSelect,
}: {
  templates: MessageTemplate[]
  selectedTemplate: string | null
  label: string
  onSelect: (templateId: string) => void
}): React.ReactElement {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              selectedTemplate === template.id
                ? 'border-[var(--primary)] bg-[var(--primary)] bg-opacity-5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-sm font-medium text-gray-900">{template.title}</p>
            {template.message && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{template.message}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Message textarea input
 */
function MessageInput({
  message,
  label,
  hint,
  onChange,
}: {
  message: string
  label: string
  hint: string
  onChange: (message: string) => void
}): React.ReactElement {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        value={message}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu mensaje aquí..."
        rows={5}
        className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <p className="mt-2 text-xs text-gray-500">{hint}</p>
    </div>
  )
}
