'use client'

/**
 * Inventory Header Component
 *
 * REF-006: Header section extracted from client component
 */

import { useRef, useState, useEffect } from 'react'
import {
  Download,
  ChevronDown,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Plus,
  ScanLine,
  Wand2,
  Globe,
} from 'lucide-react'

interface InventoryHeaderProps {
  clinic: string
  googleSheetUrl: string | null
  onAddProduct: () => void
  onScan: () => void
  onImportWizard: () => void
  onExport: (type: 'template' | 'catalog') => void
}

export function InventoryHeader({
  clinic,
  googleSheetUrl,
  onAddProduct,
  onScan,
  onImportWizard,
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
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-default)] p-6 shadow-sm lg:flex-row lg:items-center">
      <div>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Gestión de Inventario</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Administra productos, stock y precios de{' '}
          <span className="font-semibold text-[var(--primary)]">{clinic}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onAddProduct}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 font-bold text-white shadow-lg transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nuevo Producto
        </button>

        <button
          onClick={onScan}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--status-special)] px-4 py-2.5 font-bold text-white transition hover:bg-[var(--status-special-dark)]"
          title="Escanear código de barras para buscar o editar producto"
        >
          <ScanLine className="h-4 w-4" /> Escanear
        </button>

        <button
          onClick={onImportWizard}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--status-success)] px-4 py-2.5 font-bold text-white transition hover:bg-[var(--status-success-dark)]"
        >
          <Wand2 className="h-4 w-4" /> Importar con Asistente
        </button>

        <button
          onClick={() => (window.location.href = `/${clinic}/portal/inventory/catalog`)}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--status-info)] px-4 py-2.5 font-bold text-white transition hover:bg-[var(--status-info-dark)]"
        >
          <Globe className="h-4 w-4" /> Catálogo Global
        </button>

        <div className="relative" ref={templateDropdownRef}>
          <button
            onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-subtle)] px-4 py-2.5 font-bold text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)]"
          >
            <Download className="h-4 w-4" />
            Plantilla
            <ChevronDown
              className={`h-4 w-4 transition-transform ${templateDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {templateDropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-default)] shadow-xl">
              <div className="bg-[var(--bg-dark)] p-3 text-white">
                <h4 className="text-sm font-bold">Plantilla de Inventario</h4>
              </div>
              <div className="p-2">
                {googleSheetUrl && (
                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setTemplateDropdownOpen(false)}
                    className="flex items-center gap-3 rounded-lg p-3 transition hover:bg-[var(--status-success-bg)]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-success-bg)]">
                      <ExternalLink className="h-5 w-5 text-[var(--status-success)]" />
                    </div>
                    <div>
                      <span className="block font-bold text-[var(--text-primary)]">Google Sheets</span>
                      <span className="text-xs text-[var(--text-muted)]">Crear copia en Drive</span>
                    </div>
                  </a>
                )}
                <button
                  onClick={() => {
                    onExport('template')
                    setTemplateDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-[var(--status-info-bg)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-info-bg)]">
                    <FileDown className="h-5 w-5 text-[var(--status-info)]" />
                  </div>
                  <div>
                    <span className="block font-bold text-[var(--text-primary)]">Descargar Excel</span>
                    <span className="text-xs text-[var(--text-muted)]">Archivo .xlsx</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => onExport('catalog')}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-dark)] px-4 py-2.5 font-bold text-white transition hover:bg-[var(--bg-inverse)]"
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar
        </button>
      </div>
    </div>
  )
}
