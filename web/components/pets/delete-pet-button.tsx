'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { deletePet } from '@/app/actions/pets'

interface Props {
  petId: string
  petName: string
  clinic: string
}

export function DeletePetButton({ petId, petName, clinic }: Props): React.ReactElement {
  const t = useTranslations('pets.delete')
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(): Promise<void> {
    setError(null)

    startTransition(async () => {
      const result = await deletePet(petId)

      if (!result.success) {
        setError(result.error)
        setShowConfirm(false)
      } else {
        router.push(`/${clinic}/portal/dashboard`)
        router.refresh()
      }
    })
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--status-error-border)] py-3 font-bold text-[var(--status-error)] transition-colors hover:bg-[var(--status-error-bg)]"
      >
        <Icons.Trash2 className="h-4 w-4" />
        {t('button')}
      </button>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[var(--status-error-bg)] p-2">
          <Icons.AlertTriangle className="h-5 w-5 text-[var(--status-error)]" />
        </div>
        <div>
          <h4 className="font-bold text-[var(--status-error-text)]">{t('confirmTitle', { name: petName })}</h4>
          <p className="text-sm text-[var(--status-error-text)]">
            {t('confirmMessage')}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-[var(--status-error-bg)] p-2 text-sm text-[var(--status-error-text)]">{error}</div>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--status-error)] px-4 py-2 font-bold text-white transition-colors hover:opacity-90"
        >
          {isPending ? (
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Icons.Trash2 className="h-4 w-4" />
              {t('confirm')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
