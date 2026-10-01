import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { readings, failures, motorRanges, accessLogs, motors } from '../../db/schema.js'
import { clearRows, getMotorRangesMap } from './db.server.js'
import { requireSession, requireSuporte } from './auth.server.js'
import { simulateNext, initialReading } from './simulate.server.js'
import { ClearSchema } from '../lib/clear.js'
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
  motorId: number,
  reading: { corrente: number; temperatura: number; vibracao: number; rotacao: number },
  ranges: RangesMap,
  statuses: Record<VariableKey, Status>,
) {
  const rows = VARIABLES.filter((v) => statuses[v.key] !== 'normal').map((v) => ({
    motorId,
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

/** Generates a new simulated reading for a motor if its latest one is stale. */
async function tickMotor(motorId: number) {
  const ranges = await getMotorRangesMap(motorId)
  const [latest] = await db
    .select()
    .from(readings)
    .where(eq(readings.motorId, motorId))
    .orderBy(desc(readings.timestamp))
    .limit(1)

  const isStale = !latest || Date.now() - new Date(latest.timestamp).getTime() >= TICK_MS
  if (!isStale) return ranges

  const base = latest ?? initialReading(ranges)
  const next = simulateNext(base, ranges)
  const [inserted] = await db
    .insert(readings)
    .values({ ...next, motorId })
    .returning()
  await recordFailures(motorId, inserted, ranges, statusesFor(inserted, ranges))
  return ranges
}

/**
 * Ensures every motor has a "fresh" (< 2s old) reading, generating one if a
 * motor's latest reading is stale (or none exists yet), then returns the
 * latest N readings, the current ranges, and computed per-variable statuses
 * for the requested motor.
 *
 * This is the single source of truth for the simulation — polled by the
 * dashboard every 2s from the client, so multiple tabs/users all see the
 * same server-generated data instead of racing independent client timers.
 * All motors are ticked (not only the one being viewed) so failures and
 * maintenance predictions keep accumulating for every motor.
 */
export const getLatestState = createServerFn({ method: 'GET' })
  .inputValidator((data: { limit?: number; motorId?: number } | undefined) => data)
  .handler(async ({ data }) => {
    requireSession()
    const limit = Math.min(Math.max(data?.limit ?? 30, 1), 500)

    const allMotors = await db.select().from(motors).orderBy(asc(motors.id))
    const motorId =
      allMotors.find((m) => m.id === data?.motorId)?.id ?? allMotors[0]?.id ?? 1

    let ranges: RangesMap | null = null
    for (const m of allMotors) {
      const r = await tickMotor(m.id)
      if (m.id === motorId) ranges = r
    }
    if (!ranges) ranges = await tickMotor(motorId)

    const recent = await db
      .select()
      .from(readings)
      .where(eq(readings.motorId, motorId))
      .orderBy(desc(readings.timestamp))
      .limit(limit)

    const orderedAsc = [...recent].reverse()
    const current = orderedAsc[orderedAsc.length - 1]
    const statuses = current ? statusesFor(current, ranges) : null

    return {
      motorId,
      readings: orderedAsc,
      ranges,
      statuses,
    }
  })

export const getAllReadings = createServerFn({ method: 'GET' }).handler(async () => {
  requireSession()
  return db.select().from(readings).orderBy(desc(readings.timestamp))
})

export const clearReadings = createServerFn({ method: 'POST' })
  .inputValidator(ClearSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    const removed = await clearRows(
      { table: readings, id: readings.id, ts: readings.timestamp, motor: readings.motorId },
      data,
    )
    return { removed }
  })

export const getFailures = createServerFn({ method: 'GET' }).handler(async () => {
  requireSession()
  return db.select().from(failures).orderBy(desc(failures.timestamp))
})

export const clearFailures = createServerFn({ method: 'POST' })
  .inputValidator(ClearSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    const removed = await clearRows(
      { table: failures, id: failures.id, ts: failures.timestamp, motor: failures.motorId },
      data,
    )
    return { removed }
  })

const MotorIdSchema = z.object({ motorId: z.number().int().positive() })

export const getRanges = createServerFn({ method: 'GET' })
  .inputValidator(MotorIdSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    return getMotorRangesMap(data.motorId)
  })

const RangeSchema = z.object({ min: z.number(), max: z.number(), attention: z.number() })

const SaveRangesSchema = z.object({
  motorId: z.number().int().positive(),
  ranges: z.object({
    corrente: RangeSchema,
    temperatura: RangeSchema,
    vibracao: RangeSchema,
    rotacao: RangeSchema,
  }),
})

async function writeMotorRanges(motorId: number, values: RangesMap) {
  await getMotorRangesMap(motorId) // make sure rows exist
  for (const v of VARIABLES) {
    const r = values[v.key]
    await db
      .update(motorRanges)
      .set({ min: r.min, max: r.max, attentionBand: r.attention })
      .where(and(eq(motorRanges.motorId, motorId), eq(motorRanges.variable, v.key)))
  }
}

export const saveRanges = createServerFn({ method: 'POST' })
  .inputValidator(SaveRangesSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    for (const v of VARIABLES) {
      const r = data.ranges[v.key]
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

    await writeMotorRanges(data.motorId, data.ranges)
    return getMotorRangesMap(data.motorId)
  })

export const restoreDefaultRanges = createServerFn({ method: 'POST' })
  .inputValidator(MotorIdSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    await writeMotorRanges(data.motorId, DEFAULT_RANGES)
    return getMotorRangesMap(data.motorId)
  })

export const getAccessLogs = createServerFn({ method: 'GET' }).handler(async () => {
  requireSuporte()
  return db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp))
})

export const clearAccessLogs = createServerFn({ method: 'POST' })
  .inputValidator(ClearSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    const removed = await clearRows(
      { table: accessLogs, id: accessLogs.id, ts: accessLogs.timestamp },
      data,
    )
    return { removed }
  })
