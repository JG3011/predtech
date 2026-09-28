import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AlertOctagon, AlertTriangle, RefreshCw } from 'lucide-react'
import { getLatestState } from '../server/readings.functions.js'
import { useToast } from '../components/Toast.js'
import { MiniChart } from '../components/MiniChart.js'
import { STATUS_LABEL, VARIABLES, type RangesMap, type Status, type VariableKey } from '../lib/sensors.js'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

interface Reading {
  id: number
  corrente: number
  temperatura: number
  vibracao: number
  rotacao: number
  timestamp: string | Date
}

const STATUS_STYLES: Record<Status, { badge: string; dot: string }> = {
  normal: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  attention: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  alarm: { badge: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-400' },
}

const CHART_COLORS: Record<VariableKey, string> = {
  corrente: '#38bdf8',
  temperatura: '#fb923c',
  vibracao: '#a78bfa',
  rotacao: '#34d399',
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function DashboardPage() {
  const { showToast } = useToast()
  const [readings, setReadings] = useState<Reading[]>([])
  const [ranges, setRanges] = useState<RangesMap | null>(null)
  const [statuses, setStatuses] = useState<Record<VariableKey, Status> | null>(null)
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refresh(manual = false) {
    try {
      const state = await getLatestState({ data: { limit: 30 } })
      setReadings(state.readings as Reading[])
      setRanges(state.ranges)
      setStatuses(state.statuses)
      setLoading(false)
      if (manual) showToast('Dados atualizados.')
    } catch {
      if (manual) showToast('Falha ao atualizar dados.', 'error')
    }
  }

  useEffect(() => {
    refresh()
    timer.current = setInterval(() => refresh(), 2000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const latest = readings[readings.length - 1]
  const alarmVars = statuses ? VARIABLES.filter((v) => statuses[v.key] === 'alarm') : []
  const attentionVars = statuses ? VARIABLES.filter((v) => statuses[v.key] === 'attention') : []

  if (loading || !ranges || !latest) {
    return <div className="text-slate-500 text-sm">Carregando dados dos sensores…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-slate-100">Dashboard</h1>
        <button
          onClick={() => refresh(true)}
          className="flex items-center gap-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-3.5 py-2 border border-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {alarmVars.length > 0 && (
        <div className="space-y-2">
          {alarmVars.map((v) => (
            <div
              key={v.key}
              className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-red-300 animate-pulse"
            >
              <AlertOctagon className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">
                ALARME CRÍTICO — {v.label}: {fmt(latest[v.key])} {v.unit} fora da faixa segura (
                {fmt(ranges[v.key].min)}–{fmt(ranges[v.key].max)} {v.unit})
              </p>
            </div>
          ))}
        </div>
      )}

      {attentionVars.length > 0 && (
        <div className="space-y-2">
          {attentionVars.map((v) => (
            <div
              key={v.key}
              className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-amber-300"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">
                Atenção — {v.label} próximo do limite: {fmt(latest[v.key])} {v.unit}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {VARIABLES.map((v) => {
          const status = statuses?.[v.key] ?? 'normal'
          const style = STATUS_STYLES[status]
          return (
            <div
              key={v.key}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {v.label}
                </p>
                <span
                  className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${style.badge}`}
                >
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100 tabular-nums">
                {fmt(latest[v.key])}
                <span className="text-sm text-slate-500 font-medium ml-1">{v.unit}</span>
              </p>
              <div className="h-16">
                <MiniChart
                  values={readings.map((r) => r[v.key])}
                  min={ranges[v.key].min}
                  max={ranges[v.key].max}
                  color={CHART_COLORS[v.key]}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-200">Últimas leituras</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2 font-medium">Horário</th>
                  <th className="text-right px-4 py-2 font-medium">Corrente</th>
                  <th className="text-right px-4 py-2 font-medium">Temp.</th>
                  <th className="text-right px-4 py-2 font-medium">Vibração</th>
                  <th className="text-right px-4 py-2 font-medium">Rotação</th>
                </tr>
              </thead>
              <tbody>
                {readings
                  .slice(-8)
                  .reverse()
                  .map((r) => (
                    <tr key={r.id} className="border-t border-slate-800/80 text-slate-300">
                      <td className="px-4 py-2 text-slate-500">
                        {new Date(r.timestamp).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(r.corrente)} A</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(r.temperatura)} °C</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(r.vibracao)} mm/s</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(r.rotacao)} RPM</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Status por variável</h2>
          <div className="space-y-2">
            {VARIABLES.map((v) => {
              const status = statuses?.[v.key] ?? 'normal'
              const style = STATUS_STYLES[status]
              return (
                <div
                  key={v.key}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className="text-sm text-slate-300">{v.label}</span>
                  </div>
                  <span className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${style.badge}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
