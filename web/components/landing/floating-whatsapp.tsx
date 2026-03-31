'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Send, ArrowRight } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/whatsapp'

const quickMessages = [
  {
    label: 'Soy veterinario',
    message: 'Hola! Soy veterinario y me interesa Vetic para mi clinica',
  },
  {
    label: 'Soy dueno de mascota',
    message: 'Hola! Soy dueno de mascota y quiero saber mas sobre Vetic',
  },
  {
    label: 'Quiero una demo',
    message: 'Hola! Me gustaria ver una demo de Vetic',
  },
  {
    label: 'Tengo una pregunta',
    message: 'Hola! Tengo una pregunta sobre Vetic',
  },
]

export function FloatingWhatsApp(): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Show button after scrolling a bit
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsVisible(scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    // Initial check
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-show tooltip after 10 seconds if user hasn't interacted
  useEffect(() => {
    if (!hasInteracted && isVisible) {
      const timer = setTimeout(() => {
        // Could show a pulse animation or tooltip here
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [hasInteracted, isVisible])

  const handleQuickMessage = (message: string): void => {
    window.open(getWhatsAppUrl(message), '_blank')
    setIsOpen(false)
    setHasInteracted(true)
  }

  const handleOpenChat = (): void => {
    setIsOpen(!isOpen)
    setHasInteracted(true)
  }

  if (!isVisible) return null

  return (
    <>
      {/* Overlay when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat popup */}
      <div
        className={`fixed bottom-24 right-4 z-50 transition-all duration-300 md:right-6 ${
          isOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[var(--landing-dark)] shadow-2xl">
          {/* Header */}
          <div className="bg-[var(--landing-whatsapp)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Vetic</p>
                  <p className="text-xs text-white/80">Normalmente responde en minutos</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Welcome message */}
            <div className="mb-4">
              <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-white/5 p-3">
                <p className="text-sm text-white">¡Hola! 👋 ¿En que podemos ayudarte?</p>
              </div>
            </div>

            {/* Quick messages */}
            <p className="mb-3 text-xs text-white/50">Selecciona una opcion:</p>
            <div className="space-y-2">
              {quickMessages.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickMessage(item.message)}
                  className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10"
                >
                  <span className="text-sm text-white">{item.label}</span>
                  <ArrowRight className="h-4 w-4 text-white/40 transition-all group-hover:translate-x-1 group-hover:text-[var(--landing-whatsapp)]" />
                </button>
              ))}
            </div>

            {/* Custom message link */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--landing-whatsapp)] py-3 font-bold text-white transition-all hover:bg-[var(--landing-whatsapp-hover)]"
              >
                <Send className="h-4 w-4" />
                Escribir mensaje personalizado
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating button */}
      <button
        onClick={handleOpenChat}
        className={`group fixed bottom-4 right-4 z-50 transition-all duration-300 md:right-6 ${
          isOpen ? 'rotate-0' : ''
        }`}
      >
        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
            isOpen
              ? 'border border-white/20 bg-white/10'
              : 'bg-[var(--landing-whatsapp)] hover:scale-110 hover:bg-[var(--landing-whatsapp-hover)]'
          }`}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6 text-white" />
              {/* Pulse animation */}
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--landing-whatsapp)] opacity-20" />
            </>
          )}
        </div>

        {/* Tooltip */}
        {!isOpen && !hasInteracted && (
          <div className="absolute bottom-full right-0 mb-2 animate-bounce whitespace-nowrap rounded-lg bg-white px-3 py-2 shadow-lg">
            <p className="text-sm font-medium text-[var(--landing-dark)]">¿Necesitas ayuda?</p>
            <div className="absolute bottom-0 right-4 h-3 w-3 translate-y-1.5 rotate-45 transform bg-white" />
          </div>
        )}
      </button>

      {/* Mobile-only: Label next to button */}
      {!isOpen && (
        <div className="pointer-events-none fixed bottom-6 right-20 z-50 md:hidden">
          <span className="rounded-full border border-white/10 bg-[var(--landing-dark)]/90 px-3 py-1.5 text-xs font-medium text-white">
            WhatsApp
          </span>
        </div>
      )}
    </>
  )
}
