'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Activity, History, ChevronRight, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
}

interface AssessmentHistory {
  id: string
  assessed_at: string
  score: number
  scores?: AssessmentScore
  notes?: string
}

interface AssessmentScore {
  hurt: number
  hunger: number
  hydration: number
  hygiene: number
  happiness: number
  mobility: number
  more_good_days: number
}

const CRITERIA_KEYS = [
  'hurt',
  'hunger',
  'hydration',
  'hygiene',
  'happiness',
  'mobility',
  'more_good_days',
] as const

export default function EuthanasiaAssessmentClient({
  clinic,
  initialPetId,
}: {
  clinic: string
  initialPetId?: string
}) {
  const t = useTranslations('euthanasiaAssessments')
  const supabase = createClient()
  const { showToast } = useToast()
  const router = useRouter()

  const [petId, setPetId] = useState(initialPetId || '')
  const [pets, setPets] = useState<Pet[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useState<AssessmentHistory[]>([])

  const [scores, setScores] = useState<AssessmentScore>({
    hurt: 5,
    hunger: 5,
    hydration: 5,
    hygiene: 5,
    happiness: 5,
    mobility: 5,
    more_good_days: 5,
  })

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

  // Fetch pets for selection
  useEffect(() => {
    const loadPets = async () => {
      const { data } = await supabase.from('pets').select('id, name, species, breed').order('name')
      if (data) setPets(data)
    }
    loadPets()
  }, [supabase])

  // Fetch history for selected pet
  useEffect(() => {
    if (!petId) return
    const loadHistory = async () => {
      const { data } = await supabase
        .from('euthanasia_assessments')
        .select('*')
        .eq('pet_id', petId)
        .order('assessed_at', { ascending: false })
      if (data) setHistory(data)
    }
    loadHistory()
  }, [petId, supabase])

  const getInterpretation = (score: number) => {
    if (score > 50)
      return { text: t('interpretation.excellent'), color: 'text-green-600', bg: 'bg-green-50' }
    if (score > 35)
      return { text: t('interpretation.acceptable'), color: 'text-blue-600', bg: 'bg-blue-50' }
    if (score > 25)
      return { text: t('interpretation.compromised'), color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { text: t('interpretation.consider'), color: 'text-red-600', bg: 'bg-red-50' }
  }

  const status = getInterpretation(totalScore)

  const handleSliderChange = (key: keyof AssessmentScore, value: string) => {
    setScores((prev) => ({ ...prev, [key]: parseInt(value) }))
  }

  const handleSave = async () => {
    if (!petId) {
      showToast(t('selectPatientFirst'))
      return
    }

    setIsSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Generate details string for notes
      const breakdown = CRITERIA_KEYS.map(
        (key) => `${t(`criteria.${key}.label`)}: ${scores[key as keyof AssessmentScore]}/10`
      ).join('\n')
      const finalNotes = `--- ${t('breakdownTitle')} ---\n${breakdown}\n\n--- ${t('additionalNotesTitle')} ---\n${notes}`

      const payload = {
        pet_id: petId,
        score: totalScore,
        notes: finalNotes,
        assessed_by: user?.id,
      }

      const response = await fetch('/api/euthanasia_assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        showToast(t('savedSuccessfully'))
        router.refresh() // Refresh history
        setNotes('')
      } else {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save')
      }
    } catch (error) {
      // TICKET-TYPE-004: Proper error handling without any
      showToast(error instanceof Error ? error.message : t('saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${clinic}/portal/dashboard`}
              className="rounded-xl p-2 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">{t('title')}</h1>
              <p className="text-sm font-medium text-gray-500">
                {t('subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {t('patient')}
              </span>
              <select
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
                className="rounded-xl border-none bg-gray-50 px-4 py-2 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">{t('selectPatient')}</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Assessment Form */}
          <div className="space-y-6 lg:col-span-2">
            <div className="relative overflow-hidden rounded-[40px] border border-gray-100 bg-white p-10 shadow-xl shadow-gray-200/50">
              <div className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-[var(--primary)] opacity-[0.03]"></div>

              <h2 className="mb-8 flex items-center gap-3 text-xl font-black text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm text-white">
                  1
                </span>
                {t('evaluationCriteria')}
              </h2>

              {CRITERIA_KEYS.map((key) => (
                <div key={key} className="group mb-10 last:mb-0">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="max-w-md">
                      <label className="block text-lg font-bold text-gray-800 transition-colors group-hover:text-[var(--primary)]">
                        {t(`criteria.${key}.label`)}
                      </label>
                      <p className="mt-1 text-sm leading-relaxed text-gray-500">{t(`criteria.${key}.desc`)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-4xl font-black tabular-nums ${
                          scores[key as keyof AssessmentScore] < 5
                            ? 'text-red-500'
                            : 'text-[var(--primary)]'
                        }`}
                      >
                        {scores[key as keyof AssessmentScore]}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-300">
                        {t('points')}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={scores[key as keyof AssessmentScore]}
                    onChange={(e) =>
                      handleSliderChange(key as keyof AssessmentScore, e.target.value)
                    }
                    className="h-3 w-full cursor-pointer appearance-none rounded-2xl bg-gray-100 accent-[var(--primary)] focus:outline-none"
                  />
                  <div className="mt-3 flex justify-between px-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span className="text-red-400">{t('criticalState')}</span>
                    <span className="text-green-500">{t('optimalState')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Notes */}
            <div className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-xl shadow-gray-200/50">
              <h2 className="mb-6 flex items-center gap-3 text-xl font-black text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm text-white">
                  2
                </span>
                {t('clinicalObservations')}
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="h-40 w-full rounded-3xl border-none bg-gray-50 p-6 font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-xl shadow-gray-200/50">
                <h2 className="mb-6 flex items-center gap-3 text-xl font-black text-gray-900">
                  <History className="h-6 w-6 text-gray-400" />
                  {t('historyTitle')}
                </h2>
                <div className="space-y-4">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-gray-800">{t('pointsCount', { count: h.score })}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getInterpretation(h.score).bg} ${getInterpretation(h.score).color}`}
                          >
                            {getInterpretation(h.score).text}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-500">
                          {new Date(h.assessed_at).toLocaleDateString(undefined, {
                            dateStyle: 'long',
                          })}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Score Card */}
          <div className="lg:col-span-1">
            <div className="shadow-[var(--primary)]/10 sticky top-28 overflow-hidden rounded-[40px] border border-gray-100 bg-white p-10 shadow-2xl">
              <div className="absolute left-0 top-0 h-2 w-full bg-[var(--primary)]"></div>

              <h2 className="mb-8 text-center text-xl text-xs font-black uppercase tracking-widest text-gray-900 opacity-50">
                {t('qualityIndex')}
              </h2>

              <div className="relative mb-10 scale-110 text-center">
                <div className="text-8xl font-black tracking-tighter text-[var(--primary)] drop-shadow-sm">
                  {totalScore}
                </div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                  {t('outOfPoints')}
                </div>
              </div>

              <div
                className={`mb-10 rounded-3xl p-6 text-center ${status.bg} border border-${status.color.split('-')[1]}-100 transition-all duration-500`}
              >
                <div
                  className={`h-12 w-12 rounded-2xl ${status.bg} mx-auto mb-3 flex items-center justify-center shadow-inner`}
                >
                  <Activity className={`h-6 w-6 ${status.color}`} />
                </div>
                <p className={`text-lg font-black ${status.color} leading-snug`}>{status.text}</p>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !petId}
                className="shadow-[var(--primary)]/30 flex w-full items-center justify-center gap-3 rounded-3xl bg-[var(--primary)] py-5 font-black text-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
              >
                {isSaving ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Save className="h-6 w-6" />
                )}
                {isSaving ? t('saving') : t('finishEvaluation')}
              </button>

              <div className="mt-8 rounded-3xl border border-blue-100/50 bg-blue-50/50 p-6">
                <p className="text-center text-[11px] font-bold italic leading-relaxed text-blue-800">
                  {t('disclaimer')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
