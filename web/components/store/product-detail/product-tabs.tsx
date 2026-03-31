'use client'

import { useState } from 'react'
import { Star, MessageSquare, ChevronDown, ChevronUp, User } from 'lucide-react'
import type { StoreProductWithDetails, ReviewSummary } from '@/lib/types/store'
import {
  SPECIES_LABELS,
  LIFE_STAGE_LABELS,
  BREED_SIZE_LABELS,
  HEALTH_CONDITION_LABELS,
} from '@/lib/types/store'
import { createSanitizedHtml } from '@/lib/utils'

interface Props {
  product: StoreProductWithDetails
  reviewSummary: ReviewSummary
  questions: Array<{
    id: string
    question: string
    answer: string
    created_at: string
    user_name: string
    answerer_name: string
    answered_at: string
  }>
  clinic: string
  currencySymbol: string
}

type TabId = 'description' | 'specifications' | 'reviews' | 'questions'

export default function ProductTabs({
  product,
  reviewSummary,
  questions,
  clinic: _clinic,
  currencySymbol,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('description')
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'description', label: 'Descripción' },
    { id: 'specifications', label: 'Especificaciones' },
    { id: 'reviews', label: 'Reseñas', count: product.review_count },
    { id: 'questions', label: 'Preguntas', count: questions.length },
  ]

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
      {/* Tab Headers */}
      <div className="flex overflow-x-auto border-b border-[var(--border-default)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[var(--primary)] bg-[var(--bg-subtle)] text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Description Tab */}
        {activeTab === 'description' && (
          <div className="space-y-6">
            {product.short_description && (
              <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
                {product.short_description}
              </p>
            )}

            {product.description && (
              <div
                className="prose prose-sm max-w-none text-[var(--text-primary)]"
                dangerouslySetInnerHTML={createSanitizedHtml(product.description, 'richText')}
              />
            )}

            {product.features && product.features.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                  Beneficios
                </h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span className="text-[var(--text-secondary)]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.ingredients && (
              <div className="mt-6">
                <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                  Ingredientes
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {product.ingredients}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Specifications Tab */}
        {activeTab === 'specifications' && (
          <div className="space-y-6">
            {/* Pet Attributes */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {product.species.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-[var(--text-muted)]">Especie</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.species.map((species) => (
                      <span
                        key={species}
                        className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-sm"
                      >
                        {SPECIES_LABELS[species] || species}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.life_stages.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-[var(--text-muted)]">
                    Etapa de Vida
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {product.life_stages.map((stage) => (
                      <span
                        key={stage}
                        className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-sm"
                      >
                        {LIFE_STAGE_LABELS[stage] || stage}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.breed_sizes.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-[var(--text-muted)]">
                    Tamaño de Raza
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {product.breed_sizes.map((size) => (
                      <span
                        key={size}
                        className="rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-sm"
                      >
                        {BREED_SIZE_LABELS[size] || size}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.health_conditions.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-[var(--text-muted)]">
                    Condiciones de Salud
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {product.health_conditions.map((condition) => (
                      <span
                        key={condition}
                        className="rounded-full bg-[var(--status-info-bg)] px-3 py-1 text-sm text-[var(--status-info-text)]"
                      >
                        {HEALTH_CONDITION_LABELS[condition] || condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Technical Specs */}
            {Object.keys(product.specifications).length > 0 && (
              <div className="mt-6">
                <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                  Especificaciones Técnicas
                </h3>
                <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
                  {Object.entries(product.specifications).map(([key, value], index) => (
                    <div
                      key={key}
                      className={`flex ${index % 2 === 0 ? 'bg-[var(--bg-subtle)]' : ''}`}
                    >
                      <span className="w-1/3 border-r border-[var(--border-default)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
                        {key}
                      </span>
                      <span className="flex-1 px-4 py-3 text-sm text-[var(--text-primary)]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nutritional Info */}
            {Object.keys(product.nutritional_info).length > 0 && (
              <div className="mt-6">
                <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                  Información Nutricional
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {Object.entries(product.nutritional_info).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-[var(--bg-subtle)] p-4 text-center">
                      <span className="block text-2xl font-bold text-[var(--primary)]">
                        {typeof value === 'number' ? `${value}%` : value}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Physical Attributes */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {product.weight_grams && (
                <div className="rounded-lg bg-[var(--bg-subtle)] p-4">
                  <span className="text-sm text-[var(--text-muted)]">Peso</span>
                  <span className="block text-lg font-semibold text-[var(--text-primary)]">
                    {product.weight_grams >= 1000
                      ? `${(product.weight_grams / 1000).toFixed(1)} kg`
                      : `${product.weight_grams} g`}
                  </span>
                </div>
              )}
              {product.sku && (
                <div className="rounded-lg bg-[var(--bg-subtle)] p-4">
                  <span className="text-sm text-[var(--text-muted)]">SKU</span>
                  <span className="block text-lg font-semibold text-[var(--text-primary)]">
                    {product.sku}
                  </span>
                </div>
              )}
              {product.barcode && (
                <div className="rounded-lg bg-[var(--bg-subtle)] p-4">
                  <span className="text-sm text-[var(--text-muted)]">Código de Barras</span>
                  <span className="block text-lg font-semibold text-[var(--text-primary)]">
                    {product.barcode}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Review Summary */}
            <div className="flex flex-col gap-8 rounded-xl bg-[var(--bg-subtle)] p-6 md:flex-row">
              <div className="text-center md:border-r md:border-[var(--border-default)] md:pr-8">
                <div className="text-5xl font-black text-[var(--text-primary)]">
                  {reviewSummary.avg_rating.toFixed(1)}
                </div>
                <div className="mt-2 flex justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(reviewSummary.avg_rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {reviewSummary.total_reviews} reseñas
                </p>
              </div>

              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count =
                    reviewSummary.rating_distribution[
                      rating as keyof typeof reviewSummary.rating_distribution
                    ]
                  const percentage =
                    reviewSummary.total_reviews > 0
                      ? (count / reviewSummary.total_reviews) * 100
                      : 0

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="w-8 text-sm text-[var(--text-secondary)]">{rating}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-yellow-400 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-sm text-[var(--text-muted)]">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Write Review Button */}
            <div className="text-center">
              <button className="rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90">
                Escribir una Reseña
              </button>
            </div>

            {/* Reviews List */}
            {reviewSummary.total_reviews === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">
                  Sin reseñas todavía
                </h3>
                <p className="text-[var(--text-muted)]">
                  Sé el primero en compartir tu experiencia con este producto.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-[var(--text-muted)]">
                  Las reseñas de clientes se mostrarán aquí.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {/* Ask Question */}
            <div className="rounded-lg bg-[var(--bg-subtle)] p-4">
              <h3 className="mb-2 font-medium text-[var(--text-primary)]">¿Tenés una pregunta?</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribí tu pregunta sobre este producto..."
                  className="flex-1 rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <button className="rounded-lg bg-[var(--primary)] px-6 py-2 font-medium text-white transition-opacity hover:opacity-90">
                  Preguntar
                </button>
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mb-2 text-lg font-medium text-[var(--text-primary)]">
                  Sin preguntas todavía
                </h3>
                <p className="text-[var(--text-muted)]">
                  Sé el primero en hacer una pregunta sobre este producto.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="overflow-hidden rounded-lg border border-[var(--border-default)]"
                  >
                    <button
                      onClick={() => toggleQuestion(q.id)}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[var(--bg-subtle)]"
                    >
                      <div className="flex items-start gap-3">
                        <User className="mt-0.5 h-5 w-5 text-[var(--text-muted)]" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{q.question}</p>
                          <p className="text-sm text-[var(--text-muted)]">
                            {q.user_name} · {new Date(q.created_at).toLocaleDateString('es-PY')}
                          </p>
                        </div>
                      </div>
                      {expandedQuestions.has(q.id) ? (
                        <ChevronUp className="h-5 w-5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
                      )}
                    </button>

                    {expandedQuestions.has(q.id) && (
                      <div className="ml-8 px-4 pb-4">
                        <div className="rounded-lg bg-[var(--bg-subtle)] p-4">
                          <p className="text-[var(--text-primary)]">{q.answer}</p>
                          <p className="mt-2 text-sm text-[var(--text-muted)]">
                            {q.answerer_name} ·{' '}
                            {new Date(q.answered_at).toLocaleDateString('es-PY')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
