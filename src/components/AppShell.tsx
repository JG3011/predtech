import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Gauge,
  LayoutDashboard,
  ListTree,
  LogOut,
  Menu,
  ShieldCheck,
  Wrench,
  Sliders,
  X,
} from 'lucide-react'
import { logPageVisit, logout } from '../server/auth.functions.js'
import type { Role } from '../server/auth.server.js'

const NAV_ITEMS: Array<{
  to: '/' | '/falhas' | '/leituras' | '/manutencao' | '/manutencoes' | '/range' | '/acessos'
  label: string
  icon: typeof LayoutDashboard
  roles: Role[]
}> = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operador', 'suporte'] },
  { to: '/falhas', label: 'Histórico de Falhas', icon: AlertTriangle, roles: ['operador', 'suporte'] },
  { to: '/leituras', label: 'Histórico de Leituras', icon: ListTree, roles: ['operador', 'suporte'] },
  { to: '/manutencao', label: 'Previsão de Manutenção', icon: CalendarClock, roles: ['operador', 'suporte'] },
  { to: '/manutencoes', label: 'Histórico de Manutenções', icon: Wrench, roles: ['suporte'] },
  { to: '/range', label: 'Range', icon: Sliders, roles: ['suporte'] },
  { to: '/acessos', label: 'Histórico de Entradas', icon: ShieldCheck, roles: ['suporte'] },
]

export function AppShell({
  role,
  children,
}: {
  role: Role
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Record every screen (aba) opened, shown in Histórico de Entradas.
  useEffect(() => {
    logPageVisit({ data: { page: pathname } }).catch(() => {})
  }, [pathname])

  async function handleLogout() {
    await logout()
    await navigate({ to: '/login' })
  }

  const items = NAV_ITEMS.filter((i) => i.roles.includes(role))

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-200 flex">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="w-8 h-8 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-slate-100 text-sm">Predtech</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
              Supervisório
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-500 hover:text-slate-300"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => {
            const active = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-slate-900 text-xs text-slate-400">
            <Gauge className="w-3.5 h-3.5" />
            Perfil: <span className="text-slate-200 font-semibold capitalize">{role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center px-4 lg:px-8 gap-3 bg-[#0b1220]/80 backdrop-blur-sm sticky top-0 z-20">
          <button
            className="lg:hidden text-slate-400 hover:text-slate-200"
            onClick={() => setOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm text-slate-500">
            Painel de monitoramento em tempo real
          </p>
        </header>
        <main className="flex-1 px-4 lg:px-8 py-6 min-w-0">{children}</main>
      </div>
    </div>
  )
}
