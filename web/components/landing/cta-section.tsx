'use client'

import { ArrowRight, MessageCircle, Play, Shield, Zap, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[var(--landing-primary)] py-16 md:py-24">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-blue-500 blur-3xl" />
        <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 2px, transparent 0)`,
              backgroundSize: '48px 48px',
            }}
          />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          
          <h2 className="mb-6 text-3xl font-black leading-tight text-white md:text-5xl">
            Moderniza tu veterinaria <br />
            <span className="text-3xl md:text-5xl text-teal-100">hoy mismo.</span>
          </h2>

          <p className="mx-auto mb-10 max-w-xl text-lg text-teal-50/90">
            Únete a la red de veterinarias más eficiente de Paraguay. 
            Sin contratos forzosos, cancela cuando quieras.
          </p>

          <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href={getWhatsAppUrl(landingMessages.ctaStart())}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-teal-700 shadow-xl shadow-teal-900/10 transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <MessageCircle className="h-5 w-5" />
              Empezar por WhatsApp
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              href="/terrapet"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-teal-400 bg-teal-500/20 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-teal-500/30"
            >
              <Play className="h-5 w-5 fill-white text-white" />
              Ver Demo
            </Link>
          </div>

          {/* Trust Badges Simple */}
          <div className="flex flex-wrap justify-center gap-6 border-t border-teal-500/30 pt-8">
            <div className="flex items-center gap-2 text-teal-50">
               <Shield className="h-5 w-5 text-teal-200" />
               <span className="text-sm font-medium">Datos 100% Seguros</span>
            </div>
            <div className="flex items-center gap-2 text-teal-50">
               <Zap className="h-5 w-5 text-teal-200" />
               <span className="text-sm font-medium">Setup Rápido</span>
            </div>
            <div className="flex items-center gap-2 text-teal-50">
               <CheckCircle2 className="h-5 w-5 text-teal-200" />
               <span className="text-sm font-medium">Soporte Local</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
