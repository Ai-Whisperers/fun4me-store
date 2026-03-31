'use client'

import React, { useState, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface ServiceItem {
  name: string
  duration: number
  price: number
}

interface PDFDownloadButtonProps {
  clinicName: string
  petName: string
  date: string
  startTime: string
  endTime?: string
  services: ServiceItem[]
  totalDuration: number
  totalPrice: number
  notes?: string
}

// Props for dynamically imported PDF components
interface PDFDownloadLinkProps {
  document: React.ReactElement
  fileName: string
  children: (props: { loading: boolean }) => React.ReactNode
}

interface AppointmentTicketPDFProps {
  clinicName: string
  petName: string
  date: string
  startTime: string
  endTime?: string
  services: ServiceItem[]
  totalDuration: number
  totalPrice: number
  notes?: string
}

/**
 * Client-only PDF download button that handles lazy loading of @react-pdf/renderer
 * This component isolates the ESM module loading from the main bundle
 */
export function PDFDownloadButton({
  clinicName,
  petName,
  date,
  startTime,
  endTime,
  services,
  totalDuration,
  totalPrice,
  notes,
}: PDFDownloadButtonProps) {
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [PDFComponents, setPDFComponents] = useState<{
    PDFDownloadLink: React.ComponentType<PDFDownloadLinkProps>
    AppointmentTicketPDF: React.ComponentType<AppointmentTicketPDFProps>
  } | null>(null)

  useEffect(() => {
    setIsClient(true)
    // Lazy load PDF components only on client
    Promise.all([
      import('@react-pdf/renderer'),
      import('./AppointmentTicketPDF'),
    ]).then(([pdfModule, ticketModule]) => {
      setPDFComponents({
        PDFDownloadLink: pdfModule.PDFDownloadLink as React.ComponentType<PDFDownloadLinkProps>,
        AppointmentTicketPDF: ticketModule.AppointmentTicketPDF,
      })
    }).catch(() => {
      // Silent fail - button will show download placeholder
    })
  }, [])

  // Show loading state during SSR and while loading modules
  if (!isClient || !PDFComponents) {
    return (
      <button
        disabled
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gray-100 px-8 py-4 font-bold text-gray-400 sm:px-10 sm:py-5"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparando...
      </button>
    )
  }

  const { PDFDownloadLink, AppointmentTicketPDF } = PDFComponents

  return (
    <PDFDownloadLink
      document={
        <AppointmentTicketPDF
          clinicName={clinicName}
          petName={petName}
          date={date}
          startTime={startTime}
          endTime={endTime}
          services={services}
          totalDuration={totalDuration}
          totalPrice={totalPrice}
          notes={notes}
        />
      }
      fileName={`cita-${petName}-${date}.pdf`}
    >
      {({ loading }: { loading: boolean }) => (
        <button
          disabled={loading || isLoading}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gray-100 px-8 py-4 font-bold text-gray-600 transition-all hover:bg-gray-200 disabled:opacity-50 sm:px-10 sm:py-5"
        >
          {loading || isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Descargar Ticket
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  )
}
