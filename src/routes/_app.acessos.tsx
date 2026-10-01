import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, LogIn, Search, ShieldCheck, XCircle } from 'lucide-react'
import { getSession } from '../server/auth.functions.js'
import { clearAccessLogs, getAccessLogs } from '../server/readings.functions.js'
import { ClearButton } from '../components/ClearDialog.js'
import { pageLabel } from '../lib/pages.js'

export const Route = createFileRoute('/_app/acessos')({
  beforeLoad: async () => {
    const { role } = await getSession()
    if (role !== 'suporte') {
      throw redirect({ to: '/' })
    }
  },
  component: AcessosPage,
})

interface AccessLog {
  id: number
  userLabel: string
  role: string
  success: boolean
  event: string
  page: string | null
  timestamp: string | Date
}

function AcessosPage() {
  const [logs, setLogs] = useState<AccessLog[] | null>(null)
  const [query, setQuery] = useState('')

  function load() {
    getAccessLogs().then((data) => setLogs(data as AccessLog[]))
  }

  useEffect(() => {
    load()
  }, [])

  const visible = useMemo(() => {
    if (!logs || !query.trim()) return logs
    const q = query.toLowerCase()
    return logs.filter((log) =>
      [
        new Date(log.timestamp).toLocaleString('pt-BR'),
        log.userLabel,
        log.event === 'page' ? pageLabel(log.page) : 'Login',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [logs, query])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-400" />
          <h1 className="text-lg font-bold text-slate-100">Histórico de Entradas</h1>
        </div>
        <ClearButton
          entityLabel="Histórico de Entradas"
          onClear={(input) => clearAccessLogs({ data: input })}
          onDone={load}
        />
      </div>
      <p className="text-sm text-slate-500">
        Registro de todas as tentativas de login e de cada aba acessada no sistema.
      </p>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por data, usuário ou aba…"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Horário</th>
                <th className="text-left px-4 py-2.5 font-medium">Usuário</th>
                <th className="text-left px-4 py-2.5 font-medium">Perfil</th>
                <th className="text-left px-4 py-2.5 font-medium">Aba acessada</th>
                <th className="text-left px-4 py-2.5 font-medium">Resultado</th>
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
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
              {visible?.map((log) => (
                <tr key={log.id} className="border-t border-slate-800/80 text-slate-300">
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5">{log.userLabel}</td>
                  <td className="px-4 py-2.5 capitalize">{log.role}</td>
                  <td className="px-4 py-2.5">
                    {log.event === 'page' ? (
                      pageLabel(log.page)
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <LogIn className="w-3.5 h-3.5" /> Login
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.success ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> Falha
                      </span>
                    )}
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
