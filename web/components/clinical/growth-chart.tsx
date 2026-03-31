'use client'

/**
 * Growth Chart Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Automatic caching of growth standards by breed/gender
 */

import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, TrendingUp, Info, Loader2, AlertCircle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface GrowthStandard {
  age_weeks: number
  weight_kg: number
  percentile: string
}

interface WeightRecord {
  date: string
  weight_kg: number
  age_weeks?: number // Calculated or stored
}

interface GrowthChartProps {
  breed: string
  gender: 'male' | 'female'
  patientRecords: WeightRecord[]
}

// Breed to category mapping for growth standards lookup
// Categories match the breed_category values in the growth_standards table
const BREED_CATEGORY_MAP: Record<string, string> = {
  // Toy breeds (adult weight < 4.5 kg)
  Chihuahua: 'toy',
  'Yorkshire Terrier': 'toy',
  Yorkshire: 'toy',
  Pomeranian: 'toy',
  Maltese: 'toy',
  Papillon: 'toy',
  'Toy Poodle': 'toy',

  // Small breeds (adult weight 4.5 - 10 kg)
  'Shih Tzu': 'small',
  Poodle: 'small',
  'French Bulldog': 'small',
  Beagle: 'small',
  'Cocker Spaniel': 'small',
  Cocker: 'small',
  'Miniature Schnauzer': 'small',
  'Boston Terrier': 'small',
  'Cavalier King Charles': 'small',
  Dachshund: 'small',
  'Jack Russell': 'small',
  'West Highland': 'small',
  Westie: 'small',

  // Medium breeds (adult weight 10 - 25 kg)
  Bulldog: 'medium',
  'Bulldog Inglés': 'medium',
  'Border Collie': 'medium',
  'Australian Shepherd': 'medium',
  Boxer: 'medium',
  Vizsla: 'medium',
  Brittany: 'medium',
  'English Springer Spaniel': 'medium',
  'Shar Pei': 'medium',
  'Basset Hound': 'medium',
  Collie: 'medium',

  // Large breeds (adult weight 25 - 45 kg)
  Labrador: 'large',
  'Labrador Retriever': 'large',
  Retriever: 'large',
  'Golden Retriever': 'large',
  'German Shepherd': 'large',
  'Pastor Alemán': 'large',
  Rottweiler: 'large',
  Doberman: 'large',
  'Doberman Pinscher': 'large',
  Husky: 'large',
  'Siberian Husky': 'large',
  Weimaraner: 'large',
  'Belgian Malinois': 'large',
  'Rhodesian Ridgeback': 'large',
  Akita: 'large',

  // Giant breeds (adult weight > 45 kg)
  'Great Dane': 'giant',
  Mastiff: 'giant',
  'English Mastiff': 'giant',
  'Saint Bernard': 'giant',
  'Irish Wolfhound': 'giant',
  Newfoundland: 'giant',
  'Bernese Mountain Dog': 'giant',
  Leonberger: 'giant',
  'Great Pyrenees': 'giant',
  'Cane Corso': 'giant',

  // Cat breeds
  'Maine Coon': 'cat_large',
  Ragdoll: 'cat_large',
  'Norwegian Forest': 'cat_large',
  'British Shorthair': 'cat_standard',
  Persian: 'cat_standard',
  Siamese: 'cat_standard',
  Bengal: 'cat_standard',
  Abyssinian: 'cat_standard',
  Sphynx: 'cat_standard',
  'Russian Blue': 'cat_standard',
  'Domestic Shorthair': 'cat_standard',
  'Domestic Longhair': 'cat_standard',
  Mestizo: 'cat_standard', // Default for cats
}

function getBreedCategory(breed: string): {
  category: string
  displayName: string
  isExact: boolean
} {
  // First try exact match
  if (breed in BREED_CATEGORY_MAP) {
    return { category: BREED_CATEGORY_MAP[breed], displayName: breed, isExact: true }
  }

  // Try to find a partial match in the breed name
  for (const [key, category] of Object.entries(BREED_CATEGORY_MAP)) {
    if (
      breed.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(breed.toLowerCase())
    ) {
      return { category, displayName: key, isExact: false }
    }
  }

  // Default to medium for dogs if no match found
  // Note: cats should be detected by species, but if only breed is passed, assume dog
  return { category: 'medium', displayName: '', isExact: false } // displayName set via translation
}

export function GrowthChart({ breed, gender, patientRecords }: GrowthChartProps) {
  const t = useTranslations('clinical.growthChart')
  const locale = useLocale()
  const [mounted, setMounted] = useState(false)

  // Wait for client-side mount to avoid ResponsiveContainer SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine breed category (memoized to avoid recalculation)
  const { category, displayName, isExact } = useMemo(() => getBreedCategory(breed), [breed])
  const usingFallback = !isExact
  const actualBreedUsed = displayName

  // React Query for fetching growth standards
  const {
    data: standardData = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: queryKeys.clinical.growthStandards(category, gender),
    queryFn: async (): Promise<GrowthStandard[]> => {
      const response = await fetch(
        `/api/growth_standards?breed_category=${encodeURIComponent(category)}&gender=${gender}`
      )
      if (!response.ok) {
        throw new Error('errorLoading')
      }
      return response.json()
    },
    staleTime: staleTimes.STATIC,
    gcTime: gcTimes.LONG,
  })

  // Determine max age from patient records or default to 52 weeks
  const patientMaxAge = Math.max(
    52,
    ...patientRecords.filter((p) => p.age_weeks != null).map((p) => p.age_weeks as number)
  )
  // Round up to nearest 4 weeks for nice axis
  const maxWeeks = Math.ceil(patientMaxAge / 4) * 4

  // Check if we have any patient data with age_weeks
  const hasAgeData = patientRecords.some((p) => p.age_weeks != null)

  // Build chart data
  const chartData: Array<{
    name: string
    age: number
    Standard: number | null
    Patient: number | null
  }> = []

  // Helper for axis labels
  const getAgeLabel = (weeks: number): string => {
    if (maxWeeks > 52) {
      return t('monthLabel', { months: Math.round(weeks / 4.33) })
    }
    return t('weekLabel', { weeks })
  }

  if (hasAgeData) {
    // Age-based chart (growth chart mode)
    const step = maxWeeks > 104 ? 8 : 4 // Use larger steps for older pets
    for (let i = 0; i <= maxWeeks; i += step) {
      const std = standardData.find((d) => d.age_weeks >= i && d.age_weeks < i + step)

      // Find patient record near this week (within half the step size)
      const patient = patientRecords.find(
        (p) => p.age_weeks != null && Math.abs(p.age_weeks - i) < step / 2 + 1
      )

      chartData.push({
        name: getAgeLabel(i),
        age: i,
        Standard: std ? std.weight_kg : null,
        Patient: patient ? patient.weight_kg : null,
      })
    }

    // Also add any patient records that weren't matched to ensure all data points show
    // Non-null assertions safe: early return ensures age_weeks is non-null
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    patientRecords.forEach((p) => {
      if (p.age_weeks == null) return
      const existingPoint = chartData.find(
        (d) => Math.abs(d.age - p.age_weeks!) < (maxWeeks > 104 ? 4 : 2)
      )
      if (!existingPoint) {
        const std = standardData.find(
          (d) => d.age_weeks >= p.age_weeks! && d.age_weeks < p.age_weeks! + 4
        )
        chartData.push({
          name: getAgeLabel(p.age_weeks),
          age: p.age_weeks,
          Standard: std ? std.weight_kg : null,
          Patient: p.weight_kg,
        })
      }
    })
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    // Sort by age
    chartData.sort((a, b) => a.age - b.age)
  } else {
    // Date-based chart (weight tracking mode - no birth date)
    patientRecords.forEach((p, idx) => {
      const date = new Date(p.date)
      chartData.push({
        name: date.toLocaleDateString(locale === 'es' ? 'es-PY' : 'en-US', { day: 'numeric', month: 'short' }),
        age: idx,
        Standard: null,
        Patient: p.weight_kg,
      })
    })
  }

  if (loading || !mounted) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-gray-400">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-[var(--status-error)]">
          <AlertCircle className="h-5 w-5" />
          <p>{t('errorLoading')}</p>
        </div>
      </div>
    )
  }

  // Get the display breed name, using translation for default
  const displayBreed = actualBreedUsed || t('defaultBreed')

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
            {t('title')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('subtitle', { breed: actualBreedUsed || breed })}
          </p>
        </div>
      </div>

      {/* Warning if using fallback data */}
      {usingFallback && (
        <div className="mb-4 rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3">
          <div className="flex gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--status-warning)]" />
            <p className="text-[var(--status-warning-text)]">
              {t('fallbackWarning', { breed, fallbackBreed: displayBreed })}
            </p>
          </div>
        </div>
      )}

      {/* Info if no patient weight records */}
      {patientRecords.length === 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex gap-2 text-sm">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <p className="text-blue-700">
              {t('noRecordsInfo')}
            </p>
          </div>
        </div>
      )}

      <div className="h-[300px] w-full min-h-[300px]" style={{ minWidth: 300 }}>
        <ResponsiveContainer width="100%" height={300} minWidth={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} unit=" kg" />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Standard"
              stroke="#E5E7EB"
              strokeWidth={2}
              dot={false}
              name={t('legendStandard')}
            />
            <Line
              type="monotone"
              dataKey="Patient"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={t('legendPatient')}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
