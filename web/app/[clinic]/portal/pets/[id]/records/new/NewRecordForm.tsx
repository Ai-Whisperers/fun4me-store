'use client'

import { useState } from 'react'
import { createMedicalRecord } from '@/app/actions/medical-records'
import { useFormStatus } from 'react-dom'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { DiagnosisSearch } from '@/components/clinical/diagnosis-search'
import { DosageCalculator } from '@/components/clinical/dosage-calculator'
import { QoLAssessment } from '@/components/clinical/qol-assessment'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <Icons.Loader2 className="animate-spin" />
      ) : (
        <>
          <Icons.Save className="h-5 w-5" /> Guardar Registro
        </>
      )}
    </button>
  )
}

export default function NewRecordForm({
  clinic,
  petId,
  initialWeight,
}: {
  clinic: string
  petId: string
  initialWeight?: number
}) {
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [showToolbox, setShowToolbox] = useState<'calculator' | 'qol' | null>(null)

  const handleQoLComplete = (score: number, summary: string) => {
    setNotes((prev) => prev + (prev ? '\n\n' : '') + summary)
    setShowToolbox(null)
  }

  return (
    <div className="relative">
      <form
        action={createMedicalRecord as unknown as (formData: FormData) => Promise<void>}
        className="space-y-6"
      >
        <input type="hidden" name="clinic" value={clinic} />
        <input type="hidden" name="pet_id" value={petId} />

        {/* Type Selection */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            { id: 'consultation', label: 'Consulta', icon: Icons.Stethoscope },
            { id: 'exam', label: 'Examen', icon: Icons.Microscope },
            { id: 'surgery', label: 'Cirugía', icon: Icons.Scissors },
            { id: 'hospitalization', label: 'Internación', icon: Icons.Bed },
            { id: 'wellness', label: 'Wellness', icon: Icons.HeartPulse },
            { id: 'other', label: 'Otro', icon: Icons.FileText },
          ].map((type) => (
            <label key={type.id} className="cursor-pointer">
              <input type="radio" name="type" value={type.id} className="peer sr-only" required />
              <div className="peer-checked:bg-[var(--primary)]/5 flex flex-col items-center justify-center rounded-xl border-2 border-gray-100 bg-white p-4 transition-all hover:bg-gray-50 peer-checked:border-[var(--primary)]">
                <type.icon className="mb-2 h-6 w-6 text-gray-400 peer-checked:text-[var(--primary)]" />
                <span className="text-sm font-bold text-gray-500 peer-checked:text-[var(--primary)]">
                  {type.label}
                </span>
              </div>
            </label>
          ))}
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Título del Evento</label>
          <input
            name="title"
            type="text"
            placeholder="Ej. Control Anual, Vómitos, Castración..."
            className="w-full rounded-xl border-2 border-gray-100 p-4 font-medium outline-none transition-colors focus:border-[var(--primary)]"
            required
          />
        </div>

        {/* Standardized Diagnosis Integration */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block flex items-center gap-2 text-sm font-bold text-gray-700">
              <Icons.Search className="h-4 w-4 text-blue-500" /> Búsqueda VeNom
            </label>
            <DiagnosisSearch
              onSelect={(d) => setDiagnosis(d.term)}
              placeholder="Buscar término médico..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Diagnóstico Resultante
            </label>
            <input
              name="diagnosis"
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Se autocompleta arriba o escribe manual..."
              className="w-full rounded-xl border-2 border-gray-100 p-4 font-medium outline-none transition-colors focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Vitals Section */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <h3 className="mb-4 flex items-center justify-between gap-2 text-sm font-bold uppercase text-[var(--text-secondary)]">
            <span className="flex items-center gap-2">
              <Icons.Activity className="h-4 w-4" /> Signos Vitales
            </span>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowToolbox(showToolbox === 'qol' ? null : 'qol')}
                className="flex items-center gap-1 font-bold normal-case text-orange-500 hover:underline"
              >
                <Icons.Heart className="h-4 w-4" /> Escala QoL
              </button>
              <button
                type="button"
                onClick={() => setShowToolbox(showToolbox === 'calculator' ? null : 'calculator')}
                className="flex items-center gap-1 font-bold normal-case text-[var(--primary)] hover:underline"
              >
                <Icons.Calculator className="h-4 w-4" /> Calculadora de Dosis
              </button>
            </div>
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Peso (kg)</label>
              <input
                name="weight"
                type="number"
                step="0.1"
                defaultValue={initialWeight}
                className="w-full rounded-xl border border-gray-200 p-3 text-center font-bold outline-none focus:border-[var(--primary)]"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Temp (°C)</label>
              <input
                name="temp"
                type="number"
                step="0.1"
                className="w-full rounded-xl border border-gray-200 p-3 text-center font-bold outline-none focus:border-[var(--primary)]"
                placeholder="38.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">
                Frec. Card. (lpm)
              </label>
              <input
                name="hr"
                type="number"
                className="w-full rounded-xl border border-gray-200 p-3 text-center font-bold outline-none focus:border-[var(--primary)]"
                placeholder="80"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">
                Frec. Resp. (rpm)
              </label>
              <input
                name="rr"
                type="number"
                className="w-full rounded-xl border border-gray-200 p-3 text-center font-bold outline-none focus:border-[var(--primary)]"
                placeholder="20"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">Notas Clínicas</label>
          <textarea
            name="notes"
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describa el cuadro clínico, tratamiento recetado y observaciones..."
            className="w-full resize-none rounded-xl border-2 border-gray-100 p-4 outline-none transition-colors focus:border-[var(--primary)]"
          ></textarea>
        </div>

        {/* Attachments */}
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">
            Adjuntos (Imágenes/PDF)
          </label>
          <div className="group relative cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:bg-gray-50">
            <input
              type="file"
              name="attachments"
              multiple
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[var(--primary)]">
              <Icons.UploadCloud className="h-8 w-8" />
              <p className="text-sm font-bold">Arrastra archivos o haz clic para subir</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Link
            href={`/${clinic}/portal/pets/${petId}`}
            className="w-1/3 rounded-xl py-4 text-center font-bold text-gray-500 transition-colors hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <div className="flex-1">
            <SubmitButton />
          </div>
        </div>
      </form>

      {/* Floating/Side Tools Wrapper */}
      {showToolbox && (
        <div className="animate-in slide-in-from-right fixed inset-y-0 right-0 z-50 w-96 overflow-y-auto border-l border-gray-200 bg-gray-50 p-6 shadow-2xl duration-300">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900">
              {showToolbox === 'calculator' ? 'Calculadora' : 'Evaluación QoL'}
            </h2>
            <button
              onClick={() => setShowToolbox(null)}
              className="rounded-full p-2 shadow-sm hover:bg-white"
            >
              <Icons.X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {showToolbox === 'calculator' ? (
            <>
              <DosageCalculator initialWeightKg={initialWeight} />
              <p className="mt-4 text-[10px] italic leading-relaxed text-gray-400">
                Las dosis son sugerencias basadas en literatura estándar. Siempre verifique antes de
                administrar.
              </p>
            </>
          ) : (
            <QoLAssessment onComplete={handleQoLComplete} />
          )}
        </div>
      )}
    </div>
  )
}
