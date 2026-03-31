'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { PrescriptionPDF } from './prescription-pdf'
import * as Icons from 'lucide-react'

// TICKET-TYPE-003: Define proper types for prescription data
// Support both detailed format (dosage, frequency, duration) and simple format (dose, instructions)
interface DrugEntry {
  name: string
  // Detailed format
  dosage?: string
  frequency?: string
  duration?: string
  // Simple format
  dose?: string
  instructions?: string
}

interface PrescriptionData {
  petName: string
  species?: string
  breed?: string
  ownerName: string
  clinicName?: string
  clinicAddress?: string
  clinicPhone?: string
  vetName: string
  vetLicense?: string
  date: string
  drugs: DrugEntry[]
  notes?: string
}

interface PrescriptionDownloadButtonProps {
  data: PrescriptionData
  fileName: string
}

export default function PrescriptionDownloadButton({
  data,
  fileName,
}: PrescriptionDownloadButtonProps) {
  // Map petName to patientName for PDF component compatibility
  // Handle both detailed format (dosage, frequency, duration) and simple format (dose, instructions)
  const pdfData = {
    clinicName: data.clinicName || 'Clínica Veterinaria',
    clinicAddress: data.clinicAddress,
    patientName: data.petName,
    ownerName: data.ownerName,
    date: data.date,
    vetName: data.vetName,
    drugs: data.drugs.map((drug) => ({
      name: drug.name,
      // Support both formats: detailed (dosage) or simple (dose)
      dose: drug.dosage || drug.dose || '',
      // Support both formats: detailed (frequency + duration) or simple (instructions)
      instructions:
        drug.instructions ||
        (drug.frequency && drug.duration ? `${drug.frequency} por ${drug.duration}` : ''),
    })),
    notes: data.notes,
  }

  return (
    <PDFDownloadLink document={<PrescriptionPDF {...pdfData} />} fileName={fileName}>
      {({ blob, url, loading, error }) => (
        <button
          disabled={loading}
          className="hover:bg-[var(--primary)]/90 flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Icons.Loader2 className="h-5 w-5 animate-spin" /> Generando PDF...
            </>
          ) : (
            <>
              <Icons.Download className="h-5 w-5" /> Descargar Receta
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  )
}
