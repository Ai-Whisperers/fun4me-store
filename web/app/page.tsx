'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Paragu-ai - Creamos tu presencia digital',
  description: 'Websites profesionales cargados desde JSON. Editás tu contenido, nosotros generamos tu sitio web.',
}

interface TenantInfo {
  id: string
  name: string
  tagline: string
  logo?: string
  primaryColor?: string
  type: string
  demo?: string
}

const tenants: TenantInfo[] = [
  { id: 'terrapet', name: 'Terra Pet', tagline: 'Clínica veterinaria - Para Nosotros, Ellos Son Familia', primaryColor: '#2F5233', type: 'Veterinaria' },
  { id: 'petlife', name: 'PetLife Center', tagline: 'Clínica veterinaria - Tecnología y Salud Animal', primaryColor: '#059669', type: 'Veterinaria' },
  { id: 'CavillPet', name: 'CavillPet', tagline: 'Clínica veterinaria - Cercanía y trato familiar', primaryColor: '#2563eb', type: 'Veterinaria' },
  { id: 'fun4me', name: 'Fun4Me', tagline: 'Tienda de placer - Delivery a todo el país', primaryColor: '#ec4899', type: 'Tienda Online' },
]

const plans = [
  {
    name: 'Básico',
    price: 'USD 29',
    period: '/mes',
    description: 'Web presence simple',
    features: ['1 página', 'Diseño profesional', 'Tu contenido en JSON', 'Dominio propio', 'SSL incluido'],
  },
  {
    name: 'Profesional',
    price: 'USD 59',
    period: '/mes',
    description: 'Negocio en crecimiento',
    features: ['5 páginas', 'Tienda online', 'Reservas online', 'Portal de clientes', 'WhatsApp integration', 'SEO básico'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'USD 99',
    period: '/mes',
    description: 'Negocio establecido',
    features: ['Páginas ilimitadas', 'E-commerce completo', 'Portal admin', 'API access', 'Priority support', 'SEO avanzado', 'Multi idioma'],
  },
]

export default function ParaguAiPlatformPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-24 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-purple-500 blur-3xl" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Paraguay
            </div>
            <h1 className="mb-6 text-5xl font-black tracking-tight md:text-7xl">
              Paragu<span className="text-indigo-400">ai</span>
            </h1>
            <p className="mb-6 text-2xl text-gray-200">
              Creamos tu presencia digital
            </p>
            <p className="mb-10 text-lg text-gray-400">
              Websites profesionales cargados desde JSON. 
              Vos editás el contenido, nosotros generamos tu sitio. 
              Sin código, sin complejidad.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://wa.me/595981000000"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-600"
              >
                Consultar
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15 1.255-.462 2.39-.462.565 0 1.258.06 1.786.305.174.09.366.149.609.148l.38-.019c.41-.045.989-.182 1.825-.698.29-.183.516-.429.6-.721.127-.293.127-.588 0-.886l-.521-.605c.164-.37.283-.835.283-1.236 0-.401-.127-.589-.297-.788l.007-.012c-.218-.005-.669-.052-1.264-.362-.544-.285-.896-.686-.996-1.235l-.003-.012c.03-.483.264-.946.572-1.27.297-.297.683-.37 1.018-.37l.255.02c.356.042.683.307.873.622.19.315.19.694.19.871l-.003.015c.003.293.003.586 0 .879l-.006.018z"/>
                </svg>
              </a>
              <a href="#tenants" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                Ver Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black text-gray-900">¿Cómo funciona?</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600 mx-auto">1</div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Nos das tu contenido</h3>
              <p className="text-gray-600">Editá tu información, servicios, precios y imágenes en un archivo JSON simple.</p>
            </div>
            <div className="text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-600 mx-auto">2</div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Nosotros generamos</h3>
              <p className="text-gray-600">Procesamos tu JSON y generamos un website hermoso y funcional automáticamente.</p>
            </div>
            <div className="text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600 mx-auto">3</div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Publicamos</h3>
              <p className="text-gray-600">Tu sitio queda online con tu dominio. Solo actualizá el JSON cuando quieras.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CURRENT PARTNERS */}
      <section id="tenants" className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-black text-gray-900">Negocios que ya confían en nosotros</h2>
            <p className="text-gray-600">Hacé click en cada uno para ver el demo en vivo</p>
          </div>

          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setActiveTab(activeTab === tenant.id ? null : tenant.id)}
                className={`rounded-full px-5 py-2.5 font-medium transition-all ${
                  activeTab === tenant.id ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeTab === tenant.id ? { backgroundColor: tenant.primaryColor } : {}}
              >
                {tenant.name}
              </button>
            ))}
          </div>

          {activeTab && (
            <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-gray-50 p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <span className="mb-2 inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">{tenants.find(t => t.id === activeTab)?.type}</span>
                  <h3 className="text-2xl font-bold text-gray-900">{tenants.find(t => t.id === activeTab)?.name}</h3>
                  <p className="text-gray-600">{tenants.find(t => t.id === activeTab)?.tagline}</p>
                </div>
                <Link href={`/${activeTab}`} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-medium text-white transition hover:opacity-90" style={{ backgroundColor: tenants.find(t => t.id === activeTab)?.primaryColor }}>
                  Visitar Sitio →
                </Link>
              </div>
              <div className="rounded-xl bg-white p-6 border border-gray-200 text-center">
                <p className="text-gray-500">Este sitio se genera automáticamente desde su JSON → <Link href={`/${activeTab}`} className="text-indigo-600 underline">Ver sitio completo</Link></p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-black text-gray-900">Planes</h2>
            <p className="text-gray-600">Elige el plan que mejor se adapte a tu negocio</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border p-6 ${plan.popular ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-xs font-medium text-white">Popular</span>}
                <h3 className="mb-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="mb-4 text-gray-600">{plan.description}</p>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="https://wa.me/595981000000" className={`block rounded-full px-4 py-2 text-center font-medium ${plan.popular ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-white'}`}>
                  Solicitar
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-6 text-3xl font-black text-gray-900">¿Querés tu website?</h2>
            <p className="mb-8 text-lg text-gray-600">Escribinos por WhatsApp y te cotizamos en minutos.</p>
            <a href="https://wa.me/595981000000" className="inline-flex items-center gap-3 rounded-full bg-indigo-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-indigo-700">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15 1.255-.462 2.39-.462.565 0 1.258.06 1.786.305.174.09.366.149.609.148l.38-.019c.41-.045.989-.182 1.825-.698.29-.183.516-.429.6-.721.127-.293.127-.588 0-.886l-.521-.605c.164-.37.283-.835.283-1.236 0-.401-.127-.589-.297-.788l.007-.012c-.218-.005-.669-.052-1.264-.362-.544-.285-.896-.686-.996-1.235l-.003-.012c.03-.483.264-.946.572-1.27.297-.297.683-.37 1.018-.37l.255.02c.356.042.683.307.873.622.19.315.19.694.19.871l-.003.015c.003.293.003.586 0 .879l-.006.018z"/></svg>
              Consultar Ahora
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-gray-500">© 2026 Paragu-ai. Paraguay.</p>
        </div>
      </footer>
    </div>
  )
}