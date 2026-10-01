import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Search, Wrench } from 'lucide-react'
import { getSession } from '../server/auth.functions.js'
import { clearMaintenances, getMaintenances } from '../server/motors.functions.js'
import { ClearButton } from '../components/ClearDialog.js'

export const Route = createFileRoute('/_app/manutencoes')({
  beforeLoad: async () => {
    const { role } = await getSession()
    if (role !== 'suporte') {
      throw redirect({ to: '/' })
    }
  },
  component: ManutencoesPage,
})

interface Maintenance {
  id: number
  motorId: number
  motorName: string
  performedAt: string | Date
  description: string
  reason: string
  createdBy: string
}

function ManutencoesPage() {
  const [rows, setRows] = useState<Maintenance[] | null>(null)
  const [query, setQuery] = useState('')

  function load() {
    getMaintenances().then((data) => setRows(data as Maintenance[]))
  }

  useEffect(() => {
    load()
  }, [])

  const visible = useMemo(() => {
    if (!rows || !query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter((m) =>
      [new Date(m.performedAt).toLocaleString('pt-BR'), m.motorName, m.description, m.reason, m.createdBy]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [rows, query])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-sky-400" />
          <h1 className="text-lg font-bold text-slate-100">Histórico de Manutenções</h1>
        </div>
        <ClearButton
          entityLabel="Histórico de Manutenções"
          onClear={(input) => clearMaintenances({ data: input })}
          onDone={load}
        />
      </div>
      <p className="text-sm text-slate-500">
        Manutenções registradas pelo Suporte na tela Previsão de Manutenção.
      </p>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por data, motor, serviço ou motivo…"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Data e hora</th>
                <th className="text-left px-4 py-2.5 font-medium">Motor</th>
                <th className="text-left px-4 py-2.5 font-medium">O que foi feito</th>
                <th className="text-left px-4 py-2.5 font-medium">Motivo</th>
                <th className="text-left px-4 py-2.5 font-medium">Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {visible === null && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Carregando…
                  </td>
                </tr>
              )}
              {visible?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma manutenção encontrada.
                  </td>
                </tr>
              )}
              {visible?.map((m) => (
                <tr key={m.id} className="border-t border-slate-800/80 text-slate-300 align-top">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {new Date(m.performedAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{m.motorName}</td>
                  <td className="px-4 py-2.5 whitespace-pre-wrap">{m.description}</td>
                  <td className="px-4 py-2.5 whitespace-pre-wrap">{m.reason}</td>
                  <td className="px-4 py-2.5">{m.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
