import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { clearFailures, getFailures } from '../server/readings.functions.js'
import { getMotors } from '../server/motors.functions.js'
import { ClearButton } from '../components/ClearDialog.js'
import { MotorSelect, type Motor } from '../components/MotorSelect.js'
import { VARIABLES, STATUS_LABEL, type Status, type VariableKey } from '../lib/sensors.js'

export const Route = createFileRoute('/_app/falhas')({
  component: FalhasPage,
})

interface Failure {
  id: number
  motorId: number
  variable: VariableKey
  value: number
  unit: string
  status: Status
  min: number
  max: number
  attentionBand: number
  timestamp: string | Date
}

const LABEL_BY_KEY = Object.fromEntries(VARIABLES.map((v) => [v.key, v.label])) as Record<
  VariableKey,
  string
>

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function FalhasPage() {
  const { role } = Route.useRouteContext()
  const [failures, setFailures] = useState<Failure[] | null>(null)
  const [motors, setMotors] = useState<Motor[]>([])
  const [motorId, setMotorId] = useState<number | null>(null)

  function load() {
    getFailures().then((data) => setFailures(data as Failure[]))
  }

  useEffect(() => {
    load()
    getMotors().then((m) => setMotors(m))
  }, [])

  const motorNames = useMemo(() => new Map(motors.map((m) => [m.id, m.name])), [motors])
  const visible = useMemo(
    () => (motorId === null ? failures : failures?.filter((f) => f.motorId === motorId)) ?? null,
    [failures, motorId],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg font-bold text-slate-100">Histórico de Falhas</h1>
        </div>
        {role === 'suporte' && (
          <ClearButton
            entityLabel="Histórico de Falhas"
            motorId={motorId ?? undefined}
            motorName={motorId !== null ? motorNames.get(motorId) : undefined}
            onClear={(input) => clearFailures({ data: input })}
            onDone={load}
          />
        )}
      </div>
      <p className="text-sm text-slate-500">
        Todas as leituras registradas em estado de atenção ou alarme, com a faixa vigente no
        momento do evento.
      </p>

      <MotorSelect motors={motors} value={motorId} onChange={setMotorId} allowAll />

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Horário</th>
                <th className="text-left px-4 py-2.5 font-medium">Motor</th>
                <th className="text-left px-4 py-2.5 font-medium">Variável</th>
                <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                <th className="text-right px-4 py-2.5 font-medium">Faixa</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible === null && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Carregando…
                  </td>
                </tr>
              )}
              {visible?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma falha registrada até o momento.
                  </td>
                </tr>
              )}
              {visible?.map((f) => (
                <tr key={f.id} className="border-t border-slate-800/80 text-slate-300">
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(f.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5">{motorNames.get(f.motorId) ?? `#${f.motorId}`}</td>
                  <td className="px-4 py-2.5">{LABEL_BY_KEY[f.variable]}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {fmt(f.value)} {f.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                    {fmt(f.min)}–{fmt(f.max)} {f.unit}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${
                        f.status === 'alarm'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {STATUS_LABEL[f.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
