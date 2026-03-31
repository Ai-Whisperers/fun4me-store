'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface QRGeneratorProps {
  petId: string
  petName: string
}

export function QRGenerator({ petId, petName }: QRGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCode, setQrCode] = useState<{ url: string; scanUrl: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const { showToast } = useToast()

  const generateQR = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/pets/${petId}/qr`, {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate QR code')
      }

      const data = await res.json()
      setQrCode(data.qrCode)
      setShowModal(true)
      showToast('Código QR generado exitosamente')
    } catch (e) {
      // TICKET-TYPE-004: Proper error handling without any
      showToast(e instanceof Error ? e.message : 'Error al generar código QR')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQR = () => {
    if (!qrCode) return

    const link = document.createElement('a')
    link.href = qrCode.url
    link.download = `${petName}-QR.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Descargando código QR...')
  }

  return (
    <>
      <button
        onClick={generateQR}
        disabled={isGenerating}
        className="flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:opacity-50"
      >
        {isGenerating ? (
          <Icons.Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icons.QrCode className="h-5 w-5" />
        )}
        Generar Código QR
      </button>

      {/* Modal */}
      {showModal && qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="animate-in zoom-in-95 relative w-full max-w-lg rounded-[3rem] bg-white p-8 shadow-2xl duration-300">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-6 top-6 rounded-full bg-gray-100 p-2 transition-all hover:bg-gray-200"
            >
              <Icons.X className="h-5 w-5 text-gray-600" />
            </button>

            <div className="text-center">
              <div className="bg-[var(--primary)]/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
                <Icons.QrCode className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <h2 className="mb-2 text-3xl font-black text-gray-900">Código QR Listo</h2>
              <p className="mb-8 text-gray-500">Para {petName}</p>

              {/* QR Code Display */}
              <div className="mb-8 inline-block rounded-2xl border-4 border-gray-100 bg-white p-6">
                <img
                  src={qrCode.url}
                  alt={`QR Code for ${petName}`}
                  className="mx-auto h-64 w-64"
                />
              </div>

              {/* Instructions */}
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-6 text-left">
                <h4 className="mb-3 flex items-center gap-2 font-bold text-blue-900">
                  <Icons.Info className="h-5 w-5" />
                  Cómo usar este código
                </h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <Icons.Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Descarga e imprime el código QR</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icons.Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Colócalo en el collar o placa de identificación</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icons.Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Si alguien encuentra a tu mascota, puede escanear el código para ver tu
                      contacto
                    </span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={downloadQR}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <Icons.Download className="h-5 w-5" />
                  Descargar PNG
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl bg-gray-100 px-6 py-4 font-bold text-gray-600 transition-all hover:bg-gray-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
