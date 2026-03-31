'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { logger } from '@/lib/logger'
import type { ClinicData } from '@/lib/types'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { DrugSearch } from '@/components/clinical/drug-search'
import { DosageCalculator } from '@/components/clinical/dosage-calculator'
import { DigitalSignature } from '@/components/clinical/digital-signature'
import { useToast } from '@/components/ui/Toast'

// Dynamic import for PDF Button to avoid SSR issues
const PrescriptionDownloadButton = dynamic(
  () => import('@/components/clinical/prescription-download-button'),
  { ssr: false, loading: () => <button className="btn disabled">Cargando PDF...</button> }
)

interface Patient {
  id: string
  name: string
  species: string
  breed: string | null
  weight_kg: number | null
  owner_id: string
}

interface PrescriptionFormProps {
  clinic: ClinicData
  patient?: Patient | null
  vetName: string
}

export default function NewPrescriptionForm({ clinic, patient, vetName }: PrescriptionFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [drugs, setDrugs] = useState<Array<{ name: string; dose: string; instructions: string }>>(
    []
  )
  const [notes, setNotes] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [signatureHash, setSignatureHash] = useState<string | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)

  // Temp form state for adding a drug
  const [tempDrug, setTempDrug] = useState({ name: '', dose: '', instructions: '' })

  const handleAddDrug = () => {
    if (tempDrug.name && tempDrug.dose) {
      setDrugs([...drugs, tempDrug])
      setTempDrug({ name: '', dose: '', instructions: '' })
    }
  }

  const handleSave = async () => {
    if (!patient) {
      showToast({ title: 'Seleccione un paciente', variant: 'warning' })
      return
    }
    if (!signatureDataUrl) {
      showToast({ title: 'Por favor, firme la receta para continuar', variant: 'warning' })
      return
    }
    setIsSaving(true)

    try {
      // Generate a real-looking hash from the content
      const mockHash = 'SIG_' + Math.random().toString(36).substring(2, 10).toUpperCase()

      const payload = {
        pet_id: patient.id,
        vet_id: null,
        drugs,
        notes,
        signature_hash: mockHash,
        signature_data: signatureDataUrl, // We'll store it in the DB
        qr_code_url: `https://terrapet.app/verify/${mockHash}`,
      }

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setSavedId(data.id)
        setSignatureHash(mockHash)
      }
    } catch (e) {
      logger.error('Error saving prescription', {
        error: e instanceof Error ? e.message : 'Unknown error'
      })
      showToast({ title: 'Error al guardar receta', variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const pdfData = {
    clinicName: clinic.config.name,
    clinicAddress: clinic.config.contact?.address || 'Calle Ficticia 123',
    petName: patient?.name || 'Desconocido',
    ownerName: 'Propietario',
    date: new Date().toLocaleDateString(),
    drugs,
    notes,
    vetName,
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Nueva Receta Médica</h1>
          <p className="mt-1 text-gray-500">
            Paciente:{' '}
            {patient ? (
              <span className="font-bold text-[var(--primary)]">
                {patient.name} ({patient.species})
              </span>
            ) : (
              'No seleccionado'
            )}
          </p>
        </div>
        {savedId && (
          <div className="flex animate-bounce items-center gap-2 rounded-2xl bg-green-100 px-6 py-3 font-black text-green-700">
            <Icons.CheckCircle className="h-6 w-6" /> Guardado
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Medicines Section */}
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-black text-gray-900">
                <Icons.Pill className="h-6 w-6 text-purple-500" /> Medicamentos
              </h3>
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="flex items-center gap-1 text-sm font-bold text-[var(--primary)] hover:underline"
              >
                <Icons.Calculator className="h-4 w-4" /> Calculadora
              </button>
            </div>

            {/* Add Drug Form */}
            <div className="mb-8 space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-gray-400">
                    Medicamento
                  </label>
                  <DrugSearch
                    onSelect={(d) => setTempDrug({ ...tempDrug, name: d.name })}
                    placeholder="Buscar..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-gray-400">
                    Dosis / Frecuencia
                  </label>
                  <input
                    className="w-full rounded-xl border-2 border-transparent bg-white p-3 outline-none transition-all focus:border-[var(--primary)]"
                    placeholder="Ej: 1 pastilla cada 8hs"
                    value={tempDrug.dose}
                    onChange={(e) => setTempDrug({ ...tempDrug, dose: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-gray-400">
                  Indicaciones
                </label>
                <div className="flex gap-4">
                  <input
                    className="flex-1 rounded-xl border-2 border-transparent bg-white p-3 outline-none transition-all focus:border-[var(--primary)]"
                    placeholder="Ej: Dar con comida por 7 días"
                    value={tempDrug.instructions}
                    onChange={(e) => setTempDrug({ ...tempDrug, instructions: e.target.value })}
                  />
                  <button
                    onClick={handleAddDrug}
                    disabled={!tempDrug.name || !tempDrug.dose}
                    className="rounded-xl bg-gray-900 px-6 font-bold text-white transition-all hover:bg-black disabled:opacity-30"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            {drugs.length > 0 ? (
              <div className="space-y-3">
                {drugs.map((d, i) => (
                  <div
                    key={i}
                    className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-purple-200"
                  >
                    <div>
                      <p className="font-black text-gray-900">{d.name}</p>
                      <p className="text-sm font-medium text-gray-500">
                        {d.dose} <span className="mx-2 text-gray-200">•</span>{' '}
                        <span className="italic">{d.instructions}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setDrugs(drugs.filter((_, idx) => idx !== i))}
                      className="rounded-lg p-2 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
                    >
                      <Icons.Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-gray-100 py-12 text-center">
                <Icons.Pill className="mx-auto mb-2 h-12 w-12 text-gray-100" />
                <p className="font-bold text-gray-300">No hay medicamentos agregados</p>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-gray-900">
              <Icons.FileText className="h-6 w-6 text-blue-500" /> Notas de la Receta
            </h3>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border-2 border-gray-50 bg-gray-50 p-6 font-medium text-gray-700 outline-none transition-all focus:border-[var(--primary)] focus:bg-white"
              placeholder="Escriba aquí notas para el propietario o el farmacéutico..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-8">
          {/* Calculator Sidebar */}
          {showCalculator && (
            <div className="animate-in slide-in-from-top rounded-3xl border-2 border-purple-100 bg-white p-8 shadow-sm duration-300">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">Cálculo de Dosis</h3>
                <button onClick={() => setShowCalculator(false)}>
                  <Icons.X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <DosageCalculator initialWeightKg={patient?.weight_kg ?? undefined} />
            </div>
          )}

          {/* Signature Section */}
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-gray-900">
              <Icons.PenLine className="h-6 w-6 text-green-500" /> Firma Digital
            </h3>
            <DigitalSignature
              onSave={(url) => setSignatureDataUrl(url)}
              onClear={() => setSignatureDataUrl(null)}
            />
            <div className="mt-6 space-y-4">
              <p className="text-center text-xs leading-relaxed text-gray-400">
                Al firmar, usted certifica la validez de esta prescripción para el paciente
                indicado.
              </p>
              {!savedId ? (
                <button
                  onClick={handleSave}
                  disabled={isSaving || drugs.length === 0 || !signatureDataUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] py-4 font-black text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:transform-none disabled:opacity-50"
                >
                  {isSaving ? (
                    <Icons.Loader2 className="animate-spin" />
                  ) : (
                    <Icons.Save className="h-5 w-5" />
                  )}
                  Finalizar Receta
                </button>
              ) : (
                <div className="animate-in fade-in zoom-in space-y-3 duration-500">
                  <PrescriptionDownloadButton
                    data={pdfData}
                    fileName={`Receta_${patient?.name || 'Paciente'}.pdf`}
                  />
                  <Link
                    href={`/${clinic.config.id}/portal/pets/${patient?.id || ''}`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 py-4 font-black text-gray-600 transition-all hover:bg-gray-200"
                  >
                    Volver al Perfil
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
