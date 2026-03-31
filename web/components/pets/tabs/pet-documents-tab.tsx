'use client'

import { useState, useRef } from 'react'
import {
  FileText,
  Upload,
  Image,
  File,
  Download,
  Trash2,
  Eye,
  Calendar,
  FolderOpen,
  Plus,
  X,
  Loader2,
  FileImage,
  FileSpreadsheet,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface Document {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size?: number
  category: 'medical' | 'lab' | 'xray' | 'vaccine' | 'prescription' | 'other'
  description?: string
  uploaded_by?: string
  created_at: string
}

interface PetDocumentsTabProps {
  petId: string
  petName: string
  documents: Document[]
  clinic: string
  onUpload?: (files: File[], category: string) => Promise<void>
  onDelete?: (documentId: string) => Promise<void>
}

type CategoryFilter = 'all' | Document['category']

const categoryIcons: Record<Document['category'], { icon: React.ElementType; color: string }> = {
  medical: { icon: FileText, color: 'bg-blue-100 text-blue-700' },
  lab: { icon: FileSpreadsheet, color: 'bg-purple-100 text-purple-700' },
  xray: { icon: FileImage, color: 'bg-green-100 text-green-700' },
  vaccine: { icon: FileText, color: 'bg-amber-100 text-amber-700' },
  prescription: { icon: FileText, color: 'bg-pink-100 text-pink-700' },
  other: { icon: File, color: 'bg-gray-100 text-gray-700' },
}

export function PetDocumentsTab({
  petId,
  petName,
  documents,
  clinic,
  onUpload,
  onDelete,
}: PetDocumentsTabProps) {
  const t = useTranslations('pets.tabs.documents')
  const locale = useLocale()
  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  const categoryLabels: Record<Document['category'], string> = {
    medical: t('categoryMedical'),
    lab: t('categoryLab'),
    xray: t('categoryXray'),
    vaccine: t('categoryVaccine'),
    prescription: t('categoryPrescription'),
    other: t('categoryOther'),
  }

  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<Document['category']>('other')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredDocuments =
    filter === 'all' ? documents : documents.filter((doc) => doc.category === filter)

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString(localeStr, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image
    if (fileType.includes('pdf')) return FileText
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet
    return File
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      setSelectedFiles((prev) => [...prev, ...files])
      setShowUploadModal(true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setSelectedFiles((prev) => [...prev, ...files])
      setShowUploadModal(true)
    }
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!onUpload || selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      await onUpload(selectedFiles, uploadCategory)
      setSelectedFiles([])
      setShowUploadModal(false)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!onDelete) return
    if (!confirm(t('confirmDelete'))) return

    try {
      await onDelete(documentId)
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('title', { petName })}</h2>
          <p className="text-sm text-gray-500">
            {documents.length !== 1 ? t('documentCountPlural', { count: documents.length }) : t('documentCount', { count: documents.length })}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedFiles([])
            setShowUploadModal(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          {t('uploadDocument')}
        </button>
      </div>

      {/* Category Filter */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[var(--primary)] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('all')}
        </button>
        {(Object.keys(categoryIcons) as Document['category'][]).map((cat) => {
          const count = documents.filter((d) => d.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                filter === cat
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {categoryLabels[cat]}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    filter === cat ? 'bg-white/20' : 'bg-gray-200'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Upload className={`h-6 w-6 ${dragActive ? 'text-[var(--primary)]' : 'text-gray-400'}`} />
        </div>
        <p className="mb-1 text-sm text-gray-600">
          {t('dragFiles')}{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-[var(--primary)] hover:underline"
          >
            {t('select')}
          </button>
        </p>
        <p className="text-xs text-gray-400">{t('fileTypes')}</p>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const iconConfig = categoryIcons[doc.category]
            const FileIcon = getFileIcon(doc.file_type)
            const isImage = doc.file_type.startsWith('image/')

            return (
              <div
                key={doc.id}
                className="group overflow-hidden rounded-xl border border-gray-100 bg-white transition-shadow hover:shadow-md"
              >
                {/* Preview */}
                <div className="relative flex h-32 items-center justify-center bg-gray-50">
                  {isImage ? (
                    <img src={doc.file_url} alt={doc.name} className="h-full w-full object-cover" />
                  ) : (
                    <FileIcon className="h-12 w-12 text-gray-300" />
                  )}

                  {/* Overlay actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-white p-2 transition-colors hover:bg-gray-100"
                      title={t('view')}
                    >
                      <Eye className="h-4 w-4 text-gray-700" />
                    </a>
                    <a
                      href={doc.file_url}
                      download={doc.name}
                      className="rounded-lg bg-white p-2 transition-colors hover:bg-gray-100"
                      title={t('download')}
                    >
                      <Download className="h-4 w-4 text-gray-700" />
                    </a>
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="rounded-lg bg-white p-2 transition-colors hover:bg-red-50"
                        title={t('delete')}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${iconConfig.color} mb-2`}
                  >
                    <iconConfig.icon className="h-3 w-3" />
                    {categoryLabels[doc.category]}
                  </span>
                  <h4 className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {doc.name}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(doc.created_at)}
                    </span>
                    {doc.file_size && <span>• {formatFileSize(doc.file_size)}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 font-bold text-gray-900">
            {filter !== 'all' ? t('noDocumentsCategory') : t('noDocuments')}
          </h3>
          <p className="mx-auto mb-4 max-w-xs text-sm text-gray-500">
            {filter !== 'all'
              ? t('noDocumentsCategoryDesc')
              : t('noDocumentsDesc', { petName })}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {t('viewAll')}
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-bold">{t('uploadDocuments')}</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFiles([])
                }}
                className="rounded-lg p-1 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="max-h-[50vh] space-y-4 overflow-y-auto p-4">
              {/* Category selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t('category')}</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as Document['category'])}
                  className="focus:ring-[var(--primary)]/10 w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2"
                >
                  {(Object.keys(categoryIcons) as Document['category'][]).map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected files */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('selectedFiles')}
                </label>
                {selectedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <File className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="truncate text-sm">{file.name}</span>
                          <span className="flex-shrink-0 text-xs text-gray-400">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSelectedFile(index)}
                          className="flex-shrink-0 rounded p-1 transition-colors hover:bg-gray-200"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-gray-200 p-4 text-center transition-colors hover:border-gray-300"
                  >
                    <Plus className="mx-auto mb-1 h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-500">{t('addFiles')}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t p-4">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFiles([])
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t('upload')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
