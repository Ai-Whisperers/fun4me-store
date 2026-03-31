'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Heart, CheckCircle2, Calendar, List, Trash2, Search, Dog } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  gender: string
}

interface ReproductiveCycle {
  id: string
  pet_id: string
  cycle_start: string
  cycle_end: string
  notes?: string
}

export default function ReproductiveCyclesClient({ clinic }: { clinic: string }) {
  const t = useTranslations('reproductiveCycles')
  const supabase = createClient()
  const { showToast } = useToast()
  const router = useRouter()

  const [petId, setPetId] = useState('')
  const [pets, setPets] = useState<Pet[]>([])
  const [cycles, setCycles] = useState<ReproductiveCycle[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  // Fetch pets
  useEffect(() => {
    const loadPets = async () => {
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, breed, gender')
        .eq('gender', 'female') // Only show females
        .order('name')
      if (data) setPets(data)
    }
    loadPets()
  }, [supabase])

  // Fetch history for selected pet
  useEffect(() => {
    if (!petId) {
      setCycles([])
      return
    }
    const loadCycles = async () => {
      const { data } = await supabase
        .from('reproductive_cycles')
        .select('*')
        .eq('pet_id', petId)
        .order('cycle_start', { ascending: false })
      if (data) setCycles(data)
    }
    loadCycles()
  }, [petId, supabase])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!petId) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/reproductive_cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          cycle_start: startDate,
          cycle_end: endDate,
          notes: notes,
        }),
      })
      if (res.ok) {
        setStartDate('')
        setEndDate('')
        setNotes('')
        showToast(t('cycleSaved'))
        router.refresh() // Update list
        // Refresh local cycles list
        const { data } = await supabase
          .from('reproductive_cycles')
          .select('*')
          .eq('pet_id', petId)
          .order('cycle_start', { ascending: false })
        if (data) setCycles(data)
      }
    } catch (_err) {
      showToast(t('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    const res = await fetch('/api/reproductive_cycles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setCycles((prev) => prev.filter((c) => c.id !== id))
      showToast(t('recordDeleted'))
    }
  }

  const getNextHeatEstimate = (lastStart: string) => {
    const date = new Date(lastStart)
    date.setMonth(date.getMonth() + 6) // Average for many breeds
    return date
  }

  const isCurrentlyActive = (start: string, end: string) => {
    const now = new Date()
    const s = new Date(start)
    const e = new Date(end)
    return now >= s && now <= e
  }

  const selectedPet = pets.find((p) => p.id === petId)

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
              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                {t('title')}
              </h1>
              <p className="text-sm font-medium text-gray-500">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              {t('patientFemales')}
            </span>
            <select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="rounded-xl border-none bg-purple-50 px-4 py-2 font-bold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{t('selectPatient')}</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.breed})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {petId ? (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Status & Predictions */}
            <div className="space-y-6 lg:col-span-1">
              <div className="relative overflow-hidden rounded-[40px] border border-purple-100 bg-white p-8 shadow-xl shadow-purple-100/50">
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-purple-500 opacity-[0.05]"></div>
                <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-gray-400">
                  {t('currentStatus')}
                </h3>

                {cycles.length > 0 ? (
                  <>
                    {isCurrentlyActive(cycles[0].cycle_start, cycles[0].cycle_end) ? (
                      <div className="py-6 text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-red-100 text-red-600">
                          <Heart className="h-10 w-10 fill-current" />
                        </div>
                        <h4 className="mb-1 text-2xl font-black text-red-600">{t('activeHeat')}</h4>
                        <p className="text-sm text-gray-500">
                          {t('endsApprox', { date: new Date(cycles[0].cycle_end).toLocaleDateString() })}
                        </p>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                          <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <h4 className="mb-1 text-2xl font-black text-gray-800">{t('inactive')}</h4>
                        <p className="px-4 text-sm leading-relaxed text-gray-500">
                          {t('nextHeatEstimate')}
                        </p>
                        <p className="mt-2 text-lg font-black text-purple-600">
                          {getNextHeatEstimate(cycles[0].cycle_start).toLocaleDateString(
                            undefined,
                            { month: 'long', year: 'numeric' }
                          )}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-gray-400">
                    <Calendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
                    <p className="text-sm font-medium">{t('noHistoricalData')}</p>
                  </div>
                )}
              </div>

              {/* Add New Cycle Form */}
              <div className="rounded-[40px] border border-gray-100 bg-white p-8 shadow-xl">
                <h3 className="mb-6 text-lg font-black text-gray-900">{t('registerNewCycle')}</h3>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                      {t('heatStart')}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full rounded-2xl border-none bg-gray-50 p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                      {t('endEstimatedReal')}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full rounded-2xl border-none bg-gray-50 p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                      {t('notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('notesPlaceholder')}
                      className="h-24 w-full rounded-2xl border-none bg-gray-50 p-4 font-medium text-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full rounded-2xl bg-purple-600 py-4 font-black text-white shadow-lg shadow-purple-200 transition-all hover:-translate-y-1 hover:shadow-xl disabled:opacity-50"
                  >
                    {isSaving ? t('saving') : t('registerCycle')}
                  </button>
                </form>
              </div>
            </div>

            {/* Timeline & History */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-xl">
                <h3 className="mb-8 flex items-center gap-3 text-xl font-black text-gray-900">
                  <List className="h-6 w-6 text-purple-500" />
                  {t('cycleHistory')}
                </h3>

                <div className="space-y-6">
                  {cycles.length > 0 ? (
                    cycles.map((c) => (
                      <div
                        key={c.id}
                        className="group relative border-l-4 border-purple-100 pb-2 pl-10"
                      >
                        <div className="absolute left-[-10px] top-0 h-4 w-4 rounded-full border-4 border-white bg-purple-500 shadow-sm"></div>

                        <div className="rounded-3xl border border-transparent bg-gray-50 p-6 transition-colors group-hover:border-purple-100 group-hover:bg-purple-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="mb-2 flex items-center gap-3">
                                <span className="text-lg font-black text-gray-800">
                                  {new Date(c.cycle_start).toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                  })}{' '}
                                  -
                                  {new Date(c.cycle_end).toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                {isCurrentlyActive(c.cycle_start, c.cycle_end) && (
                                  <span className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-black uppercase text-white shadow-lg shadow-red-200">
                                    {t('current')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium leading-relaxed text-gray-500">
                                {c.notes || t('noAdditionalNotes')}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-2 text-gray-300 transition-colors hover:text-red-500"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[40px] border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
                      <Search className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <p className="font-medium text-gray-500">
                        {t('noCyclesRegistered')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-40 text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[40px] bg-purple-50 text-purple-200">
              <Dog className="h-12 w-12" />
            </div>
            <h2 className="mb-4 text-3xl font-black text-gray-900">{t('reproductionMonitor')}</h2>
            <p className="mx-auto max-w-sm font-medium text-gray-500">
              {t('selectFemalePatient')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
