'use client'

/**
 * Finance Dashboard Client Component
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import ExpenseForm from '@/components/finance/expense-form'
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react'

interface FinanceData {
  revenue: number
  expenses: number
  netIncome: number
  breakdown: Record<string, number>
}

export default function FinanceDashboardClient() {
  const { clinic } = useParams() as { clinic: string }
  const queryClient = useQueryClient()

  // React Query: Fetch P&L data
  const { data, isLoading: loading } = useQuery({
    queryKey: ['finance-pl', clinic],
    queryFn: async (): Promise<FinanceData> => {
      const res = await fetch(`/api/finance/pl?clinic=${clinic}`)
      if (!res.ok) throw new Error('Error al cargar datos financieros')
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const handleExpenseSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-pl', clinic] })
  }

  if (loading)
    return <div className="p-10 text-center font-bold text-gray-400">Loading Financial Data...</div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-1 text-3xl font-black text-gray-900">Financial Overview</h1>
          <p className="font-medium text-gray-500">Profit & Loss Statement</p>
        </div>
        <div className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500">
          Current Period: All Time
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Revenue Card */}
        <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-green-50"></div>
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-400">
              Total Revenue
            </p>
            <h2 className="text-3xl font-black text-gray-900">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
                data?.revenue || 0
              )}
            </h2>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-red-50"></div>
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <TrendingDown className="h-6 w-6" />
            </div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-400">
              Total Expenses
            </p>
            <h2 className="text-3xl font-black text-gray-900">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
                data?.expenses || 0
              )}
            </h2>
          </div>
        </div>

        {/* Net Income Card */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gray-900 p-6 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-48 w-48 rounded-full bg-gray-800 opacity-50"></div>
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm">
              <DollarSign className="h-6 w-6" />
            </div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-400">
              Net Income
            </p>
            <h2
              className={`text-3xl font-black ${(data?.netIncome ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
                data?.netIncome || 0
              )}
            </h2>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Chart Area (Placeholder) */}
        <div className="min-h-[400px] rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm lg:col-span-2">
          <h3 className="mb-6 flex items-center gap-3 text-xl font-black text-gray-900">
            <PieChart className="h-6 w-6 text-indigo-500" />
            Expense Breakdown
          </h3>

          {data?.breakdown && Object.keys(data.breakdown).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(data.breakdown).map(([cat, amount]: [string, number]) => (
                <div key={cat} className="group flex items-center gap-4">
                  <div className="w-32 text-sm font-bold uppercase tracking-wider text-gray-500">
                    {cat}
                  </div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-50">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.min((amount / (data.expenses || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="w-32 text-right font-black text-gray-900">
                    {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
                      amount
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center text-gray-400">
              <PieChart className="mb-4 h-12 w-12 opacity-20" />
              <p className="font-medium">No expenses recorded yet.</p>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <ExpenseForm onSuccess={handleExpenseSuccess} clinicId={clinic} />

          <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6">
            <h4 className="mb-2 font-bold text-indigo-900">Commissions (Beta)</h4>
            <p className="mb-4 text-sm leading-relaxed text-indigo-700/80">
              Track staff performance and generated revenue from appointments and sales.
            </p>
            <button className="w-full rounded-xl border border-indigo-100 bg-white py-3 font-bold text-indigo-600 shadow-sm transition-all hover:bg-indigo-50">
              View Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
