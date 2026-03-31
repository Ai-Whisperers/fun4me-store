/**
 * Time Inputs Component
 *
 * Start and end time inputs for appointment scheduling.
 */

'use client'

interface TimeInputsProps {
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
}

export function TimeInputs({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: TimeInputsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Hora inicio</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Hora fin</label>
        <input
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
    </div>
  )
}
