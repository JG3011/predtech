import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal, inputClass } from './Modal.js'
import { useToast } from './Toast.js'
import type { ClearInput } from '../lib/clear.js'

type Mode = ClearInput['mode']

/**
 * "Limpar" button + dialog letting Suporte choose how much of a history to
 * delete: everything, the N oldest, the N most recent, or everything before
 * a date. Only render this for the Suporte role — the server enforces it too.
 */
export function ClearButton({
  entityLabel,
  motorId,
  motorName,
  onClear,
  onDone,
}: {
  entityLabel: string
  motorId?: number
  motorName?: string
  onClear: (input: ClearInput) => Promise<{ removed: number }>
  onDone: () => void
}) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('oldest')
  const [count, setCount] = useState('100')
  const [before, setBefore] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    const input: ClearInput = { mode, motorId }
    if (mode === 'oldest' || mode === 'newest') {
      const n = Number(count)
      if (!Number.isInteger(n) || n <= 0) {
        showToast('Informe uma quantidade válida.', 'error')
        return
      }
      input.count = n
    }
    if (mode === 'before') {
      if (!before) {
        showToast('Informe a data limite.', 'error')
        return
      }
      input.before = new Date(before).toISOString()
    }
    if (mode === 'all' && !window.confirm(`Remover TODOS os registros de ${entityLabel}?`)) {
      return
    }

    setBusy(true)
    try {
      const { removed } = await onClear(input)
      showToast(`${removed} registro(s) removido(s).`)
      setOpen(false)
      onDone()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao limpar registros.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const options: Array<{ value: Mode; label: string }> = [
    { value: 'oldest', label: 'Os mais antigos' },
    { value: 'newest', label: 'Os mais recentes' },
    { value: 'before', label: 'Tudo antes de uma data' },
    { value: 'all', label: 'Tudo' },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg px-3.5 py-2 transition"
      >
        <Trash2 className="w-4 h-4" />
        Limpar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Limpar ${entityLabel}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Escolha quais registros remover
            {motorName ? (
              <>
                {' '}
                do <span className="text-slate-200 font-medium">{motorName}</span>
              </>
            ) : (
              ' (todos os motores)'
            )}
            . Esta ação não pode ser desfeita.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {options.map((o) => (
              <label
                key={o.value}
                className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer ${
                  mode === o.value
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-200'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="clear-mode"
                  className="accent-sky-500"
                  checked={mode === o.value}
                  onChange={() => setMode(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>

          {(mode === 'oldest' || mode === 'newest') && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Quantidade</label>
              <input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {mode === 'before' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Remover registros anteriores a</label>
              <input
                type="datetime-local"
                value={before}
                onChange={(e) => setBefore(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-4 py-2 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex items-center gap-2 text-sm font-medium bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
