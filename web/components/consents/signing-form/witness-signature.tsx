'use client'

import type { JSX } from 'react'
import SignaturePad from './signature-pad'

interface WitnessSignatureProps {
  witnessName: string
  onWitnessNameChange: (name: string) => void
  signatureMode: 'draw' | 'type'
  onModeChange: (mode: 'draw' | 'type') => void
  signatureText: string
  onSignatureTextChange: (text: string) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasContainerRef: React.RefObject<HTMLDivElement | null>
  onStartDrawing: (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => void
  onDraw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void
  onStopDrawing: () => void
  onClearSignature: () => void
}

export default function WitnessSignature({
  witnessName,
  onWitnessNameChange,
  signatureMode,
  onModeChange,
  signatureText,
  onSignatureTextChange,
  canvasRef,
  canvasContainerRef,
  onStartDrawing,
  onDraw,
  onStopDrawing,
  onClearSignature,
}: WitnessSignatureProps): JSX.Element {
  return (
    <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Firma del testigo <span className="text-red-600">*</span>
      </h3>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
          Nombre del testigo <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={witnessName}
          onChange={(e) => onWitnessNameChange(e.target.value)}
          required
          className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      <SignaturePad
        signatureMode={signatureMode}
        onModeChange={onModeChange}
        signatureText={signatureText}
        onSignatureTextChange={onSignatureTextChange}
        canvasRef={canvasRef}
        canvasContainerRef={canvasContainerRef}
        onStartDrawing={onStartDrawing}
        onDraw={onDraw}
        onStopDrawing={onStopDrawing}
        onClearSignature={onClearSignature}
        label=""
        required={false}
      />
    </div>
  )
}
