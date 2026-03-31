import { useState, useRef, useEffect } from 'react'

export function useSignature() {
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw')
  const [signatureText, setSignatureText] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Resize canvas to match container
  const resizeCanvas = (): void => {
    const canvas = canvasRef.current
    const container = canvasContainerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = Math.min(rect.width * 0.35, 200) * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
    }
  }

  useEffect(() => {
    if (signatureMode === 'draw') {
      resizeCanvas()
    }
  }, [signatureMode])

  useEffect(() => {
    const handleResize = (): void => {
      if (signatureMode === 'draw') {
        resizeCanvas()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [signatureMode])

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): void => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): void => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (): void => {
    setIsDrawing(false)
  }

  const clearSignature = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getSignatureData = (): string => {
    if (signatureMode === 'draw') {
      return canvasRef.current?.toDataURL() || ''
    }
    return signatureText
  }

  return {
    signatureMode,
    setSignatureMode,
    signatureText,
    setSignatureText,
    canvasRef,
    canvasContainerRef,
    startDrawing,
    draw,
    stopDrawing,
    clearSignature,
    getSignatureData,
  }
}
