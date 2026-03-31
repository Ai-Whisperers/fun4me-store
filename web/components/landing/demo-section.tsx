import { Play } from 'lucide-react'
import Image from 'next/image'

export function DemoSection() {
  return (
    <section id="demo" className="relative overflow-hidden bg-white py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-black text-slate-900 md:text-4xl lg:text-5xl">
            Mira lo rápido que es.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-slate-600">
            En menos de 60 segundos, ve cómo funciona Vetic.
          </p>
        </div>

        {/* Video Placeholder */}
        <div className="mx-auto max-w-4xl">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-100 shadow-xl ring-1 ring-slate-200">
            <Image
              src="/vetic-demo.png"
              alt="Dashboard de Vetic"
              fill
              className="object-cover"
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/20 transition-colors" />
            
            {/* Play Button */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <button className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-600/25 transition-all hover:scale-105 hover:bg-teal-700 hover:shadow-teal-600/40">
                <Play className="h-8 w-8 fill-white text-white ml-1" />
                <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 motion-safe:animate-ping" />
              </button>
              <p className="mt-6 font-medium text-white drop-shadow-md">
                Ver Demo (60s)
              </p>
            </div>
          </div>

          {/* Captions */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              60 segundos
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Sin audio necesario
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Subtítulos incluidos
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
