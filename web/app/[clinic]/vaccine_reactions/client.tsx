'use client'

/**
 * Vaccine Reactions CRUD Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Added useMutation for CRUD operations
 * - Automatic cache invalidation on mutations
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { useTranslations } from 'next-intl'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  AlertTriangle,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Syringe,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react'

interface VaccineReaction {
  id: string
  vaccine_id: string
  vaccine_name?: string
  pet_name?: string
  reaction_type?: string
  reaction_detail: string
  severity?: 'leve' | 'moderada' | 'severa'
  occurred_at: string
  resolved_at?: string
  treatment?: string
}

type SortField = 'vaccine_name' | 'reaction_type' | 'severity' | 'occurred_at'
type SortDirection = 'asc' | 'desc'

const REACTION_TYPES = [
  {
    value: 'local',
    label: 'Reacción Local',
    desc: 'Hinchazón, dolor o enrojecimiento en el sitio de inyección',
  },
  { value: 'sistemica', label: 'Reacción Sistémica', desc: 'Fiebre, letargia, pérdida de apetito' },
  {
    value: 'alergica',
    label: 'Reacción Alérgica',
    desc: 'Urticaria, edema facial, dificultad respiratoria',
  },
  {
    value: 'anafilactica',
    label: 'Anafilaxia',
    desc: 'Reacción severa que requiere atención inmediata',
  },
  { value: 'digestiva', label: 'Alteración Digestiva', desc: 'Vómitos, diarrea' },
  {
    value: 'neurologica',
    label: 'Alteración Neurológica',
    desc: 'Convulsiones, ataxia, cambios de comportamiento',
  },
  { value: 'otra', label: 'Otra', desc: 'Otra reacción no especificada' },
]

const SEVERITY_OPTIONS = [
  { value: 'leve', label: 'Leve', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'moderada', label: 'Moderada', color: 'bg-orange-100 text-orange-700' },
  { value: 'severa', label: 'Severa', color: 'bg-red-100 text-red-700' },
]

export default function VaccineReactionsClient() {
  const { user, loading } = useAuthRedirect()
  const t = useTranslations('vaccineReactions')
  const tc = useTranslations('common')
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('occurred_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReaction, setEditingReaction] = useState<VaccineReaction | null>(null)

  // Form states
  const [formVaccineId, setFormVaccineId] = useState('')
  const [formVaccineName, setFormVaccineName] = useState('')
  const [formReactionType, setFormReactionType] = useState('')
  const [formDetail, setFormDetail] = useState('')
  const [formSeverity, setFormSeverity] = useState<'leve' | 'moderada' | 'severa'>('leve')
  const [formDate, setFormDate] = useState('')
  const [formTreatment, setFormTreatment] = useState('')

  // React Query for data fetching
  const { data: reactions = [], isLoading } = useQuery({
    queryKey: queryKeys.clinical.vaccineReactions(),
    queryFn: async (): Promise<VaccineReaction[]> => {
      const response = await fetch('/api/vaccine_reactions')
      if (!response.ok) {
        throw new Error('Error al cargar reacciones a vacunas')
      }
      return response.json()
    },
    enabled: !loading && !!user,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Mutation for adding vaccine reactions
  const addMutation = useMutation({
    mutationFn: async (payload: Omit<VaccineReaction, 'id'>) => {
      const response = await fetch('/api/vaccine_reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Error al registrar reacción')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinical.vaccineReactions() })
    },
  })

  // Mutation for updating vaccine reactions
  const updateMutation = useMutation({
    mutationFn: async (payload: VaccineReaction) => {
      const response = await fetch('/api/vaccine_reactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Error al actualizar reacción')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinical.vaccineReactions() })
    },
  })

  // Mutation for deleting vaccine reactions
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/vaccine_reactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('Error al eliminar reacción')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinical.vaccineReactions() })
    },
  })

  // Filter and sort
  const filteredReactions = useMemo(() => {
    let result = [...reactions]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (r) =>
          r.vaccine_name?.toLowerCase().includes(term) ||
          r.reaction_detail.toLowerCase().includes(term) ||
          r.pet_name?.toLowerCase().includes(term)
      )
    }

    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter((r) => r.severity === severityFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortField === 'vaccine_name') {
        comparison = (a.vaccine_name || '').localeCompare(b.vaccine_name || '')
      } else if (sortField === 'reaction_type') {
        comparison = (a.reaction_type || '').localeCompare(b.reaction_type || '')
      } else if (sortField === 'severity') {
        const severityOrder = { leve: 1, moderada: 2, severa: 3 }
        comparison =
          (severityOrder[a.severity || 'leve'] || 0) - (severityOrder[b.severity || 'leve'] || 0)
      } else if (sortField === 'occurred_at') {
        comparison = new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [reactions, searchTerm, severityFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  const resetForm = () => {
    setFormVaccineId('')
    setFormVaccineName('')
    setFormReactionType('')
    setFormDetail('')
    setFormSeverity('leve')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormTreatment('')
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (reaction: VaccineReaction) => {
    setEditingReaction(reaction)
    setFormVaccineId(reaction.vaccine_id)
    setFormVaccineName(reaction.vaccine_name || '')
    setFormReactionType(reaction.reaction_type || '')
    setFormDetail(reaction.reaction_detail)
    setFormSeverity(reaction.severity || 'leve')
    setFormDate(reaction.occurred_at?.split('T')[0] || '')
    setFormTreatment(reaction.treatment || '')
    setShowEditModal(true)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      vaccine_id: formVaccineId,
      vaccine_name: formVaccineName,
      reaction_type: formReactionType,
      reaction_detail: formDetail,
      severity: formSeverity,
      occurred_at: formDate,
      treatment: formTreatment || undefined,
    }
    addMutation.mutate(payload, {
      onSuccess: () => {
        setShowAddModal(false)
        resetForm()
      },
    })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReaction) return

    const payload = {
      id: editingReaction.id,
      vaccine_id: formVaccineId,
      vaccine_name: formVaccineName,
      reaction_type: formReactionType,
      reaction_detail: formDetail,
      severity: formSeverity,
      occurred_at: formDate,
      treatment: formTreatment || undefined,
    }
    updateMutation.mutate(payload, {
      onSuccess: () => {
        setShowEditModal(false)
        setEditingReaction(null)
        resetForm()
      },
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    deleteMutation.mutate(id)
  }

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null
    const colorMap: Record<string, string> = {
      leve: 'bg-yellow-100 text-yellow-700',
      moderada: 'bg-orange-100 text-orange-700',
      severa: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-bold ${colorMap[severity] || ''}`}>
        {t(`severity.${severity}`)}
      </span>
    )
  }

  const getReactionTypeLabel = (type?: string) => {
    if (!type) return t('notSpecified')
    return t(`reactionTypes.${type}.label`)
  }

  // Stats
  const stats = useMemo(() => {
    const total = reactions.length
    const severas = reactions.filter((r) => r.severity === 'severa').length
    const moderadas = reactions.filter((r) => r.severity === 'moderada').length
    const leves = reactions.filter((r) => r.severity === 'leve').length
    return { total, severas, moderadas, leves }
  }, [reactions])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-default)]">
        <div className="h-64 animate-pulse bg-gradient-to-br from-red-500 to-orange-500" />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[var(--bg-default)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-500 to-orange-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 h-60 w-60 rounded-full bg-white blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-16">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <span className="rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur-sm">
              {t('pharmacovigilance')}
            </span>
          </div>

          <h1 className="mb-4 text-4xl font-bold md:text-5xl">{t('title')}</h1>
          <p className="max-w-2xl text-xl text-white/90">
            {t('description')}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <FileText className="h-5 w-5" />
              <span>{t('recordsCount', { count: stats.total })}</span>
            </div>
            {stats.severas > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-red-600/50 px-4 py-2 backdrop-blur-sm">
                <AlertCircle className="h-5 w-5" />
                <span>{t('severeCount', { count: stats.severas })}</span>
              </div>
            )}
            {stats.moderadas > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-orange-600/50 px-4 py-2 backdrop-blur-sm">
                <span>{t('moderateCount', { count: stats.moderadas })}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative w-full max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 transition-all focus:border-transparent focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                aria-label={t('severityFilterLabel')}
              >
                <option value="all">{t('allSeverities')}</option>
                <option value="leve">{t('severity.leve')}</option>
                <option value="moderada">{t('severity.moderada')}</option>
                <option value="severa">{t('severity.severa')}</option>
              </select>

              {/* Add Button */}
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition-colors hover:bg-red-600"
                aria-label={t('registerReactionAriaLabel')}
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">{t('registerReaction')}</span>
              </button>
            </div>
          </div>

          {/* Active filters info */}
          {(searchTerm || severityFilter !== 'all') && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span>
                {t('showingFiltered', { filtered: filteredReactions.length, total: reactions.length })}
              </span>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSeverityFilter('all')
                }}
                className="text-red-500 hover:underline"
              >
                {t('clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          </div>
        ) : filteredReactions.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">
              {searchTerm || severityFilter !== 'all'
                ? t('empty.noResults')
                : t('empty.noReactions')}
            </h3>
            <p className="mb-6 text-gray-600">
              {searchTerm || severityFilter !== 'all'
                ? t('empty.tryOtherSearch')
                : t('empty.goodNews')}
            </p>
            {!searchTerm && severityFilter === 'all' && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition-colors hover:bg-red-600"
              >
                <Plus className="h-5 w-5" />
                {t('registerFirstReaction')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th
                      className="cursor-pointer p-4 text-left font-bold text-gray-700 transition-colors hover:bg-gray-100"
                      onClick={() => handleSort('occurred_at')}
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t('table.date')}
                        <SortIcon field="occurred_at" />
                      </span>
                    </th>
                    <th
                      className="cursor-pointer p-4 text-left font-bold text-gray-700 transition-colors hover:bg-gray-100"
                      onClick={() => handleSort('vaccine_name')}
                    >
                      <span className="flex items-center gap-2">
                        <Syringe className="h-4 w-4" />
                        {t('table.vaccine')}
                        <SortIcon field="vaccine_name" />
                      </span>
                    </th>
                    <th
                      className="cursor-pointer p-4 text-left font-bold text-gray-700 transition-colors hover:bg-gray-100"
                      onClick={() => handleSort('reaction_type')}
                    >
                      <span className="flex items-center gap-2">
                        {t('table.type')}
                        <SortIcon field="reaction_type" />
                      </span>
                    </th>
                    <th
                      className="cursor-pointer p-4 text-left font-bold text-gray-700 transition-colors hover:bg-gray-100"
                      onClick={() => handleSort('severity')}
                    >
                      <span className="flex items-center gap-2">
                        {t('table.severity')}
                        <SortIcon field="severity" />
                      </span>
                    </th>
                    <th className="p-4 text-left font-bold text-gray-700">{t('table.detail')}</th>
                    <th className="p-4 text-right font-bold text-gray-700">{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReactions.map((reaction, index) => (
                    <tr
                      key={reaction.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          {new Date(reaction.occurred_at).toLocaleDateString('es-PY', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {reaction.vaccine_name || reaction.vaccine_id}
                        </div>
                        {reaction.pet_name && (
                          <div className="text-xs text-gray-500">{reaction.pet_name}</div>
                        )}
                      </td>
                      <td className="p-4 text-gray-600">
                        {getReactionTypeLabel(reaction.reaction_type)}
                      </td>
                      <td className="p-4">{getSeverityBadge(reaction.severity)}</td>
                      <td className="max-w-xs truncate p-4 text-sm text-gray-500">
                        {reaction.reaction_detail || '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(reaction)}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-500"
                            aria-label={t('editReactionAriaLabel', { vaccine: reaction.vaccine_name || t('vaccine') })}
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(reaction.id)}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={t('deleteReactionAriaLabel', { vaccine: reaction.vaccine_name || t('vaccine') })}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {t('info.title')}
          </h3>
          <div className="grid gap-4 text-sm text-gray-600 md:grid-cols-2">
            <div>
              <p className="mb-2">
                <strong>{t('info.whenToReportTitle')}</strong> {t('info.whenToReportText')}
              </p>
              <p>
                <strong>{t('info.observationTimeTitle')}</strong> {t('info.observationTimeText')}
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>{t('info.commonReactionsTitle')}</strong> {t('info.commonReactionsText')}
              </p>
              <p>
                <strong>{t('info.urgencyTitle')}</strong> {t('info.urgencyText')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-red-50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-100 p-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{t('modal.addTitle')}</h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-red-100"
                  aria-label={t('modal.closeAriaLabel')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('form.vaccineId')} *</label>
                  <input
                    type="text"
                    value={formVaccineId}
                    onChange={(e) => setFormVaccineId(e.target.value)}
                    placeholder={t('form.vaccineIdPlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    {t('form.vaccineName')}
                  </label>
                  <input
                    type="text"
                    value={formVaccineName}
                    onChange={(e) => setFormVaccineName(e.target.value)}
                    placeholder={t('form.vaccineNamePlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  {t('form.reactionType')} *
                </label>
                <select
                  value={formReactionType}
                  onChange={(e) => setFormReactionType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">{t('form.selectType')}</option>
                  {REACTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(`reactionTypes.${type.value}.label`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('form.severity')} *</label>
                  <select
                    value={formSeverity}
                    onChange={(e) =>
                      setFormSeverity(e.target.value as 'leve' | 'moderada' | 'severa')
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    required
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`severity.${opt.value}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('form.date')} *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  {t('form.detailedDescription')} *
                </label>
                <textarea
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  placeholder={t('form.detailedDescriptionPlaceholder')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  {t('form.treatmentApplied')}
                </label>
                <textarea
                  value={formTreatment}
                  onChange={(e) => setFormTreatment(e.target.value)}
                  placeholder={t('form.treatmentPlaceholder')}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition-colors hover:bg-red-600"
                >
                  {t('register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingReaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 bg-red-50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-100 p-2">
                    <Edit2 className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{t('modal.editTitle')}</h2>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingReaction(null)
                  }}
                  className="rounded-lg p-2 transition-colors hover:bg-red-100"
                  aria-label={t('modal.closeAriaLabel')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEdit} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('form.vaccineId')} *</label>
                  <input
                    type="text"
                    value={formVaccineId}
                    onChange={(e) => setFormVaccineId(e.target.value)}
                    placeholder={t('form.vaccineIdPlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    {t('form.vaccineName')}
                  </label>
                  <input
                    type="text"
                    value={formVaccineName}
                    onChange={(e) => setFormVaccineName(e.target.value)}
                    placeholder={t('form.vaccineNamePlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  {t('form.reactionType')} *
                </label>
                <select
                  value={formReactionType}
                  onChange={(e) => setFormReactionType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">{t('form.selectType')}</option>
                  {REACTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(`reactionTypes.${type.value}.label`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('form.severity')} *</label>
                  <select
                    value={formSeverity}
                    onChange={(e) =>
                      setFormSeverity(e.target.value as 'leve' | 'moderada' | 'severa')
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    required
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`severity.${opt.value}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('form.date')} *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  {t('form.detailedDescription')} *
                </label>
                <textarea
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  placeholder={t('form.detailedDescriptionPlaceholder')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  {t('form.treatmentApplied')}
                </label>
                <textarea
                  value={formTreatment}
                  onChange={(e) => setFormTreatment(e.target.value)}
                  placeholder={t('form.treatmentPlaceholder')}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingReaction(null)
                  }}
                  className="flex-1 rounded-xl border border-gray-200 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition-colors hover:bg-red-600"
                >
                  {t('modal.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
