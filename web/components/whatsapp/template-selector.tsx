'use client'

import { useState, useEffect } from 'react'
import * as Icons from 'lucide-react'
import { templateCategoryConfig, type WhatsAppTemplate } from '@/lib/types/whatsapp'
import { useToast } from '@/components/ui/Toast'

interface TemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: WhatsAppTemplate, variables: Record<string, string>) => void
  templates: WhatsAppTemplate[]
  clientName?: string
  petName?: string
}

export function TemplateSelector({
  isOpen,
  onClose,
  onSelect,
  templates,
  clientName,
  petName,
}: TemplateSelectorProps) {
  const { showToast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Pre-fill common variables
  useEffect(() => {
    if (selectedTemplate) {
      const prefilledVars: Record<string, string> = {}
      selectedTemplate.variables.forEach((varName) => {
        if (varName === 'cliente' && clientName) {
          prefilledVars[varName] = clientName
        } else if (varName === 'mascota' && petName) {
          prefilledVars[varName] = petName
        } else {
          prefilledVars[varName] = ''
        }
      })
      setVariables(prefilledVars)
    }
  }, [selectedTemplate, clientName, petName])

  if (!isOpen) return null

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getPreviewContent = (template: WhatsAppTemplate): string => {
    let content = template.content
    template.variables.forEach((varName) => {
      const value = variables[varName] || `{{${varName}}}`
      content = content.replace(new RegExp(`{{${varName}}}`, 'g'), value)
    })
    return content
  }

  const handleConfirm = () => {
    if (!selectedTemplate) return

    // Check all variables are filled
    const missingVars = selectedTemplate.variables.filter((v) => !variables[v]?.trim())
    if (missingVars.length > 0) {
      showToast({ title: `Completa las variables: ${missingVars.join(', ')}`, variant: 'warning' })
      return
    }

    onSelect(selectedTemplate, variables)
    setSelectedTemplate(null)
    setVariables({})
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-h-[80vh] sm:max-w-2xl sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {selectedTemplate ? 'Configurar Plantilla' : 'Seleccionar Plantilla'}
          </h2>
          <button
            onClick={selectedTemplate ? () => setSelectedTemplate(null) : onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-gray-100"
          >
            {selectedTemplate ? (
              <Icons.ArrowLeft className="h-5 w-5" />
            ) : (
              <Icons.X className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile: Show either list OR preview */}
        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          {/* Filters - only show when viewing list */}
          {!selectedTemplate && (
            <div className="space-y-3 border-b border-gray-100 p-3 sm:hidden sm:p-4">
              <div className="relative">
                <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar plantilla..."
                  className="focus:ring-[var(--primary)]/50 w-full rounded-lg border border-gray-200 py-3 pl-9 pr-4 text-base focus:outline-none focus:ring-2"
                />
              </div>

              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`min-h-[40px] whitespace-nowrap rounded-full px-4 py-2 text-sm ${
                    categoryFilter === 'all'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                {Object.entries(templateCategoryConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key)}
                    className={`min-h-[40px] whitespace-nowrap rounded-full px-4 py-2 text-sm ${
                      categoryFilter === key
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Desktop filters */}
          <div className="hidden w-full space-y-3 border-b border-gray-100 p-4 sm:block">
            <div className="relative">
              <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar plantilla..."
                className="focus:ring-[var(--primary)]/50 w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 focus:outline-none focus:ring-2"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                  categoryFilter === 'all'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {Object.entries(templateCategoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                    categoryFilter === key
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
            {/* Template list - hidden on mobile when template selected */}
            <div
              className={`w-full overflow-y-auto border-gray-100 sm:w-1/2 sm:border-r ${
                selectedTemplate ? 'hidden sm:block' : ''
              }`}
            >
              {filteredTemplates.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)]">
                  No se encontraron plantillas
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredTemplates.map((template) => {
                    const categoryConfig = template.category
                      ? templateCategoryConfig[template.category]
                      : templateCategoryConfig.general
                    const isSelected = selectedTemplate?.id === template.id

                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`min-h-[60px] w-full p-4 text-left hover:bg-gray-50 ${
                          isSelected ? 'bg-[var(--primary)]/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`${categoryConfig.color} mt-0.5`}>
                            {categoryConfig.icon === 'Calendar' && (
                              <Icons.Calendar className="h-5 w-5" />
                            )}
                            {categoryConfig.icon === 'Syringe' && (
                              <Icons.Syringe className="h-5 w-5" />
                            )}
                            {categoryConfig.icon === 'MessageCircle' && (
                              <Icons.MessageCircle className="h-5 w-5" />
                            )}
                            {categoryConfig.icon === 'Megaphone' && (
                              <Icons.Megaphone className="h-5 w-5" />
                            )}
                            {categoryConfig.icon === 'RefreshCw' && (
                              <Icons.RefreshCw className="h-5 w-5" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[var(--text-primary)]">
                              {template.name}
                            </p>
                            <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">
                              {template.content}
                            </p>
                          </div>
                          <Icons.ChevronRight className="h-5 w-5 text-gray-300 sm:hidden" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Preview and variables - shown on mobile when template selected */}
            <div
              className={`w-full overflow-y-auto p-4 sm:w-1/2 ${
                !selectedTemplate ? 'hidden sm:block' : ''
              }`}
            >
              {selectedTemplate ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[var(--text-primary)]">
                    {selectedTemplate.name}
                  </h3>

                  {/* Variables */}
                  {selectedTemplate.variables.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-[var(--text-secondary)]">Variables</p>
                      {selectedTemplate.variables.map((varName) => (
                        <div key={varName}>
                          <label className="mb-1 block text-sm capitalize text-[var(--text-secondary)]">
                            {varName}
                          </label>
                          <input
                            type="text"
                            value={variables[varName] || ''}
                            onChange={(e) =>
                              setVariables({ ...variables, [varName]: e.target.value })
                            }
                            className="focus:ring-[var(--primary)]/50 w-full rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2"
                            placeholder={`Ingrese ${varName}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                      Vista previa
                    </p>
                    <div className="rounded-lg bg-gray-100 p-4">
                      <p className="whitespace-pre-wrap text-sm">
                        {getPreviewContent(selectedTemplate)}
                      </p>
                    </div>
                  </div>

                  {/* Confirm button */}
                  <button
                    onClick={handleConfirm}
                    className="min-h-[48px] w-full rounded-lg bg-[var(--primary)] py-4 font-medium text-white hover:opacity-90"
                  >
                    Usar plantilla
                  </button>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--text-secondary)]">
                  <p>Selecciona una plantilla</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
