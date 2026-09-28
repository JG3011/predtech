import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react'
import { getSession } from '../server/auth.functions.js'
import { getAccessLogs } from '../server/readings.functions.js'

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
  timestamp: string | Date
}

function AcessosPage() {
  const [logs, setLogs] = useState<AccessLog[] | null>(null)

  useEffect(() => {
    getAccessLogs().then((data) => setLogs(data as AccessLog[]))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-sky-400" />
        <h1 className="text-lg font-bold text-slate-100">Histórico de Entradas</h1>
      </div>
      <p className="text-sm text-slate-500">Registro de todas as tentativas de login no sistema.</p>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 font-medium">Horário</th>
                <th className="text-left px-4 py-2.5 font-medium">Usuário</th>
                <th className="text-left px-4 py-2.5 font-medium">Perfil</th>
                <th className="text-left px-4 py-2.5 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {logs === null && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Carregando…
                  </td>
                </tr>
              )}
              {logs?.map((log) => (
                <tr key={log.id} className="border-t border-slate-800/80 text-slate-300">
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2.5">{log.userLabel}</td>
                  <td className="px-4 py-2.5 capitalize">{log.role}</td>
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
