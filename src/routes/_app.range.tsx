import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { RotateCcw, Save, Sliders } from 'lucide-react'
import { getSession } from '../server/auth.functions.js'
import { getRanges, saveRanges, restoreDefaultRanges } from '../server/readings.functions.js'
import { getMotors } from '../server/motors.functions.js'
import { useToast } from '../components/Toast.js'
import { MotorSelect, type Motor } from '../components/MotorSelect.js'
import { VARIABLES, type RangesMap, type VariableKey } from '../lib/sensors.js'

export const Route = createFileRoute('/_app/range')({
  beforeLoad: async () => {
    const { role } = await getSession()
    if (role !== 'suporte') {
      throw redirect({ to: '/' })
    }
  },
  component: RangePage,
})

type FormState = Record<VariableKey, { min: string; max: string; attention: string }>

function toForm(ranges: RangesMap): FormState {
  const form = {} as FormState
  for (const v of VARIABLES) {
    form[v.key] = {
      min: String(ranges[v.key].min),
      max: String(ranges[v.key].max),
      attention: String(ranges[v.key].attention),
    }
  }
  return form
}

function RangePage() {
  const { showToast } = useToast()
  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [motors, setMotors] = useState<Motor[]>([])
  const [motorId, setMotorId] = useState<number | null>(null)

  useEffect(() => {
    getMotors().then((m) => {
      setMotors(m)
      if (m.length > 0) setMotorId(m[0].id)
    })
  }, [])

  useEffect(() => {
    if (motorId === null) return
    setForm(null)
    setError(null)
    getRanges({ data: { motorId } }).then((ranges) => setForm(toForm(ranges)))
  }, [motorId])

  const motorName = motors.find((m) => m.id === motorId)?.name ?? ''

  function updateField(key: VariableKey, field: 'min' | 'max' | 'attention', value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: { ...prev[key], [field]: value } } : prev))
  }

  async function handleSave() {
    if (!form || motorId === null) return
    setError(null)
    setSaving(true)
    try {
      const payload = {} as Record<VariableKey, { min: number; max: number; attention: number }>
      for (const v of VARIABLES) {
        payload[v.key] = {
          min: Number(form[v.key].min),
          max: Number(form[v.key].max),
          attention: Number(form[v.key].attention),
        }
      }
      const updated = await saveRanges({ data: { motorId, ranges: payload } })
      setForm(toForm(updated))
      showToast(`Faixas do ${motorName} salvas com sucesso.`)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao salvar faixas.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRestore() {
    if (motorId === null) return
    setSaving(true)
    setError(null)
    try {
      const restored = await restoreDefaultRanges({ data: { motorId } })
      setForm(toForm(restored))
      showToast(`Faixas do ${motorName} restauradas para o padrão.`)
    } finally {
      setSaving(false)
    }
  }

  const title = (
    <>
      <div className="flex items-center gap-2">
        <Sliders className="w-5 h-5 text-sky-400" />
        <h1 className="text-lg font-bold text-slate-100">Range — Configuração de Limites</h1>
      </div>
      <p className="text-sm text-slate-500">
        Defina o mínimo, máximo e a faixa de atenção de cada variável monitorada. A faixa de
        atenção deve ser menor que a metade do intervalo (mín–máx). Cada motor tem sua própria
        configuração.
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Motor</span>
        <MotorSelect motors={motors} value={motorId} onChange={(id) => id !== null && setMotorId(id)} />
      </div>
    </>
  )

  if (!form) {
    return (
      <div className="space-y-4 max-w-3xl">
        {title}
        <div className="text-slate-500 text-sm">Carregando…</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {title}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {VARIABLES.map((v) => (
          <div key={v.key} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-200">
              {v.label} <span className="text-slate-500 font-normal">({v.unit})</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Mín</label>
                <input
                  type="number"
                  value={form[v.key].min}
                  onChange={(e) => updateField(v.key, 'min', e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Máx</label>
                <input
                  type="number"
                  value={form[v.key].max}
                  onChange={(e) => updateField(v.key, 'max', e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Atenção ±</label>
                <input
                  type="number"
                  value={form[v.key].attention}
                  onChange={(e) => updateField(v.key, 'attention', e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 text-sm font-medium bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 rounded-lg px-4 py-2.5 transition"
        >
          <Save className="w-4 h-4" />
          Salvar
        </button>
        <button
          onClick={handleRestore}
          disabled={saving}
          className="flex items-center gap-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg px-4 py-2.5 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar padrão
        </button>
      </div>
    </div>
  )
}
