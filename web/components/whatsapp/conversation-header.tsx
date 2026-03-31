'use client'

import * as Icons from 'lucide-react'
import Link from 'next/link'

interface ConversationHeaderProps {
  phoneNumber: string
  clientName?: string
  clientId?: string
  petName?: string
  petId?: string
  clinic: string
  onClose?: () => void
}

export function ConversationHeader({
  phoneNumber,
  clientName,
  clientId,
  petName,
  petId,
  clinic,
  onClose,
}: ConversationHeaderProps) {
  return (
    <div className="border-b border-gray-100 bg-white px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Back button (mobile) */}
        {onClose && (
          <button
            onClick={onClose}
            className="-ml-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-gray-100 md:hidden"
          >
            <Icons.ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        )}

        {/* Avatar */}
        <div className="bg-[var(--primary)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Icons.User className="h-5 w-5 text-[var(--primary)]" />
        </div>

        {/* Contact info */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-[var(--text-primary)]">
            {clientName || phoneNumber}
          </h3>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="truncate">{phoneNumber}</span>
            {petName && (
              <>
                <span className="shrink-0">•</span>
                <span className="flex shrink-0 items-center gap-1">
                  <Icons.PawPrint className="h-3 w-3" />
                  <span className="max-w-[80px] truncate sm:max-w-none">{petName}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {clientId && (
            <Link
              href={`/${clinic}/dashboard/clients/${clientId}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-gray-100"
              title="Ver cliente"
            >
              <Icons.ExternalLink className="h-5 w-5 text-[var(--text-secondary)]" />
            </Link>
          )}
          {petId && (
            <Link
              href={`/${clinic}/dashboard/patients/${petId}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-gray-100"
              title="Ver mascota"
            >
              <Icons.PawPrint className="h-5 w-5 text-[var(--text-secondary)]" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
