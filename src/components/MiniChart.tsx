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

export function MiniChart({
  values,
  min,
  max,
  color,
}: {
  values: number[]
  min: number
  max: number
  color: string
}) {
  const labels = values.map((_, i) => String(i))

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Valor',
            data: values,
            borderColor: color,
            backgroundColor: `${color}22`,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: 'Mín',
            data: values.map(() => min),
            borderColor: '#475569',
            borderDash: [4, 4],
            pointRadius: 0,
            borderWidth: 1,
          },
          {
            label: 'Máx',
            data: values.map(() => max),
            borderColor: '#475569',
            borderDash: [4, 4],
            pointRadius: 0,
            borderWidth: 1,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      }}
    />
  )
}
