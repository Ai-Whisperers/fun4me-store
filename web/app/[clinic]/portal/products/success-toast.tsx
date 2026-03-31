'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

interface SuccessToastProps {
  message: string
}

export function SuccessToast({ message }: SuccessToastProps): React.ReactElement | null {
  const [visible, setVisible] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false)
      // Clean up URL param
      router.replace(pathname, { scroll: false })
    }, 5000)

    return () => clearTimeout(timer)
  }, [router, pathname])

  const handleDismiss = (): void => {
    setVisible(false)
    router.replace(pathname, { scroll: false })
  }

  if (!visible) return null

  return (
    <div className="animate-in slide-in-from-top-2 fade-in fixed right-4 top-4 z-50 duration-300">
      <div className="flex max-w-md items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 shadow-lg">
        <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={handleDismiss}
          className="ml-2 rounded-lg p-1 transition-colors hover:bg-green-100"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
