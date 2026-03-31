'use client'

import type { JSX } from 'react'
import { Edit3, Type, RotateCcw } from 'lucide-react'

interface SignaturePadProps {
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
  label: string
  required?: boolean
}

export default function SignaturePad({
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
  label,
  required = true,
}: SignaturePadProps): JSX.Element {
  return (
    <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        {label} {required && <span className="text-red-600">*</span>}
      </h3>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onModeChange('draw')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            signatureMode === 'draw'
              ? 'bg-[var(--primary)] text-white'
              : 'border-[var(--primary)]/20 border bg-[var(--bg-default)] text-[var(--text-primary)]'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Dibujar
        </button>
        <button
          type="button"
          onClick={() => onModeChange('type')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            signatureMode === 'type'
              ? 'bg-[var(--primary)] text-white'
              : 'border-[var(--primary)]/20 border bg-[var(--bg-default)] text-[var(--text-primary)]'
          }`}
        >
          <Type className="h-4 w-4" />
          Escribir
        </button>
      </div>

      {signatureMode === 'draw' ? (
        <div className="space-y-2">
          <div ref={canvasContainerRef} className="w-full">
            <canvas
              ref={canvasRef}
              onMouseDown={onStartDrawing}
              onMouseMove={onDraw}
              onMouseUp={onStopDrawing}
              onMouseLeave={onStopDrawing}
              onTouchStart={(e) => {
                e.preventDefault()
                onStartDrawing(e)
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                onDraw(e)
              }}
              onTouchEnd={onStopDrawing}
              className="border-[var(--primary)]/20 w-full cursor-crosshair touch-none rounded-lg border-2 border-dashed bg-white"
              style={{ height: 'min(35vw, 200px)', minHeight: '120px' }}
            />
          </div>
          <button
            type="button"
            onClick={onClearSignature}
            className="flex min-h-[44px] items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="h-4 w-4" />
            Limpiar firma
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={signatureText}
          onChange={(e) => onSignatureTextChange(e.target.value)}
          placeholder="Escriba su nombre completo"
          className="border-[var(--primary)]/20 w-full rounded-lg border-2 border-dashed bg-white px-4 py-3 font-serif text-2xl text-black focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          style={{ fontFamily: 'cursive' }}
        />
      )}
    </div>
  )
}
