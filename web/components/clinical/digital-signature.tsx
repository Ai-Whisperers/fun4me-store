'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import * as Icons from 'lucide-react'

interface DigitalSignatureProps {
  onSave: (dataUrl: string) => void
  onClear: () => void
}

export function DigitalSignature({ onSave, onClear }: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  // Resize canvas to match container while maintaining drawing resolution
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Set canvas size to match container with device pixel ratio for sharp drawing
    canvas.width = rect.width * dpr
    canvas.height = Math.min(rect.width * 0.4, 200) * dpr // Maintain aspect ratio, max 200px height

    // Scale context for device pixel ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Scale coordinates to match canvas internal resolution
    const x = clientX - rect.left
    const y = clientY - rect.top

    return { x, y }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      onSave(canvas.toDataURL())
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsEmpty(false)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      ctx.beginPath()
      setIsEmpty(true)
      onClear()
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border-2 border-gray-100 bg-white shadow-inner sm:rounded-2xl"
      >
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ height: 'min(40vw, 200px)', minHeight: '120px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs italic text-gray-300 sm:text-sm">
            Firme aquí
          </div>
        )}
      </div>
      <div className="flex flex-col items-start justify-between gap-2 text-xs text-gray-400 sm:flex-row sm:items-center">
        <p className="hidden sm:block">Usa tu mouse o pantalla táctil para firmar</p>
        <p className="sm:hidden">Toca para firmar</p>
        <button
          onClick={clear}
          className="-m-2 flex items-center gap-1 p-2 font-bold text-[var(--primary)] hover:underline"
        >
          <Icons.RotateCcw className="h-4 w-4 sm:h-3 sm:w-3" /> Limpiar
        </button>
      </div>
    </div>
  )
}
