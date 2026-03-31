'use client'
import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react'

interface ToastMessage {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'destructive'
}

type ToastInput = string | ToastMessage

interface ToastContextProps {
  showToast: (message: ToastInput) => void
  toast: (message: ToastInput) => void // Alias for showToast
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toastData, setToastData] = useState<ToastMessage | null>(null)
  const [visible, setVisible] = useState(false)

  const showToast = useCallback((message: ToastInput) => {
    if (typeof message === 'string') {
      setToastData({ title: message })
    } else {
      setToastData(message)
    }
    setVisible(true)
  }, [])

  const contextValue = useMemo(() => ({ showToast, toast: showToast }), [showToast])

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [visible])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {visible && toastData && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 opacity-90 shadow-lg transition-opacity duration-300 ${
            toastData.variant === 'error' || toastData.variant === 'destructive'
              ? 'bg-[var(--status-error,#dc2626)] text-white'
              : toastData.variant === 'success'
                ? 'bg-[var(--status-success,#16a34a)] text-white'
                : toastData.variant === 'warning'
                  ? 'bg-[var(--status-warning,#ca8a04)] text-white'
                  : 'bg-[var(--bg-inverse,#1f2937)] text-[var(--text-inverse,#ffffff)]'
          }`}
          role="alert"
        >
          <div className="font-medium">{toastData.title}</div>
          {toastData.description && (
            <div className="text-sm opacity-90">{toastData.description}</div>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
