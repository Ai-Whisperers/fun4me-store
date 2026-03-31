'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { submitContactForm } from '@/app/actions/contact-form'
import { Check, Loader2, Send, User, Phone, Dog, MessageSquare } from 'lucide-react'

type FormState = { success: true; message?: string } | { success: false; error: string } | null

// Submit Button with loading state
function SubmitButton({ submittingText, confirmText }: { submittingText: string; confirmText: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] px-6 py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:transform-none disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {submittingText}
        </>
      ) : (
        <>
          {confirmText}
          <Send className="h-5 w-5" />
        </>
      )}
    </button>
  )
}

// Loading skeleton that matches the form layout
function FormSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
      <div className="mb-6">
        <div className="mb-2 h-7 w-32 rounded bg-gray-200" />
        <div className="h-4 w-64 rounded bg-gray-100" />
      </div>
      <div className="space-y-4">
        <div>
          <div className="mb-2 h-4 w-20 rounded bg-gray-200" />
          <div className="h-14 rounded-xl bg-gray-100" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 h-4 w-16 rounded bg-gray-200" />
            <div className="h-14 rounded-xl bg-gray-100" />
          </div>
          <div>
            <div className="mb-2 h-4 w-16 rounded bg-gray-200" />
            <div className="h-14 rounded-xl bg-gray-100" />
          </div>
        </div>
        <div>
          <div className="mb-2 h-4 w-36 rounded bg-gray-200" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
        <div className="h-14 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

// The actual form component
function AppointmentFormContent() {
  const [state, formAction] = useActionState<FormState, FormData>(submitContactForm, null)
  const t = useTranslations('booking')

  if (state?.success) {
    return (
      <div className="animate-scale-in rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
          <Check className="h-8 w-8" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-green-800">{t('requestSent')}</h3>
        <p className="text-green-700">{state.message || t('willContactYou')}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 text-sm font-bold text-green-800 transition-colors hover:text-green-900 hover:underline"
        >
          {t('sendAnother')}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)] md:p-8">
      <div className="mb-6">
        <h3 className="font-heading mb-2 text-xl font-black text-[var(--text-primary)] md:text-2xl">
          {t('title')}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {t('subtitle')}
        </p>
      </div>

      <form action={formAction} className="space-y-4" autoComplete="off" data-form-type="other">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name-field"
            className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
          >
            {t('yourName')}{' '}
            <span className="text-red-600" aria-label="requerido">
              *
            </span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
              <User className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
            </div>
            <input
              id="name-field"
              name="name"
              type="text"
              required
              placeholder={t('namePlaceholder')}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              aria-invalid={state?.error ? 'true' : 'false'}
              aria-describedby={state?.error ? 'name-error' : undefined}
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-16 pr-4 text-[var(--text-primary)] outline-none transition-all placeholder:text-gray-400 focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
          {state && !state.success && (
            <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">
              {state.error}
            </p>
          )}
        </div>

        {/* Phone and Pet Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="phone-field"
              className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
            >
              {t('phone')}{' '}
              <span className="text-red-600" aria-label="requerido">
                *
              </span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
                <Phone className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
              </div>
              <input
                id="phone-field"
                name="phone"
                type="tel"
                required
                placeholder={t('phonePlaceholder')}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                aria-invalid="false"
                aria-describedby="phone-help"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-16 pr-4 text-[var(--text-primary)] outline-none transition-all placeholder:text-gray-400 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
            <p id="phone-help" className="sr-only">
              {t('phoneHelp')}
            </p>
          </div>
          <div>
            <label
              htmlFor="pet-field"
              className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
            >
              {t('pet')}{' '}
              <span className="text-red-600" aria-label="requerido">
                *
              </span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
                <Dog className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
              </div>
              <input
                id="pet-field"
                name="petName"
                type="text"
                required
                placeholder={t('petPlaceholder')}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                aria-invalid="false"
                aria-describedby="pet-help"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-16 pr-4 text-[var(--text-primary)] outline-none transition-all placeholder:text-gray-400 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
            <p id="pet-help" className="sr-only">
              {t('petHelp')}
            </p>
          </div>
        </div>

        {/* Reason Field */}
        <div>
          <label
            htmlFor="reason-field"
            className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
          >
            {t('consultReason')}{' '}
            <span className="text-red-600" aria-label="requerido">
              *
            </span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-subtle)]">
              <MessageSquare className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
            </div>
            <textarea
              id="reason-field"
              name="reason"
              required
              placeholder={t('reasonPlaceholder')}
              rows={3}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              aria-invalid="false"
              aria-describedby="reason-help"
              className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 bg-white py-3.5 pl-16 pr-4 text-[var(--text-primary)] outline-none transition-all placeholder:text-gray-400 focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
          <p id="reason-help" className="sr-only">
            {t('reasonHelp')}
          </p>
        </div>

        <SubmitButton submittingText={t('submitting')} confirmText={t('confirmRequest')} />

        <p className="pt-2 text-center text-xs text-[var(--text-muted)]">
          {t('termsNotice')}
        </p>
      </form>
    </div>
  )
}

// Main export: Client-only wrapper to prevent hydration mismatch from browser extensions
export function AppointmentForm() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Show skeleton during SSR and initial client render
  // This prevents hydration mismatch because the skeleton is identical on server and client
  // The actual form only renders after React has fully hydrated
  if (!isMounted) {
    return <FormSkeleton />
  }

  return <AppointmentFormContent />
}
