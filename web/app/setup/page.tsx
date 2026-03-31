'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Database, Settings, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SetupStatus {
  tables_exist: Record<string, boolean>
  has_data: {
    tenants: boolean
    products: boolean
  }
}

interface SetupResponse {
  success: boolean
  message: string
  details?: unknown
  action?: string
  timestamp?: Date
}

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentAction, setCurrentAction] = useState<string>('')
  const [results, setResults] = useState<SetupResponse[]>([])
  const router = useRouter()

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/setup')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to check status:', error)
      }
    }
  }

  const runSetup = async (action: string, clinic?: string) => {
    setLoading(true)
    setCurrentAction(action)

    try {
      const url = clinic
        ? `/api/setup?action=${action}&clinic=${clinic}`
        : `/api/setup?action=${action}`
      const response = await fetch(url, { method: 'POST' })
      const result: SetupResponse = await response.json()

      setResults((prev) => [...prev, { ...result, action, timestamp: new Date() }])

      // Refresh status after setup
      if (result.success) {
        await checkStatus()
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setResults((prev) => [
        ...prev,
        {
          success: false,
          message: 'Network error',
          details: message,
          action,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
      setCurrentAction('')
    }
  }

  const isFullySetup =
    status?.tables_exist &&
    Object.values(status.tables_exist).every(Boolean) &&
    status.has_data.tenants

  if (isFullySetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <CardTitle className="text-2xl text-green-700">Setup Complete!</CardTitle>
            <CardDescription>Your database is fully configured and ready to use.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/terrapet/portal/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Database Setup</h1>
          <p className="text-gray-600">Configure your Vetic database and seed initial data</p>
        </div>

        {/* Status Overview */}
        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Setup Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Object.entries(status.tables_exist).map(([table, exists]) => (
                  <div key={table} className="flex items-center gap-2">
                    {exists ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm capitalize">{table.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">
                    Data: {status.has_data.tenants ? 'Tenants ✓' : 'Tenants ✗'} |{' '}
                    {status.has_data.products ? 'Products ✓' : 'Products ✗'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Actions */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Database Schema
              </CardTitle>
              <CardDescription>
                Create all required tables, indexes, and constraints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSetup('schema')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading && currentAction === 'schema' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Run Schema Setup
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Seed Data
              </CardTitle>
              <CardDescription>
                Load initial data: tenants, products, clinics, users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSetup('seeds')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading && currentAction === 'seeds' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Run Data Seeding
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinic Setup</CardTitle>
              <CardDescription>Configure specific clinic data (Adris, PetLife)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => runSetup('clinic', 'terrapet')}
                disabled={loading}
                className="w-full"
                variant="outline"
                size="sm"
              >
                {loading && currentAction === 'clinic' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Setup Adris Clinic
              </Button>
              <Button
                onClick={() => runSetup('clinic', 'petlife')}
                disabled={loading}
                className="w-full"
                variant="outline"
                size="sm"
              >
                Setup PetLife Clinic
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full Setup</CardTitle>
              <CardDescription>Run complete setup: schema + seeds + clinics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runSetup('full')} disabled={loading} className="w-full">
                {loading && currentAction === 'full' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Run Full Setup
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                    {result.success ? (
                      <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                    )}
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant={result.success ? 'default' : 'danger'}>
                          {result.action}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {result.message}
                      </p>
                      {result.details !== undefined && result.details !== null && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-500">
                            Details
                          </summary>
                          <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-100 p-2 text-xs">
                            {typeof result.details === 'string'
                              ? result.details
                              : JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refresh Status */}
        <div className="text-center">
          <Button onClick={checkStatus} variant="ghost" size="sm">
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  )
}
