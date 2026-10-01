import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Wrench } from 'lucide-react'
import { getMaintenanceForecast, registerMaintenance } from '../server/motors.functions.js'
import { useToast } from '../components/Toast.js'
import { Modal, inputClass } from '../components/Modal.js'
import {
  ALARM_WEIGHT_DAYS,
  ATTENTION_WEIGHT_DAYS,
  BASE_INTERVAL_DAYS,
} from '../lib/maintenance.js'

export const Route = createFileRoute('/_app/manutencao')({
  component: ManutencaoPage,
})

interface Forecast {
  motorId: number
  motorName: string
  lastMaintenance: { performedAt: string | Date; description: string } | null
  reference: string
  alarms: number
  attentions: number
  predictedAt: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusFor(predictedAt: Date) {
  const days = (predictedAt.getTime() - Date.now()) / DAY_MS
  if (days < 0)
    return { label: 'Atrasada', className: 'bg-red-500/10 text-red-400 border-red-500/30', days }
  if (days <= 7)
    return { label: 'Próxima', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30', days }
  return { label: 'Em dia', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', days }
}

function ManutencaoPage() {
  const { role } = Route.useRouteContext()
  const { showToast } = useToast()
  const [forecast, setForecast] = useState<Forecast[] | null>(null)
  const [target, setTarget] = useState<Forecast | null>(null)
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const [performedAt, setPerformedAt] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    getMaintenanceForecast().then((data) => setForecast(data as Forecast[]))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  function openForm(f: Forecast) {
    setTarget(f)
    setDescription('')
    setReason('')
    setPerformedAt(toLocalInput(new Date()))
  }

  async function handleSubmit() {
    if (!target) return
    if (!description.trim() || !reason.trim() || !performedAt) {
      showToast('Preencha o que foi feito, o motivo e quando.', 'error')
      return
    }
    setSaving(true)
    try {
      await registerMaintenance({
        data: {
          motorId: target.motorId,
          description: description.trim(),
          reason: reason.trim(),
          performedAt: new Date(performedAt).toISOString(),
        },
      })
      showToast(`Manutenção do ${target.motorName} registrada.`)
      setTarget(null)
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao registrar manutenção.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-sky-400" />
        <h1 className="text-lg font-bold text-slate-100">Previsão de Manutenção</h1>
      </div>
      <p className="text-sm text-slate-500 max-w-3xl">
        A data prevista parte da última manutenção (ou do cadastro do motor) com um intervalo
        nominal de {BASE_INTERVAL_DAYS} dias, antecipado conforme as falhas registradas desde então
        (cada alarme antecipa {ALARM_WEIGHT_DAYS * 24 * 60} min e cada atenção{' '}
        {ATTENTION_WEIGHT_DAYS * 24 * 60} min).
      </p>

      {forecast === null && <div className="text-slate-500 text-sm">Carregando…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {forecast?.map((f) => {
          const predicted = new Date(f.predictedAt)
          const st = statusFor(predicted)
          const daysAbs = Math.abs(st.days)
          const daysText =
            daysAbs < 1
              ? st.days < 0
                ? 'vencida há menos de 1 dia'
                : 'em menos de 1 dia'
              : st.days < 0
                ? `vencida há ${Math.floor(daysAbs)} dia(s)`
                : `em ${Math.floor(daysAbs)} dia(s)`
          return (
            <div
              key={f.motorId}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200">{f.motorName}</p>
                <span className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${st.className}`}>
                  {st.label}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Data prevista</p>
                <p className="text-2xl font-bold text-slate-100 tabular-nums">
                  {predicted.toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-slate-400">
                  {predicted.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                  {daysText}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                  <p className="text-slate-500">Alarmes desde a última</p>
                  <p className="text-red-400 font-semibold tabular-nums">{f.alarms}</p>
                </div>
                <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                  <p className="text-slate-500">Atenções desde a última</p>
                  <p className="text-amber-400 font-semibold tabular-nums">{f.attentions}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Última manutenção:{' '}
                <span className="text-slate-300">
                  {f.lastMaintenance
                    ? new Date(f.lastMaintenance.performedAt).toLocaleString('pt-BR')
                    : 'nenhuma registrada'}
                </span>
              </p>

              {role === 'suporte' && (
                <button
                  onClick={() => openForm(f)}
                  className="mt-auto flex items-center justify-center gap-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg px-3.5 py-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Manutenção feita
                </button>
              )}
            </div>
          )
        })}
      </div>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={`Registrar manutenção — ${target?.motorName ?? ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">O que foi feito</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: troca de rolamentos e lubrificação"
              maxLength={2000}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Por que (motivo)</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: vibração acima do limite recorrente"
              maxLength={2000}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Quando</label>
            <input
              type="datetime-local"
              value={performedAt}
              max={toLocalInput(new Date())}
              onChange={(e) => setPerformedAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setTarget(null)}
              className="text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-4 py-2 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-lg px-4 py-2 transition"
            >
              <Wrench className="w-4 h-4" />
              Registrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
