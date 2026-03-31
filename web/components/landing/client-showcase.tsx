'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  MapPin,
  Star,
  ExternalLink,
  Quote,
  TrendingUp,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
} from 'lucide-react'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

interface ClinicShowcase {
  id: string
  name: string
  tagline: string
  city: string
  address: string
  testimonial: string
  shortTestimonial: string
  contactPerson: {
    name: string
    role: string
    quote: string
  }
  metrics: {
    appointmentsGrowth: string
    onlineBookingsPercent: string
    patientsRegistered: string
    satisfactionScore: string
  }
  specialties: string[]
  highlights: string[]
  coordinates: { lat: number; lng: number }
}

const clinics: ClinicShowcase[] = [
  {
    id: 'terrapet',
    name: 'Veterinaria Adris',
    tagline: 'Cuidado Experto, Amor Incondicional',
    city: 'Asuncion',
    address: 'Av. Santa Teresa 1234',
    testimonial:
      'Vetic transformo nuestra forma de trabajar. Ahora tenemos citas online, historial digital y nuestros clientes pueden ver todo desde su celular. En 3 meses aumentamos las citas un 35%.',
    shortTestimonial: 'Aumentamos las citas un 35% en 3 meses.',
    contactPerson: {
      name: 'Dra. Maria Gonzalez',
      role: 'Directora',
      quote: 'Por fin podemos competir con las grandes cadenas veterinarias.',
    },
    metrics: {
      appointmentsGrowth: '+35%',
      onlineBookingsPercent: '65%',
      patientsRegistered: '250+',
      satisfactionScore: '4.9',
    },
    specialties: ['Clinica General', 'Urgencias 24hs', 'Cirugia', 'Vacunacion'],
    highlights: ['Urgencias 24 horas', 'Delivery de productos', 'Tienda online'],
    coordinates: { lat: -25.2637, lng: -57.5759 },
  },
  {
    id: 'petlife',
    name: 'PetLife Center',
    tagline: 'Tecnologia y Salud Animal de Vanguardia',
    city: 'Mariano Roque Alonso',
    address: 'Ruta 2 Km 14',
    testimonial:
      'Como centro de diagnostico especializado, necesitabamos una plataforma profesional. Vetic nos dio exactamente eso, con la posibilidad de recibir derivaciones de otras clinicas de forma ordenada.',
    shortTestimonial: 'Gestion profesional de derivaciones y turnos.',
    contactPerson: {
      name: 'Dr. Carlos Benitez',
      role: 'Director Medico',
      quote: 'La plataforma nos permite enfocarnos en lo que mejor hacemos: diagnosticar.',
    },
    metrics: {
      appointmentsGrowth: '+20%',
      onlineBookingsPercent: '80%',
      patientsRegistered: '180+',
      satisfactionScore: '4.8',
    },
    specialties: ['Diagnostico por Imagenes', 'Ecografia', 'Radiologia', 'Laboratorio'],
    highlights: ['Centro de referencia', 'Equipo de ultima generacion', 'Derivaciones'],
    coordinates: { lat: -25.215, lng: -57.518 },
  },
]

function ClinicCard({ clinic }: { clinic: ClinicShowcase }) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-teal-200 hover:shadow-md md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-xl font-bold text-slate-900">{clinic.name}</h3>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3 w-3" />
            {clinic.city}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1">
          <Star className="h-3 w-3 fill-teal-500 text-teal-500" />
          <span className="text-sm font-bold text-teal-700">
            {clinic.metrics.satisfactionScore}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <TrendingUp className="mx-auto mb-1 h-4 w-4 text-teal-600" />
          <div className="text-sm font-bold text-slate-900">{clinic.metrics.appointmentsGrowth}</div>
          <div className="text-xs text-slate-400">Citas</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <Calendar className="mx-auto mb-1 h-4 w-4 text-blue-500" />
          <div className="text-sm font-bold text-slate-900">{clinic.metrics.onlineBookingsPercent}</div>
          <div className="text-xs text-slate-400">Online</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <Users className="mx-auto mb-1 h-4 w-4 text-indigo-500" />
          <div className="text-sm font-bold text-slate-900">{clinic.metrics.patientsRegistered}</div>
          <div className="text-xs text-slate-400">Pacientes</div>
        </div>
      </div>

      {/* Specialties */}
      <div className="mb-6 flex flex-wrap gap-2">
        {clinic.specialties.slice(0, 3).map((specialty, idx) => (
          <span key={idx} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {specialty}
          </span>
        ))}
        {clinic.specialties.length > 3 && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-400">
            +{clinic.specialties.length - 3}
          </span>
        )}
      </div>

      {/* Testimonial */}
      <div className="relative mb-6">
        <Quote className="absolute -left-1 -top-2 h-6 w-6 text-slate-200" />
        <p className="pl-4 text-sm italic leading-relaxed text-slate-600">
          "{clinic.shortTestimonial}"
        </p>
        <p className="mt-2 pl-4 text-xs text-slate-400">
          — {clinic.contactPerson.name}, {clinic.contactPerson.role}
        </p>
      </div>

      {/* CTA */}
      <Link
        href={`/${clinic.id}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-teal-600"
      >
        Ver Sitio
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  )
}

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0)

  const next = () => setCurrent((prev) => (prev + 1) % clinics.length)
  const prev = () => setCurrent((prev) => (prev - 1 + clinics.length) % clinics.length)

  const clinic = clinics[current]

  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Large testimonial */}
      <div className="rounded-3xl border border-teal-100 bg-teal-50/50 p-8 text-center md:p-12">
        <Quote className="mx-auto mb-6 h-12 w-12 text-teal-200" />
        <p className="mb-8 text-xl font-light leading-relaxed text-slate-700 md:text-2xl">
          "{clinic.testimonial}"
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-900">{clinic.contactPerson.name}</p>
            <p className="text-sm text-slate-500">
              {clinic.contactPerson.role} - {clinic.name}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {clinics.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={prev}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-all hover:bg-slate-50 hover:text-teal-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {clinics.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-2 w-2 rounded-full transition-all ${
                  idx === current ? 'w-6 bg-teal-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-all hover:bg-slate-50 hover:text-teal-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function ClientShowcase() {
  return (
    <section id="clinicas" className="relative overflow-hidden bg-white py-20 md:py-28">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block text-sm font-bold uppercase tracking-widest text-teal-600">
            Nuestros Clientes
          </span>
          <h2 className="mb-6 text-3xl font-black text-slate-900 md:text-4xl lg:text-5xl">
            Clínicas que confían en Vetic
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Conoce las veterinarias que ya forman parte de nuestra red. Cada una con su identidad
            única, todas con tecnología de primer nivel.
          </p>
        </div>

        {/* Stats bar */}
        <div className="mb-12 flex flex-wrap justify-center gap-6 md:gap-12">
          <div className="text-center">
            <div className="text-3xl font-black text-teal-600 md:text-4xl">
              {clinics.length}
            </div>
            <div className="text-sm text-slate-500">Clínicas Activas</div>
          </div>
          <div className="hidden h-12 w-px bg-slate-200 md:block" />
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900 md:text-4xl">430+</div>
            <div className="text-sm text-slate-500">Mascotas Registradas</div>
          </div>
          <div className="hidden h-12 w-px bg-slate-200 md:block" />
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900 md:text-4xl">1,200+</div>
            <div className="text-sm text-slate-500">Citas Gestionadas</div>
          </div>
          <div className="hidden h-12 w-px bg-slate-200 md:block" />
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900 md:text-4xl">4.9</div>
            <div className="text-sm text-slate-500">Satisfacción Promedio</div>
          </div>
        </div>

        {/* Clinic Cards Grid */}
        <div className="mx-auto mb-16 grid max-w-4xl gap-6 md:grid-cols-2">
          {clinics.map((clinic) => (
            <ClinicCard key={clinic.id} clinic={clinic} />
          ))}
        </div>

        {/* Testimonial Carousel */}
        <div className="mb-12">
          <h3 className="mb-8 text-center text-sm font-bold uppercase tracking-widest text-slate-400">
            Lo que dicen nuestros clientes
          </h3>
          <TestimonialCarousel />
        </div>

        {/* Join CTA */}
        <div className="text-center">
          <p className="mb-4 text-slate-500">¿Queres que tu clínica aparezca aqui?</p>
          <a
            href={getWhatsAppUrl(landingMessages.joinNetwork())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg"
          >
            <Building2 className="h-5 w-5" />
            Unir mi Clínica
          </a>
        </div>
      </div>
    </section>
  )
}
