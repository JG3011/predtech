import { Cog } from 'lucide-react'

export interface Motor {
  id: number
  name: string
}

/** Motor picker shared by the dashboard, readings/failures history and Range screens. */
export function MotorSelect({
  motors,
  value,
  onChange,
  allowAll = false,
}: {
  motors: Motor[]
  value: number | null
  onChange: (id: number | null) => void
  allowAll?: boolean
}) {
  return (
    <div className="relative">
      <Cog className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="appearance-none bg-slate-800/60 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
      >
        {allowAll && <option value="">Todos os motores</option>}
        {motors.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  )
}
