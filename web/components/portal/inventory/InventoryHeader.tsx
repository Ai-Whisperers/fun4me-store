'use client'

/**
 * Inventory Header Component
 *
 * Header with title, action buttons, and template download dropdown.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Download,
  Package,
  Tag,
  ChevronDown,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react'

interface InventoryHeaderProps {
  clinic: string
  googleSheetUrl: string | null
  onExport: (type: 'template' | 'catalog') => void
}

export function InventoryHeader({
  clinic,
  googleSheetUrl,
  onExport,
}: InventoryHeaderProps): React.ReactElement {
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const templateDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        templateDropdownRef.current &&
        !templateDropdownRef.current.contains(event.target as Node)
      ) {
        setTemplateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex flex-col justify-between gap-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row md:items-center">
      <div>
        <h1 className="mb-2 text-3xl font-black text-gray-900">Gestión de Inventario</h1>
        <p className="text-gray-500">Actualiza tu catálogo y stock mediante planillas Excel.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => (window.location.href = `/${clinic}/portal/inventory/catalog`)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-lg transition hover:bg-blue-700"
        >
          <Package className="h-4 w-4" /> Agregar Productos
        </button>

        <button
          onClick={() => (window.location.href = `/${clinic}/portal/campaigns`)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <Tag className="h-4 w-4 text-[var(--primary)]" /> Ver Promociones
        </button>

        {/* Template Download Dropdown */}
        <div className="relative" ref={templateDropdownRef}>
          <button
            onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 font-bold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <Download className="h-4 w-4" />
            Obtener Plantilla
            <ChevronDown
              className={`h-4 w-4 transition-transform ${templateDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {templateDropdownOpen && (
            <div className="animate-in fade-in slide-in-from-top-2 absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl duration-200">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white">
                <h4 className="text-sm font-bold">Plantilla de Inventario</h4>
                <p className="mt-1 text-xs text-gray-300">Elige tu formato preferido</p>
              </div>

              <div className="p-2">
                {/* Google Sheets Option */}
                {googleSheetUrl &&
                  googleSheetUrl !==
                    'https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE_ID/copy' && (
                    <a
                      href={googleSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setTemplateDropdownOpen(false)}
                      className="group flex cursor-pointer items-start gap-4 rounded-xl p-4 transition-colors hover:bg-green-50"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 transition-transform group-hover:scale-110">
                        <svg
                          className="h-6 w-6 text-green-600"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9.75 15h-3v-3h3v3zm0-4.5h-3v-3h3v3zm0-4.5h-3V6h3v3zm4.5 9h-3v-3h3v3zm0-4.5h-3v-3h3v3zm0-4.5h-3V6h3v3zm4.5 9h-3v-3h3v3zm0-4.5h-3v-3h3v3zm0-4.5h-3V6h3v3z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">Google Sheets</span>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            Recomendado
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Crear una copia en tu Google Drive. Colabora en tiempo real.
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600">
                          <ExternalLink className="h-3 w-3" />
                          Abrir en Google Sheets
                        </div>
                      </div>
                    </a>
                  )}

                {/* Excel Download Option */}
                <button
                  onClick={() => {
                    onExport('template')
                    setTemplateDropdownOpen(false)
                  }}
                  className="group flex w-full items-start gap-4 rounded-xl p-4 text-left transition-colors hover:bg-blue-50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 transition-transform group-hover:scale-110">
                    <FileDown className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Descargar Excel</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                        .xlsx
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Archivo compatible con Excel, LibreOffice y Google Sheets.
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600">
                      <Download className="h-3 w-3" />
                      Descargar archivo
                    </div>
                  </div>
                </button>
              </div>

              <div className="border-t border-gray-100 bg-gray-50 p-3">
                <p className="text-center text-xs text-gray-400">
                  La plantilla incluye ejemplos y validaciones
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => onExport('catalog')}
          className="hover:bg-[var(--primary)]/90 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 font-bold text-white shadow-lg transition"
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar Catálogo
        </button>
      </div>
    </div>
  )
}
