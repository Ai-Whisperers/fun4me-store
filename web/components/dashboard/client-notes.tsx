'use client'

/**
 * Client Notes Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Add/Edit/Delete operations use useMutation with cache invalidation
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  StickyNote,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Check,
  Lock,
  Unlock,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/Toast'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Note {
  id: string
  content: string
  is_private: boolean
  created_by: string
  created_by_name?: string
  created_at: string
  updated_at: string
}

interface ClientNotesProps {
  clientId: string
  clinic: string
  currentUserId: string
  initialNotes?: Note[]
}

export function ClientNotes({
  clientId,
  clinic,
  currentUserId,
  initialNotes = [],
}: ClientNotesProps): React.ReactElement {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const t = useTranslations('dashboard.clientNotes')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { showToast } = useToast()

  // React Query: Fetch notes
  const {
    data: notes = initialNotes,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.clients.notes(clientId, clinic),
    queryFn: async (): Promise<Note[]> => {
      const response = await fetch(`/api/clients/${clientId}/notes?clinic=${clinic}`)
      if (!response.ok) throw new Error('Error al cargar notas')
      const data = await response.json()
      return data.notes || []
    },
    initialData: initialNotes.length > 0 ? initialNotes : undefined,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Mutation: Add note
  const addNoteMutation = useMutation({
    mutationFn: async ({ content, isPrivate }: { content: string; isPrivate: boolean }): Promise<Note> => {
      const response = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic,
          content,
          is_private: isPrivate,
        }),
      })
      if (!response.ok) throw new Error('Error al guardar nota')
      const data = await response.json()
      return data.note
    },
    onSuccess: (newNote) => {
      // Optimistic update: prepend new note to existing list
      queryClient.setQueryData(
        queryKeys.clients.notes(clientId, clinic),
        (old: Note[] | undefined) => [newNote, ...(old || [])]
      )
      setNewNote('')
      setIsPrivate(false)
      setIsAdding(false)
    },
    onError: () => {
      showToast(t('errors.saveNote'))
    },
  })

  // Mutation: Edit note
  const editNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }): Promise<void> => {
      const response = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic,
          content,
        }),
      })
      if (!response.ok) throw new Error('Error al editar nota')
    },
    onSuccess: (_, { noteId, content }) => {
      // Optimistic update: update note in cache
      queryClient.setQueryData(
        queryKeys.clients.notes(clientId, clinic),
        (old: Note[] | undefined) =>
          (old || []).map((note) =>
            note.id === noteId
              ? { ...note, content, updated_at: new Date().toISOString() }
              : note
          )
      )
      setEditingId(null)
      setEditContent('')
    },
    onError: () => {
      showToast(t('errors.editNote'))
    },
  })

  // Mutation: Delete note
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string): Promise<void> => {
      const response = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic }),
      })
      if (!response.ok) throw new Error('Error al eliminar nota')
    },
    onSuccess: (_, noteId) => {
      // Optimistic update: remove note from cache
      queryClient.setQueryData(
        queryKeys.clients.notes(clientId, clinic),
        (old: Note[] | undefined) => (old || []).filter((note) => note.id !== noteId)
      )
    },
    onError: () => {
      showToast(t('errors.deleteNote'))
    },
  })

  const handleAddNote = (): void => {
    if (!newNote.trim() || addNoteMutation.isPending) return
    addNoteMutation.mutate({ content: newNote, isPrivate })
  }

  const handleEditNote = (noteId: string): void => {
    if (!editContent.trim() || editNoteMutation.isPending) return
    editNoteMutation.mutate({ noteId, content: editContent })
  }

  const handleDeleteNote = (noteId: string): void => {
    if (deleteNoteMutation.isPending) return
    deleteNoteMutation.mutate(noteId)
  }

  const isSaving = addNoteMutation.isPending || editNoteMutation.isPending
  const deletingId = deleteNoteMutation.isPending ? deleteNoteMutation.variables : null

  const formatDate = (date: string): string => {
    const d = new Date(date)
    const now = new Date()
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)

    if (diffHours < 1) {
      const minutes = Math.floor(diffHours * 60)
      return t('time.minutesAgo', { minutes })
    }
    if (diffHours < 24) {
      return t('time.hoursAgo', { hours: Math.floor(diffHours) })
    }
    if (diffHours < 48) {
      return t('time.yesterday')
    }
    return d.toLocaleDateString(locale === 'es' ? 'es-PY' : 'en-US', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-[var(--primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">{t('title')}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {notes.length}
          </span>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:bg-opacity-10"
          >
            <Plus className="h-4 w-4" />
            {t('add')}
          </button>
        )}
      </div>

      {/* Add Note Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[var(--border-color)]"
          >
            <div className="space-y-3 p-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('placeholder')}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--border-color)] px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isPrivate
                      ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isPrivate ? (
                    <>
                      <Lock className="h-4 w-4" />
                      {t('private')}
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      {t('public')}
                    </>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewNote('')
                      setIsPrivate(false)
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                    disabled={isSaving}
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isSaving}
                    className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {tCommon('save')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div className="divide-y divide-[var(--border-color)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="p-4 transition-colors hover:bg-gray-50">
              {editingId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[var(--border-color)] px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditContent('')
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      onClick={() => handleEditNote(note.id)}
                      disabled={isSaving}
                      className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {tCommon('save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                        {note.content}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span>{note.created_by_name || t('defaultUser')}</span>
                        <span>•</span>
                        <span>{formatDate(note.created_at)}</span>
                        {note.is_private && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[var(--status-warning)]">
                              <Lock className="h-3 w-3" />
                              {t('privateLabel')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {note.created_by === currentUserId && (
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setEditingId(note.id)
                            setEditContent(note.content)
                          }}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[var(--primary)]"
                          title={tCommon('edit')}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {/* UX-007: Confirmation dialog for delete */}
                        <ConfirmDialog
                          trigger={
                            <button
                              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error)]"
                              title={tCommon('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                          title={t('deleteConfirmTitle')}
                          description={t('deleteConfirmMessage')}
                          confirmLabel={t('deleteConfirmLabel')}
                          cancelLabel={tCommon('cancel')}
                          variant="danger"
                          onConfirm={() => handleDeleteNote(note.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <StickyNote className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-[var(--text-secondary)]">{t('noNotes')}</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 text-sm text-[var(--primary)] hover:underline"
            >
              {t('addFirst')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
