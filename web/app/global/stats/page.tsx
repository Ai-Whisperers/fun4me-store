import { createClient } from '@/lib/supabase/server'
import * as Icons from 'lucide-react'
import Link from 'next/link'

export default async function GlobalStatsPage() {
  const supabase = await createClient()

  // Call the global stats RPC
  const { data: stats, error } = await supabase.rpc('get_network_stats')

  if (error) {
    return <div>Error loading stats: {error.message}</div>
  }

  // Mocking some extra data for "Research" vibes if RPC returns minimal info
  const displayStats = {
    total_pets: stats?.total_pets || 0,
    total_vaccines: stats?.total_vaccines || 0,
    popular_species: stats?.most_popular_species || 'Unknown',
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-white selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 rotate-3 transform items-center justify-center rounded-lg bg-cyan-500">
              <Icons.Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                VeteNetwork <span className="text-cyan-400">Analytics</span>
              </h1>
              <p className="text-xs uppercase tracking-widest text-slate-400">Global Data HUB</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Volver al Inicio
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-black text-transparent md:text-5xl">
            Análisis en Tiempo Real
          </h2>
          <p className="text-lg text-slate-400">
            Datos agregados de toda la red veterinaria para investigación y control epidemiológico.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-800/50 p-8 transition-colors hover:bg-slate-800">
            <div className="absolute right-0 top-0 p-3 opacity-10 transition-opacity group-hover:opacity-20">
              <Icons.PawPrint className="h-24 w-24 text-cyan-400" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-400">
              Población Total
            </p>
            <p className="text-5xl font-black text-white">{displayStats.total_pets}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <span className="flex items-center gap-1 font-bold text-green-400">
                <Icons.ArrowUp className="h-4 w-4" /> +12%
              </span>
              vs mes pasado
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-800/50 p-8 transition-colors hover:bg-slate-800">
            <div className="absolute right-0 top-0 p-3 opacity-10 transition-opacity group-hover:opacity-20">
              <Icons.Syringe className="h-24 w-24 text-purple-400" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-400">
              Vacunación Efectiva
            </p>
            <p className="text-5xl font-black text-white">{displayStats.total_vaccines}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <span className="flex items-center gap-1 font-bold text-green-400">
                <Icons.CheckCircle2 className="h-4 w-4" /> Alta
              </span>
              Cobertura
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-800/50 p-8 transition-colors hover:bg-slate-800">
            <div className="absolute right-0 top-0 p-3 opacity-10 transition-opacity group-hover:opacity-20">
              <Icons.Dna className="h-24 w-24 text-emerald-400" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
              Especie Dominante
            </p>
            <p className="text-4xl font-black capitalize text-white">
              {displayStats.popular_species || 'N/A'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <span className="flex items-center gap-1 font-bold text-slate-500">
                Tendencia Global
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Cards (Mocking functionality for "Students") */}
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/5 bg-slate-800/30 p-8">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold">
              <Icons.PieChart className="h-5 w-5 text-cyan-400" /> Distribución de Dietas
            </h3>
            {/* Placeholder for Chart */}
            <div className="flex h-64 items-end justify-between gap-2 border-b border-white/10 px-4 pb-4">
              <div className="group relative h-[80%] w-full rounded-t-lg bg-cyan-500/20 transition-colors hover:bg-cyan-500/40">
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100">
                  80%
                </span>
              </div>
              <div className="group relative h-[40%] w-full rounded-t-lg bg-cyan-500/20 transition-colors hover:bg-cyan-500/40">
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100">
                  40%
                </span>
              </div>
              <div className="group relative h-[60%] w-full rounded-t-lg bg-cyan-500/20 transition-colors hover:bg-cyan-500/40">
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100">
                  60%
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Balanceado</span>
              <span>BARF</span>
              <span>Mixto</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-slate-800/30 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <Icons.Download className="h-5 w-5 text-emerald-400" /> Exportar Datos
              </h3>
              <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs font-bold uppercase text-emerald-400">
                CSV / JSON
              </span>
            </div>
            <p className="mb-6 text-slate-400">
              Descarga datasets anonimizados para análisis académico, tesis o estudios de mercado.
            </p>

            <div className="space-y-3">
              <button className="group flex w-full items-center justify-between rounded-xl bg-slate-700 px-6 py-4 text-sm font-bold transition-colors hover:bg-slate-600">
                <span>Reporte Epidemiológico 2024</span>
                <Icons.Download className="h-4 w-4 text-slate-400 group-hover:text-white" />
              </button>
              <button className="group flex w-full items-center justify-between rounded-xl bg-slate-700 px-6 py-4 text-sm font-bold transition-colors hover:bg-slate-600">
                <span>Tendencias de Nutrición</span>
                <Icons.Download className="h-4 w-4 text-slate-400 group-hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
