'use client'

/**
 * Pagination Component
 *
 * Page navigation for the product list.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationInfo } from './types'

interface PaginationProps {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
}

export function Pagination({ pagination, onPageChange }: PaginationProps): React.ReactElement | null {
  if (pagination.pages <= 1) {
    return null
  }

  // Calculate which page numbers to show
  const getPageNumbers = (): number[] => {
    const pages: number[] = []
    const maxVisible = 5

    for (let i = 0; i < Math.min(maxVisible, pagination.pages); i++) {
      let pageNum: number
      if (pagination.pages <= maxVisible) {
        pageNum = i + 1
      } else if (pagination.page <= 3) {
        pageNum = i + 1
      } else if (pagination.page >= pagination.pages - 2) {
        pageNum = pagination.pages - maxVisible + 1 + i
      } else {
        pageNum = pagination.page - 2 + i
      }
      pages.push(pageNum)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
      <div className="text-sm text-gray-500">
        Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}{' '}
        productos
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrev}
          className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`h-10 w-10 rounded-xl text-sm font-bold transition ${
                pagination.page === pageNum
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNext}
          className="rounded-xl p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
