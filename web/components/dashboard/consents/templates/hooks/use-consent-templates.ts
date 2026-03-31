'use client'

/**
 * Consent Templates Data Hook
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Replaced manual mutation handlers with useMutation hooks
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import type { ConsentTemplate, FeedbackState, NewTemplateData } from '../types'

interface UseConsentTemplatesResult {
  templates: ConsentTemplate[]
  loading: boolean
  saving: boolean
  feedback: FeedbackState | null
  fetchTemplates: () => Promise<void>
  saveTemplate: (template: ConsentTemplate) => Promise<boolean>
  createTemplate: (data: NewTemplateData) => Promise<boolean>
  setFeedback: (feedback: FeedbackState | null) => void
  clearFeedback: () => void
}

export function useConsentTemplates(): UseConsentTemplatesResult {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const queryClient = useQueryClient()

  const clearFeedback = useCallback(() => {
    setFeedback(null)
  }, [])

  // React Query: Fetch templates
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['consents', 'templates'],
    queryFn: async (): Promise<ConsentTemplate[]> => {
      const response = await fetch('/api/consents/templates')
      if (!response.ok) {
        throw new Error('Error al cargar plantillas')
      }
      return response.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Mutation: Save template
  const saveMutation = useMutation({
    mutationFn: async (templateData: ConsentTemplate): Promise<void> => {
      const response = await fetch(`/api/consents/templates/${templateData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateData.name,
          category: templateData.category,
          content: templateData.content,
          requires_witness: templateData.requires_witness,
          requires_id_verification: templateData.requires_id_verification,
          can_be_revoked: templateData.can_be_revoked,
          default_expiry_days: templateData.default_expiry_days,
          fields: templateData.fields,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar la plantilla')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consents', 'templates'] })
      setFeedback({ type: 'success', message: 'Plantilla actualizada correctamente' })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al guardar la plantilla',
      })
    },
  })

  // Mutation: Create template
  const createMutation = useMutation({
    mutationFn: async (data: NewTemplateData): Promise<void> => {
      const response = await fetch('/api/consents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          fields: data.fields.filter((f) => f.field_name && f.field_label),
        }),
      })

      if (!response.ok) {
        const responseData = await response.json()
        throw new Error(responseData.error || 'Error al crear plantilla')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consents', 'templates'] })
      setFeedback({ type: 'success', message: 'Plantilla creada correctamente' })
      setTimeout(() => setFeedback(null), 3000)
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al crear plantilla',
      })
    },
  })

  const saveTemplate = useCallback(async (template: ConsentTemplate): Promise<boolean> => {
    try {
      await saveMutation.mutateAsync(template)
      return true
    } catch (_error: unknown) {
      return false
    }
  }, [saveMutation])

  const createTemplate = useCallback(async (data: NewTemplateData): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch (_error: unknown) {
      return false
    }
  }, [createMutation])

  return {
    templates,
    loading: isLoading,
    saving: saveMutation.isPending || createMutation.isPending,
    feedback,
    fetchTemplates: async () => { await refetch() },
    saveTemplate,
    createTemplate,
    setFeedback,
    clearFeedback,
  }
}
