'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { WhatsAppDailyStats } from '@/app/actions/whatsapp'

interface Props {
  data: WhatsAppDailyStats[]
}

export function WhatsAppWeeklyTrendChart({ data }: Props) {
  // Check if there's any data to show
  const hasData = data.some((d) => d.sent > 0 || d.delivered > 0 || d.failed > 0)

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-gray-100 bg-white">
        <p className="text-sm text-[var(--text-secondary)]">
          No hay datos de mensajes en los últimos 7 días
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="mb-4 text-sm font-medium text-[var(--text-primary)]">
        Mensajes - Últimos 7 días
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconSize={10}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="sent"
            name="Enviados"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="delivered"
            name="Entregados"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="failed"
            name="Fallidos"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
