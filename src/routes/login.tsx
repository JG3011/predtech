import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { login } from '../server/auth.functions.js'
import { Activity, Lock, ShieldCheck, UserCog } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type RoleOption = 'operador' | 'suporte'

function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<RoleOption>('operador')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await login({ data: { role, password } })
      if (!result.success) {
        setError(result.error)
        setPending(false)
        return
      }
      await navigate({ to: '/' })
    } catch {
      setError('Não foi possível entrar. Tente novamente.')
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Activity className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Predtech
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              Supervisório de Manutenção Preditiva
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/80 border border-slate-800 rounded-xl shadow-2xl shadow-black/40 p-6 sm:p-8"
        >
          <p className="text-sm text-slate-400 mb-6">
            Selecione seu perfil de acesso e informe a senha para entrar.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => setRole('operador')}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition ${
                role === 'operador'
                  ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <UserCog className="w-5 h-5" />
              Operador
            </button>
            <button
              type="button"
              onClick={() => setRole('suporte')}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition ${
                role === 'suporte'
                  ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              Suporte
            </button>
          </div>

          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Senha
          </label>
          <div className="relative mb-2">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
              placeholder="Digite a senha"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 mt-2 mb-1" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || password.length === 0}
            className="w-full mt-5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:hover:bg-sky-500 text-slate-950 font-semibold text-sm rounded-lg py-2.5 transition"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-[11px] text-slate-500 mt-4 text-center leading-relaxed">
            Demo — Operador: <span className="text-slate-400">op123</span> · Suporte:{' '}
            <span className="text-slate-400">sup123</span>
          </p>
        </form>
      </div>
    </div>
  )
}
