import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AlertOctagon, AlertTriangle, Maximize2, Plus, RefreshCw, TrendingUp } from 'lucide-react'
import { getLatestState } from '../server/readings.functions.js'
import { addMotor, getMotors } from '../server/motors.functions.js'
import { useToast } from '../components/Toast.js'
import { MiniChart } from '../components/MiniChart.js'
import { TrendChart } from '../components/TrendChart.js'
import { Modal, inputClass } from '../components/Modal.js'
import { MotorSelect, type Motor } from '../components/MotorSelect.js'
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

const TREND_POINTS = 60

function DashboardPage() {
  const { role } = Route.useRouteContext()
  const { showToast } = useToast()
  const [readings, setReadings] = useState<Reading[]>([])
  const [ranges, setRanges] = useState<RangesMap | null>(null)
  const [statuses, setStatuses] = useState<Record<VariableKey, Status> | null>(null)
  const [loading, setLoading] = useState(true)
  const [motors, setMotors] = useState<Motor[]>([])
  const [motorId, setMotorId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<VariableKey | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const motorRef = useRef<number | null>(null)
  motorRef.current = motorId

  async function refresh(manual = false) {
    try {
      const requested = motorRef.current
      const state = await getLatestState({
        data: { limit: TREND_POINTS, motorId: requested ?? undefined },
      })
      // Ignore responses for a motor the user already switched away from.
      if (requested !== null && requested !== motorRef.current) return
      if (requested === null) setMotorId(state.motorId)
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
    getMotors().then((m) => setMotors(m))
  }, [])

  function selectMotor(id: number | null) {
    if (id === null || id === motorId) return
    setMotorId(id)
    motorRef.current = id
    setLoading(true)
    refresh()
  }

  async function handleAddMotor() {
    if (!newName.trim()) {
      showToast('Informe o nome do motor.', 'error')
      return
    }
    setAdding(true)
    try {
      const motor = await addMotor({ data: { name: newName.trim() } })
      setMotors((prev) => [...prev, motor])
      setAddOpen(false)
      setNewName('')
      showToast(`${motor.name} adicionado.`)
      selectMotor(motor.id)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao adicionar motor.', 'error')
    } finally {
      setAdding(false)
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

  const motorName = motors.find((m) => m.id === motorId)?.name ?? ''
  const cardReadings = readings.slice(-30)
  const trendLabels = readings.map((r) => new Date(r.timestamp).toLocaleTimeString('pt-BR'))
  const expandedMeta = VARIABLES.find((v) => v.key === expanded)

  const header = (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-slate-100">Dashboard</h1>
        {motors.length > 0 && (
          <MotorSelect motors={motors} value={motorId} onChange={selectMotor} />
        )}
        {role === 'suporte' && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg px-3.5 py-2 transition"
          >
            <Plus className="w-4 h-4" />
            Novo motor
          </button>
        )}
      </div>
      <button
          onClick={() => refresh(true)}
          className="flex items-center gap-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-3.5 py-2 border border-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
    </div>
  )

  const addMotorModal = (
    <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Adicionar novo motor">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          O novo motor terá as mesmas medições (corrente, temperatura, vibração e rotação) com as
          faixas padrão, que podem ser ajustadas depois na tela Range.
        </p>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Nome do motor</label>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMotor()}
            placeholder={`Motor ${motors.length + 1}`}
            maxLength={80}
            className={inputClass}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setAddOpen(false)}
            className="text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-4 py-2 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAddMotor}
            disabled={adding}
            className="flex items-center gap-2 text-sm font-medium bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 rounded-lg px-4 py-2 transition"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>
    </Modal>
  )

  if (loading || !ranges || !latest) {
    return (
      <div className="space-y-6">
        {header}
        <div className="text-slate-500 text-sm">Carregando dados dos sensores…</div>
        {addMotorModal}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}
      {addMotorModal}

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
                  values={cardReadings.map((r) => r[v.key])}
                  min={ranges[v.key].min}
                  max={ranges[v.key].max}
                  color={CHART_COLORS[v.key]}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Gráficos de tendência{motorName ? ` — ${motorName}` : ''}
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(['rotacao', 'vibracao', 'temperatura', 'corrente'] as VariableKey[]).map((key) => {
            const v = VARIABLES.find((x) => x.key === key)!
            return (
              <div
                key={key}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">
                    {v.label} <span className="text-slate-500 font-normal">({v.unit})</span>
                  </p>
                  <button
                    onClick={() => setExpanded(key)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-md px-2 py-1 transition"
                    title="Ampliar gráfico"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Ampliar
                  </button>
                </div>
                <div
                  className="h-48 cursor-zoom-in"
                  onClick={() => setExpanded(key)}
                >
                  <TrendChart
                    labels={trendLabels}
                    values={readings.map((r) => r[key])}
                    min={ranges[key].min}
                    max={ranges[key].max}
                    attention={ranges[key].attention}
                    color={CHART_COLORS[key]}
                    unit={v.unit}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        open={expanded !== null}
        onClose={() => setExpanded(null)}
        size="xl"
        title={
          expandedMeta
            ? `Tendência — ${expandedMeta.label} (${expandedMeta.unit})${motorName ? ` · ${motorName}` : ''}`
            : ''
        }
      >
        {expanded && expandedMeta && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span>
                Atual:{' '}
                <span className="text-slate-100 font-semibold tabular-nums">
                  {fmt(latest[expanded])} {expandedMeta.unit}
                </span>
              </span>
              <span>
                Faixa: {fmt(ranges[expanded].min)}–{fmt(ranges[expanded].max)} {expandedMeta.unit}
              </span>
              <span>Atenção: ±{fmt(ranges[expanded].attention)}</span>
              <span>Últimas {readings.length} leituras (atualiza a cada 2s)</span>
            </div>
            <div className="h-[65vh]">
              <TrendChart
                expanded
                labels={trendLabels}
                values={readings.map((r) => r[expanded])}
                min={ranges[expanded].min}
                max={ranges[expanded].max}
                attention={ranges[expanded].attention}
                color={CHART_COLORS[expanded]}
                unit={expandedMeta.unit}
              />
            </div>
          </div>
        )}
      </Modal>

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
