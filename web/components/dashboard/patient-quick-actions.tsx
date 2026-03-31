'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  FileText,
  Syringe,
  Pill,
  Heart,
  Stethoscope,
  FlaskConical,
  Camera,
  MessageSquare,
  MoreHorizontal,
  X,
  Bed,
  ClipboardList,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PatientQuickActionsProps {
  clinic: string
  petId: string
  petName: string
  ownerId: string
}

interface QuickActionDef {
  icon: React.ElementType
  labelKey: string
  hrefFn: (clinic: string, petId: string, ownerId: string) => string
  color: string
  bgColor: string
}

interface QuickAction {
  icon: React.ElementType
  label: string
  href: string
  color: string
  bgColor: string
}

// Static action definitions with translation keys
const primaryActionDefs: QuickActionDef[] = [
  {
    icon: Calendar,
    labelKey: 'actions.newAppointment',
    hrefFn: (clinic, petId, ownerId) => `/${clinic}/dashboard/appointments/new?pet=${petId}&client=${ownerId}`,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 hover:bg-blue-200',
  },
  {
    icon: FileText,
    labelKey: 'actions.medicalHistory',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/records/new?pet=${petId}`,
    color: 'text-green-600',
    bgColor: 'bg-green-100 hover:bg-green-200',
  },
  {
    icon: Syringe,
    labelKey: 'actions.vaccine',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/vaccines/add?pet=${petId}`,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 hover:bg-purple-200',
  },
  {
    icon: Pill,
    labelKey: 'actions.prescription',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/prescriptions/new?pet=${petId}`,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 hover:bg-orange-200',
  },
]

const secondaryActionDefs: QuickActionDef[] = [
  {
    icon: FlaskConical,
    labelKey: 'actions.lab',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/lab/new?pet=${petId}`,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 hover:bg-cyan-200',
  },
  {
    icon: Bed,
    labelKey: 'actions.hospitalize',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/hospital/admit?pet=${petId}`,
    color: 'text-red-600',
    bgColor: 'bg-red-100 hover:bg-red-200',
  },
  {
    icon: Heart,
    labelKey: 'actions.qualityOfLife',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/assessments/new?pet=${petId}`,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 hover:bg-pink-200',
  },
  {
    icon: Stethoscope,
    labelKey: 'actions.quickConsult',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/consultations/quick?pet=${petId}`,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 hover:bg-indigo-200',
  },
  {
    icon: ClipboardList,
    labelKey: 'actions.consent',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/consents/new?pet=${petId}`,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 hover:bg-amber-200',
  },
  {
    icon: Camera,
    labelKey: 'actions.photoDoc',
    hrefFn: (clinic, petId) => `/${clinic}/dashboard/documents/upload?pet=${petId}`,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 hover:bg-teal-200',
  },
  {
    icon: MessageSquare,
    labelKey: 'actions.messageOwner',
    hrefFn: (clinic, _petId, ownerId) => `/${clinic}/dashboard/messages/new?client=${ownerId}`,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 hover:bg-emerald-200',
  },
]

export function PatientQuickActions({
  clinic,
  petId,
  petName,
  ownerId,
}: PatientQuickActionsProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)
  const t = useTranslations('dashboard.patientQuickActions')

  // Build translated actions with proper hrefs
  const primaryActions: QuickAction[] = useMemo(() =>
    primaryActionDefs.map((def) => ({
      icon: def.icon,
      label: t(def.labelKey),
      href: def.hrefFn(clinic, petId, ownerId),
      color: def.color,
      bgColor: def.bgColor,
    })), [t, clinic, petId, ownerId])

  const secondaryActions: QuickAction[] = useMemo(() =>
    secondaryActionDefs.map((def) => ({
      icon: def.icon,
      label: t(def.labelKey),
      href: def.hrefFn(clinic, petId, ownerId),
      color: def.color,
      bgColor: def.bgColor,
    })), [t, clinic, petId, ownerId])

  const ActionButton = ({ action }: { action: QuickAction }): React.ReactElement => {
    const Icon = action.icon

    return (
      <Link
        href={action.href}
        className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all ${action.bgColor}`}
        title={action.label}
      >
        <Icon className={`h-5 w-5 ${action.color}`} />
        <span className="text-center text-xs font-medium leading-tight text-gray-700">
          {action.label}
        </span>
      </Link>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,var(--primary))] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/80">
                    {t('title')}
                  </p>
                  <p className="truncate font-semibold text-white">{petName}</p>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="rounded-lg bg-white/20 p-1.5 transition-colors hover:bg-white/30"
                  aria-label={t('closeActions')}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('frequent')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {primaryActions.map((action) => (
                  <ActionButton key={action.label} action={action} />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Secondary Actions */}
            <div className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t('more')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {secondaryActions.map((action) => (
                  <ActionButton key={action.label} action={action} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
          isExpanded ? 'bg-gray-800 hover:bg-gray-700' : 'bg-[var(--primary)] hover:opacity-90'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={
          isExpanded ? t('closeMenu') : t('openActions', { petName })
        }
        aria-expanded={isExpanded}
      >
        <motion.div animate={{ rotate: isExpanded ? 45 : 0 }} transition={{ duration: 0.2 }}>
          {isExpanded ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <MoreHorizontal className="h-6 w-6 text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  )
}
