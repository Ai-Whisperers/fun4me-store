'use client'

/**
 * Coupons Table Component
 *
 * REF-006: Extracted table display from client component
 */

import {
  Ticket,
  Tag,
  Copy,
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  Truck,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import type { Coupon, CouponsPagination } from '../types'
import { CouponStatusBadge } from './CouponStatusBadge'
import { formatDiscountValue, formatDate, copyToClipboard } from '../utils'
import { useTranslations } from 'next-intl'

interface CouponsTableProps {
  coupons: Coupon[]
  loading: boolean
  hasFilters: boolean
  pagination: CouponsPagination
  onEdit: (coupon: Coupon) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
  onCreateNew: () => void
}

export function CouponsTable({
  coupons,
  loading,
  hasFilters,
  pagination,
  onEdit,
  onDelete,
  onPageChange,
  onCreateNew,
}: CouponsTableProps): React.ReactElement {
  const t = useTranslations()
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
          <p className="mt-4 text-[var(--text-secondary)]">Cargando cupones...</p>
        </div>
      </div>
    )
  }

  if (coupons.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="p-12 text-center">
          <Ticket className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">No hay cupones</h3>
          <p className="mt-1 text-[var(--text-secondary)]">
            {hasFilters
              ? 'No se encontraron cupones con los filtros aplicados'
              : 'Crea tu primer cupón de descuento'}
          </p>
          {!hasFilters && (
            <button
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Crear Cupón
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Código
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Descuento
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Uso
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Vigencia
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.map((coupon) => (
              <CouponRow
                key={coupon.id}
                coupon={coupon}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} cupones
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-[var(--text-primary)]">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface CouponRowProps {
  coupon: Coupon
  onEdit: (coupon: Coupon) => void
  onDelete: (id: string) => void
}

function CouponRow({ coupon, onEdit, onDelete }: CouponRowProps): React.ReactElement {
  const t = useTranslations()
  return (
    <tr className="transition-colors hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--primary)]/10 rounded-lg p-2">
            <Tag className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {coupon.code}
              </span>
              <button
                onClick={() => copyToClipboard(coupon.code)}
                className="rounded p-1 transition-colors hover:bg-gray-100"
                title="Copiar código"
              >
                <Copy className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>
            {coupon.name && (
              <p className="text-sm text-[var(--text-secondary)]">{coupon.name}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {coupon.discount_type === 'percentage' && (
            <Percent className="h-4 w-4 text-green-600" />
          )}
          {coupon.discount_type === 'fixed_amount' && (
            <DollarSign className="h-4 w-4 text-blue-600" />
          )}
          {coupon.discount_type === 'free_shipping' && (
            <Truck className="h-4 w-4 text-purple-600" />
          )}
          <span className="font-semibold text-[var(--text-primary)]">
            {formatDiscountValue(coupon.discount_type, coupon.discount_value)}
          </span>
        </div>
        {coupon.min_purchase_amount && coupon.min_purchase_amount > 0 && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Mín: ₲ {coupon.min_purchase_amount.toLocaleString('es-PY')}
          </p>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-[var(--text-primary)]">{coupon.usage_count}</span>
          {coupon.usage_limit && (
            <span className="text-[var(--text-secondary)]">/ {coupon.usage_limit}</span>
          )}
        </div>
        {coupon.usage_limit_per_user && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {coupon.usage_limit_per_user} por usuario
          </p>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="flex items-center gap-1 text-[var(--text-primary)]">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            {formatDate(coupon.valid_from)}
          </div>
          <div className="mt-0.5 text-[var(--text-secondary)]">
            → {formatDate(coupon.valid_until)}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <CouponStatusBadge status={coupon.status} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(coupon)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            title={t('common.edit')}
          >
            <Pencil className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(coupon.id)}
            className="rounded-lg p-2 transition-colors hover:bg-red-50"
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  )
}
