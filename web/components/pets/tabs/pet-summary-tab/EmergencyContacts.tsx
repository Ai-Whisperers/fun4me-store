/**
 * Emergency Contacts Component
 *
 * Displays primary vet and emergency contact information.
 */

'use client'

import { Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface EmergencyContactsProps {
  primaryVetName?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
}

export function EmergencyContacts({
  primaryVetName,
  emergencyContactName,
  emergencyContactPhone,
}: EmergencyContactsProps) {
  const t = useTranslations('pets.tabs.summary')

  // Don't render if no contacts
  if (!primaryVetName && !emergencyContactName) {
    return null
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-primary)]">
        <Phone className="h-4 w-4 text-blue-500" />
        {t('contacts')}
      </h3>
      <div className="space-y-3">
        {primaryVetName && (
          <div>
            <span className="text-xs text-gray-500">{t('primaryVet')}</span>
            <p className="text-sm font-medium">{primaryVetName}</p>
          </div>
        )}
        {emergencyContactName && (
          <div>
            <span className="text-xs text-gray-500">{t('emergencyContact')}</span>
            <p className="text-sm font-medium">{emergencyContactName}</p>
            {emergencyContactPhone && (
              <p className="text-sm text-gray-600">{emergencyContactPhone}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
