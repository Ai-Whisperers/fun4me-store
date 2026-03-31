'use client'

/**
 * Lab Order Detail Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { ResultViewer } from '@/components/lab/result-viewer'
import { ResultEntry } from '@/components/lab/result-entry'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface LabOrder {
  id: string
  order_number: string
  ordered_at: string
  status: string
  priority: string
  lab_type: string
  fasting_status: string | null
  clinical_notes?: string
  has_critical_values: boolean
  specimen_collected_at?: string
  pets: {
    id: string
    name: string
    species: string
    breed: string
    date_of_birth: string
    owner_id: string
  }
}

interface Comment {
  id: string
  comment: string
  comment_type: string
  created_at: string
}

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_type: string
  uploaded_at: string
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ordered: { label: 'Ordenado', className: 'bg-blue-100 text-blue-800', icon: Icons.FileText },
  specimen_collected: {
    label: 'Muestra Recolectada',
    className: 'bg-purple-100 text-purple-800',
    icon: Icons.Droplet,
  },
  in_progress: {
    label: 'En Proceso',
    className: 'bg-yellow-100 text-yellow-800',
    icon: Icons.Clock,
  },
  completed: {
    label: 'Completado',
    className: 'bg-green-100 text-green-800',
    icon: Icons.CheckCircle,
  },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800', icon: Icons.XCircle },
}

export default function LabOrderDetailPage() {
  const [showResultEntry, setShowResultEntry] = useState(false)
  const [newComment, setNewComment] = useState('')

  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const clinic = params.clinic as string
  const supabase = createClient()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // React Query: Fetch order details
  const {
    data: orderData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['lab-order', orderId],
    queryFn: async (): Promise<{ order: LabOrder; comments: Comment[]; attachments: Attachment[] }> => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push(`/${clinic}`)
        throw new Error('No session')
      }

      // Fetch order
      const { data: orderResult, error: orderError } = await supabase
        .from('lab_orders')
        .select(
          `
          id,
          order_number,
          ordered_at,
          status,
          priority,
          lab_type,
          fasting_status,
          clinical_notes,
          has_critical_values,
          specimen_collected_at,
          pets!inner(id, name, species, breed, date_of_birth, owner_id)
        `
        )
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('lab_result_comments')
        .select(
          `
          id,
          comment,
          comment_type,
          created_at
        `
        )
        .eq('lab_order_id', orderId)
        .order('created_at', { ascending: false })

      // Fetch attachments
      const { data: attachmentsData } = await supabase
        .from('lab_result_attachments')
        .select('id, file_name, file_url, file_type, uploaded_at')
        .eq('order_id', orderId)
        .order('uploaded_at', { ascending: false })

      return {
        order: orderResult as unknown as LabOrder,
        comments: (commentsData as Comment[]) || [],
        attachments: attachmentsData || [],
      }
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  const order = orderData?.order || null
  const comments = orderData?.comments || []
  const attachments = orderData?.attachments || []

  // Mutation: Update status
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/lab-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Error al actualizar estado')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] })
    },
    onError: () => {
      showToast({ title: 'Error al actualizar el estado', variant: 'error' })
    },
  })

  // Mutation: Add comment
  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await fetch(`/api/lab-orders/${orderId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })

      if (!response.ok) throw new Error('Error al agregar comentario')
      return response.json()
    },
    onSuccess: () => {
      setNewComment('')
      queryClient.invalidateQueries({ queryKey: ['lab-order', orderId] })
    },
    onError: () => {
      showToast({ title: 'Error al agregar comentario', variant: 'error' })
    },
  })

  const updateStatus = (newStatus: string) => {
    statusMutation.mutate(newStatus)
  }

  const addComment = () => {
    if (!newComment.trim()) return
    commentMutation.mutate(newComment)
  }

  const fetchOrderDetails = async () => {
    await refetch()
  }

  const addingComment = commentMutation.isPending

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">Orden no encontrada</p>
          <Link
            href={`/${clinic}/dashboard/lab`}
            className="mt-4 inline-block text-[var(--primary)] hover:underline"
          >
            Volver a órdenes
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[order.status] || statusConfig.ordered
  const StatusIcon = status.icon
  const age = Math.floor(
    (new Date().getTime() - new Date(order.pets.date_of_birth).getTime()) /
      (1000 * 60 * 60 * 24 * 365)
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${clinic}/dashboard/lab`}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <Icons.ArrowLeft className="h-6 w-6 text-[var(--text-primary)]" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Orden #{order.order_number}
            </h1>
            <p className="text-[var(--text-secondary)]">
              {new Date(order.ordered_at).toLocaleDateString('es-PY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-50"
          >
            <Icons.Printer className="h-4 w-4" />
            Imprimir
          </button>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <button
              onClick={() => setShowResultEntry(!showResultEntry)}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
            >
              <Icons.Edit className="h-4 w-4" />
              {showResultEntry ? 'Ver Resultados' : 'Ingresar Resultados'}
            </button>
          )}
        </div>
      </div>

      {/* Order Info Card */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Column - Pet Info */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
              Información del Paciente
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Icons.PawPrint className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">Mascota</div>
                  <div className="font-medium text-[var(--text-primary)]">{order.pets.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Icons.Info className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">Especie / Raza</div>
                  <div className="font-medium capitalize text-[var(--text-primary)]">
                    {order.pets.species} - {order.pets.breed}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Icons.Calendar className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">Edad</div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {age} {age === 1 ? 'año' : 'años'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Info */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
              Información de la Orden
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StatusIcon className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">Estado</div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Icons.Clock className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">Fecha de orden</div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {new Date(order.ordered_at).toLocaleTimeString('es-PY', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Icons.Flag className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">Prioridad / Tipo</div>
                  <div className="font-medium capitalize text-[var(--text-primary)]">
                    {order.priority} - {order.lab_type === 'in_house' ? 'Interno' : 'Externo'}
                  </div>
                </div>
              </div>
              {order.fasting_status && (
                <div className="flex items-center gap-3">
                  <Icons.Coffee className="h-5 w-5 text-[var(--primary)]" />
                  <div>
                    <div className="text-sm text-[var(--text-secondary)]">Ayuno</div>
                    <div className="font-medium text-[var(--text-primary)]">Sí</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Notes */}
        {order.clinical_notes && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              Notas Clínicas
            </h3>
            <p className="text-[var(--text-secondary)]">{order.clinical_notes}</p>
          </div>
        )}

        {/* Critical Values Alert */}
        {order.has_critical_values && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <Icons.AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <h4 className="font-semibold text-red-900">Valores Críticos Detectados</h4>
              <p className="text-sm text-red-700">
                Esta orden contiene valores que requieren atención inmediata.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Workflow */}
      {order.status !== 'cancelled' && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Flujo de Trabajo
          </h2>
          <div className="flex items-center justify-between">
            {['ordered', 'specimen_collected', 'in_progress', 'completed'].map((statusKey, idx) => {
              const isActive = order.status === statusKey
              const isPast =
                ['ordered', 'specimen_collected', 'in_progress', 'completed'].indexOf(
                  order.status
                ) > idx
              const statusInfo = statusConfig[statusKey]

              return (
                <div key={statusKey} className="flex flex-1 items-center">
                  <button
                    onClick={() => updateStatus(statusKey)}
                    disabled={isPast}
                    className={`flex flex-col items-center gap-2 rounded-lg p-4 transition-all ${
                      isActive
                        ? 'bg-[var(--primary)]/10 border-2 border-[var(--primary)]'
                        : isPast
                          ? 'cursor-not-allowed opacity-50'
                          : 'border-2 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {React.createElement(statusInfo.icon, {
                      className: `w-6 h-6 ${isActive || isPast ? 'text-[var(--primary)]' : 'text-gray-400'}`,
                    })}
                    <span
                      className={`text-sm font-medium ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
                    >
                      {statusInfo.label}
                    </span>
                  </button>
                  {idx < 3 && (
                    <div
                      className={`h-0.5 flex-1 ${isPast ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          {showResultEntry ? 'Ingresar Resultados' : 'Resultados'}
        </h2>
        {showResultEntry ? (
          <ResultEntry
            orderId={orderId}
            onSuccess={() => {
              setShowResultEntry(false)
              fetchOrderDetails()
              updateStatus('completed')
            }}
            onCancel={() => setShowResultEntry(false)}
          />
        ) : (
          <ResultViewer
            orderId={orderId}
            petId={order.pets.id}
            showHistory={true}
            onDownloadPdf={handlePrint}
          />
        )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Archivos Adjuntos
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-[var(--primary)]"
              >
                <Icons.FileText className="h-6 w-6 text-[var(--primary)]" />
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-primary)]">
                    {attachment.file_name}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {new Date(attachment.uploaded_at).toLocaleDateString('es-PY')}
                  </div>
                </div>
                <Icons.ExternalLink className="h-5 w-5 text-[var(--text-secondary)]" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Comments & Interpretation */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Comentarios e Interpretación
        </h2>

        {/* Add Comment */}
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Agregar interpretación o comentario..."
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-[var(--primary)]"
          />
          <button
            onClick={addComment}
            disabled={addingComment || !newComment.trim()}
            className="mt-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {addingComment ? 'Agregando...' : 'Agregar Comentario'}
          </button>
        </div>

        {/* Comments List */}
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="rounded bg-gray-200 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                    {comment.comment_type || 'Nota'}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {new Date(comment.created_at).toLocaleDateString('es-PY')}
                  </span>
                </div>
                <p className="text-[var(--text-secondary)]">{comment.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-[var(--text-secondary)]">No hay comentarios aún</p>
        )}
      </div>
    </div>
  )
}
