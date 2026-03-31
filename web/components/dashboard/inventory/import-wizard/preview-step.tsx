'use client'

interface PreviewStepProps {
  rawHeaders: string[]
  rawRows: string[][]
}

export function PreviewStep({ rawHeaders, rawRows }: PreviewStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Vista Previa de Datos</h3>
          <p className="text-sm text-gray-500">
            {rawRows.length} filas detectadas - {rawHeaders.length} columnas
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="max-h-[300px] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="w-12 px-3 py-2 text-left text-xs font-bold uppercase text-gray-400">
                  #
                </th>
                {rawHeaders.map((header, idx) => (
                  <th
                    key={idx}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-bold uppercase text-gray-600"
                  >
                    {header || `Columna ${idx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rawRows.slice(0, 10).map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-400">{rowIdx + 1}</td>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="max-w-[200px] truncate px-3 py-2">
                      {cell || <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rawRows.length > 10 && (
          <div className="border-t bg-gray-50 p-2 text-center text-sm text-gray-500">
            ... y {rawRows.length - 10} filas más
          </div>
        )}
      </div>
    </div>
  )
}
