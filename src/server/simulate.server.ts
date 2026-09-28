// Server-only simulation logic: random walk + occasional spikes, based on
// the previous reading and the currently configured ranges.

import type { RangesMap } from '../lib/sensors.js'

export interface SimReading {
  corrente: number
  temperatura: number
  vibracao: number
  rotacao: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function randomWalk(previous: number, step: number, min: number, max: number) {
  const delta = (Math.random() - 0.5) * 2 * step
  return clamp(previous + delta, min - step * 2, max + step * 2)
}

/**
 * Generates the next simulated reading from the previous one. Each variable
 * takes a small random step. Occasionally (about 1 in 12 ticks) the
 * temperature spikes near or over its upper limit, to demonstrate alarms.
 */
export function simulateNext(previous: SimReading, ranges: RangesMap): SimReading {
  const next: SimReading = {
    corrente: randomWalk(previous.corrente, 0.4, ranges.corrente.min, ranges.corrente.max),
    temperatura: randomWalk(previous.temperatura, 1.2, ranges.temperatura.min, ranges.temperatura.max),
    vibracao: randomWalk(previous.vibracao, 0.15, ranges.vibracao.min, ranges.vibracao.max),
    rotacao: randomWalk(previous.rotacao, 10, ranges.rotacao.min, ranges.rotacao.max),
  }

  // Occasional spike near/over the temperature limit.
  if (Math.random() < 1 / 12) {
    const over = Math.random() < 0.5
    const t = ranges.temperatura
    next.temperatura = over
      ? t.max + Math.random() * 6
      : t.max - Math.random() * (t.attention * 0.8)
  }

  return next
}

export function initialReading(ranges: RangesMap): SimReading {
  return {
    corrente: (ranges.corrente.min + ranges.corrente.max) / 2,
    temperatura: (ranges.temperatura.min + ranges.temperatura.max) / 2,
    vibracao: (ranges.vibracao.min + ranges.vibracao.max) / 2,
    rotacao: (ranges.rotacao.min + ranges.rotacao.max) / 2,
  }
}
