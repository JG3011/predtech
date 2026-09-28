import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Download, ListTree, Search } from 'lucide-react'
import { getAllReadings } from '../server/readings.functions.js'
import { useToast } from '../components/Toast.js'

export const Route = createFileRoute('/_app/leituras')({
  component: LeiturasPage,
})

interface Reading {
  id: number
  corrente: number
  temperatura: number
  vibracao: number
  rotacao: number
  timestamp: string | Date
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function toCsv(rows: Reading[]) {
  const header = ['id', 'horario', 'corrente_A', 'temperatura_C', 'vibracao_mms', 'rotacao_rpm']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [r.id, new Date(r.timestamp).toISOString(), r.corrente, r.temperatura, r.vibracao, r.rotacao].join(
        ',',
      ),
    )
  }
  return lines.join('\n')
}

function LeiturasPage() {
  const { showToast } = useToast()
  const [readings, setReadings] = useState<Reading[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getAllReadings().then((data) => setReadings(data as Reading[]))
  }, [])

  const filtered = useMemo(() => {
    if (!readings) return []
    if (!query.trim()) return readings
    const q = query.toLowerCase()
    return readings.filter((r) => {
      const dateStr = new Date(r.timestamp).toLocaleString('pt-BR').toLowerCase()
      return (
        dateStr.includes(q) ||
        String(r.corrente).includes(q) ||
        String(r.temperatura).includes(q) ||
        String(r.vibracao).includes(q) ||
        String(r.rotacao).includes(q)
      )
    })
  }, [readings, query])

  function handleExport() {
    if (!readings || readings.length === 0) {
      showToast('Nenhuma leitura para exportar.', 'error')
      return
    }
    const csv = toCsv(readings)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `predtech-leituras-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('CSV exportado com sucesso.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ListTree className="w-5 h-5 text-sky-400" />
          <h1 className="text-lg font-bold text-slate-100">Histórico de Leituras</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg px-3.5 py-2 transition"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por data ou valor…"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Horário</th>
                <th className="text-right px-4 py-2.5 font-medium">Corrente</th>
                <th className="text-right px-4 py-2.5 font-medium">Temperatura</th>
                <th className="text-right px-4 py-2.5 font-medium">Vibração</th>
                <th className="text-right px-4 py-2.5 font-medium">Rotação</th>
              </tr>
            </thead>
            <tbody>
              {readings === null && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Carregando…
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-800/80 text-slate-300">
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(r.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.corrente)} A</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.temperatura)} °C</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.vibracao)} mm/s</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(r.rotacao)} RPM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
