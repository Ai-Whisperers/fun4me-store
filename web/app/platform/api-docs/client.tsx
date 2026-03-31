'use client'

/**
 * API Documentation Client Component
 *
 * OPS-001: Interactive Swagger UI for API documentation
 */

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { FileJson, ExternalLink, Download, RefreshCw } from 'lucide-react'
import { logger } from '@/lib/logger'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
    </div>
  ),
})

export function ApiDocsClient() {
  const [specUrl, setSpecUrl] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Use the API endpoint for the spec
    setSpecUrl('/api/openapi.json')
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    // Force refresh by appending timestamp
    setSpecUrl(`/api/openapi.json?t=${Date.now()}`)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/openapi.json')
      const spec = await response.json()
      const blob = new Blob([JSON.stringify(spec, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'vete-api-spec.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('Error downloading API spec', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            API Documentation
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Interactive documentation for the Vete Platform REST API
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Actualizar
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Download className="h-4 w-4" />
            Descargar JSON
          </button>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <FileJson className="h-4 w-4" />
            Ver JSON
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border-default)]">
          <div className="text-2xl font-bold text-[var(--primary)]">269</div>
          <div className="text-sm text-[var(--text-secondary)]">
            Archivos de rutas
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border-default)]">
          <div className="text-2xl font-bold text-green-600">450+</div>
          <div className="text-sm text-[var(--text-secondary)]">
            Métodos HTTP
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border-default)]">
          <div className="text-2xl font-bold text-blue-600">16</div>
          <div className="text-sm text-[var(--text-secondary)]">Tags/Categorías</div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border-default)]">
          <div className="text-2xl font-bold text-purple-600">v1.0.0</div>
          <div className="text-sm text-[var(--text-secondary)]">
            Versión de API
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="bg-white rounded-lg border border-[var(--border-default)] overflow-hidden">
        {specUrl && (
          <SwaggerUI
            url={specUrl}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={false}
          />
        )}
      </div>

      {/* Custom Swagger UI Styles */}
      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          font-size: 1.5rem;
          color: var(--text-primary);
        }
        .swagger-ui .info .description p {
          color: var(--text-secondary);
        }
        .swagger-ui .opblock-tag {
          font-size: 1rem;
          border-bottom: 1px solid var(--border-default);
        }
        .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.1);
        }
        .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
          background: rgba(73, 204, 144, 0.1);
        }
        .swagger-ui .opblock.opblock-put {
          border-color: #fca130;
          background: rgba(252, 161, 48, 0.1);
        }
        .swagger-ui .opblock.opblock-delete {
          border-color: #f93e3e;
          background: rgba(249, 62, 62, 0.1);
        }
        .swagger-ui .opblock.opblock-patch {
          border-color: #50e3c2;
          background: rgba(80, 227, 194, 0.1);
        }
        .swagger-ui .btn {
          border-radius: 4px;
        }
        .swagger-ui select {
          border-radius: 4px;
        }
        .swagger-ui input[type='text'],
        .swagger-ui textarea {
          border-radius: 4px;
        }
        .swagger-ui .model-box {
          background: var(--bg-secondary);
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
