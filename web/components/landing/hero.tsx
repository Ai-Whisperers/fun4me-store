'use client'

import { ArrowRight, Play, MapPin, Shield } from 'lucide-react'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

export function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative min-h-[90svh] overflow-hidden bg-slate-50 pt-20 md:pt-0">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-teal-100/40 blur-[100px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-[100px]" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto flex min-h-[90svh] items-center px-4 md:px-6">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          {/* Left Column - Text */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div
              className={`mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 transition-all duration-700 md:mb-8 ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
              }`}
            >
              <MapPin className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-700">
                Disponible en todo Paraguay
              </span>
            </div>

            {/* Headline */}
            <h1
              className={`mb-6 text-4xl font-extrabold leading-tight text-[var(--landing-text-primary)] transition-all delay-100 duration-700 md:text-5xl lg:text-6xl ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              Gestiona tu veterinaria{' '}
              <span className="text-4xl md:text-5xl lg:text-6xl text-[var(--landing-primary)]">sin complicaciones.</span>
            </h1>

            {/* Subheadline */}
            <p
              className={`mx-auto mb-6 max-w-xl text-lg leading-relaxed text-slate-600 transition-all delay-200 duration-700 lg:mx-0 md:text-xl ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              Agenda, historial clínico y web propia en una sola plataforma.
              Diseñado específicamente para Paraguay.
            </p>

            {/* ROI Guarantee Badge */}
            <div
              className={`mb-8 flex justify-center lg:justify-start transition-all delay-250 duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                <Shield className="h-4 w-4" />
                <span>Garantía: 6 clientes nuevos en 6 meses o 6 meses GRATIS</span>
              </div>
            </div>

            {/* CTAs */}
            <div
              className={`flex flex-col justify-center gap-4 transition-all delay-300 duration-700 sm:flex-row lg:justify-start ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <a
                href={getWhatsAppUrl(landingMessages.startFree())}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-1 hover:bg-teal-700 hover:shadow-teal-600/40"
              >
                Empezar Gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="#demo"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:bg-slate-50 hover:shadow-md"
              >
                <Play className="h-5 w-5 fill-slate-700 text-slate-700" />
                Ver Demo
              </a>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div
            className={`relative hidden lg:block transition-all delay-400 duration-700 ${
              isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}
          >
            <div className="relative z-10 overflow-hidden rounded-2xl shadow-2xl shadow-slate-200/50">
              <Image
                src="/vetic-hero.png"
                alt="Veterinaria usando Vetic en tablet"
                width={800}
                height={800}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -right-12 -top-12 -z-10 h-64 w-64 rounded-full bg-teal-50 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 -z-10 h-64 w-64 rounded-full bg-blue-50 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
