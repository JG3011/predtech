import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

/**
 * Full trend chart with time axis, value axis, tooltips, and dashed
 * min/max + attention-band reference lines. Used on the dashboard and in the
 * enlarged (ampliado) view.
 */
export function TrendChart({
  labels,
  values,
  min,
  max,
  attention,
  color,
  unit,
  expanded = false,
}: {
  labels: string[]
  values: number[]
  min: number
  max: number
  attention: number
  color: string
  unit: string
  expanded?: boolean
}) {
  const line = (label: string, value: number, borderColor: string, dash: number[]) => ({
    label,
    data: values.map(() => value),
    borderColor,
    borderDash: dash,
    pointRadius: 0,
    pointHoverRadius: 0,
    borderWidth: 1,
  })

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: `Valor (${unit})`,
            data: values,
            borderColor: color,
            backgroundColor: color,
            tension: 0.3,
            pointRadius: expanded ? 2 : 0,
            pointHoverRadius: 4,
            borderWidth: 2,
          },
          line('Máx', max, '#ef4444aa', [6, 4]),
          line('Atenção (máx)', max - attention, '#f59e0b88', [2, 4]),
          line('Atenção (mín)', min + attention, '#f59e0b88', [2, 4]),
          line('Mín', min, '#ef4444aa', [6, 4]),
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: expanded,
            labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('pt-BR', {
                  maximumFractionDigits: 2,
                })}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxTicksLimit: expanded ? 12 : 5, font: { size: 10 } },
            grid: { color: '#1e293b' },
          },
          y: {
            ticks: { color: '#64748b', font: { size: 10 } },
            grid: { color: '#1e293b' },
          },
        },
      }}
    />
  )
}
