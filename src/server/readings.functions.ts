import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { readings, failures, ranges as rangesTable, accessLogs } from '../../db/schema.js'
import { getRangesMap } from './db.server.js'
import { simulateNext, initialReading } from './simulate.server.js'
import {
  VARIABLES,
  computeStatus,
  DEFAULT_RANGES,
  type RangesMap,
  type Status,
  type VariableKey,
} from '../lib/sensors.js'

const TICK_MS = 2000

function statusesFor(reading: {
  corrente: number
  temperatura: number
  vibracao: number
  rotacao: number
}, ranges: RangesMap): Record<VariableKey, Status> {
  return {
    corrente: computeStatus(reading.corrente, ranges.corrente),
    temperatura: computeStatus(reading.temperatura, ranges.temperatura),
    vibracao: computeStatus(reading.vibracao, ranges.vibracao),
    rotacao: computeStatus(reading.rotacao, ranges.rotacao),
  }
}

async function recordFailures(
  reading: { corrente: number; temperatura: number; vibracao: number; rotacao: number },
  ranges: RangesMap,
  statuses: Record<VariableKey, Status>,
) {
  const rows = VARIABLES.filter((v) => statuses[v.key] !== 'normal').map((v) => ({
    variable: v.key,
    value: reading[v.key],
    unit: v.unit,
    status: statuses[v.key],
    min: ranges[v.key].min,
    max: ranges[v.key].max,
    attentionBand: ranges[v.key].attention,
  }))
  if (rows.length > 0) {
    await db.insert(failures).values(rows)
  }
}

/**
 * Ensures there is a "fresh" (< 2s old) reading, generating one if the
 * latest reading is stale (or none exists yet), then returns the latest N
 * readings, the current ranges, and computed per-variable statuses.
 *
 * This is the single source of truth for the simulation — polled by the
 * dashboard every 2s from the client, so multiple tabs/users all see the
 * same server-generated data instead of racing independent client timers.
 */
export const getLatestState = createServerFn({ method: 'GET' })
  .inputValidator((data: { limit?: number } | undefined) => data)
  .handler(async ({ data }) => {
    const limit = data?.limit ?? 30

    const ranges = await getRangesMap()

    const [latest] = await db.select().from(readings).orderBy(desc(readings.timestamp)).limit(1)

    const isStale = !latest || Date.now() - new Date(latest.timestamp).getTime() >= TICK_MS

    if (isStale) {
      const base = latest ?? initialReading(ranges)
      const next = simulateNext(base, ranges)
      const [inserted] = await db.insert(readings).values(next).returning()
      const statuses = statusesFor(inserted, ranges)
      await recordFailures(inserted, ranges, statuses)
    }

    const recent = await db
      .select()
      .from(readings)
      .orderBy(desc(readings.timestamp))
      .limit(limit)

    const orderedAsc = [...recent].reverse()
    const current = orderedAsc[orderedAsc.length - 1]
    const statuses = current ? statusesFor(current, ranges) : null

    return {
      readings: orderedAsc,
      ranges,
      statuses,
    }
  })

export const getAllReadings = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(readings).orderBy(desc(readings.timestamp))
})

export const getFailures = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(failures).orderBy(desc(failures.timestamp))
})

export const getRanges = createServerFn({ method: 'GET' }).handler(async () => {
  return getRangesMap()
})

const SaveRangesSchema = z.object({
  corrente: z.object({ min: z.number(), max: z.number(), attention: z.number() }),
  temperatura: z.object({ min: z.number(), max: z.number(), attention: z.number() }),
  vibracao: z.object({ min: z.number(), max: z.number(), attention: z.number() }),
  rotacao: z.object({ min: z.number(), max: z.number(), attention: z.number() }),
})

export const saveRanges = createServerFn({ method: 'POST' })
  .inputValidator(SaveRangesSchema)
  .handler(async ({ data }) => {
    for (const v of VARIABLES) {
      const r = data[v.key]
      if (r.min >= r.max) {
        throw new Error(`${v.label}: o valor mínimo deve ser menor que o máximo.`)
      }
      if (r.attention < 0) {
        throw new Error(`${v.label}: a faixa de atenção não pode ser negativa.`)
      }
      if (r.attention >= (r.max - r.min) / 2) {
        throw new Error(
          `${v.label}: a faixa de atenção deve ser menor que a metade do intervalo (min-max).`,
        )
      }
    }

    for (const v of VARIABLES) {
      const r = data[v.key]
      await db
        .update(rangesTable)
        .set({ min: r.min, max: r.max, attentionBand: r.attention })
        .where(eq(rangesTable.variable, v.key))
    }

    return getRangesMap()
  })

export const restoreDefaultRanges = createServerFn({ method: 'POST' }).handler(async () => {
  for (const v of VARIABLES) {
    const r = DEFAULT_RANGES[v.key]
    await db
      .update(rangesTable)
      .set({ min: r.min, max: r.max, attentionBand: r.attention })
      .where(eq(rangesTable.variable, v.key))
  }
  return getRangesMap()
})

export const getAccessLogs = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp))
})
