import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, count, desc, eq, gt } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { failures, maintenances, motors } from '../../db/schema.js'
import { clearRows, getMotorRangesMap } from './db.server.js'
import { requireSession, requireSuporte } from './auth.server.js'
import { ClearSchema } from '../lib/clear.js'
import { predictMaintenance } from '../lib/maintenance.js'

export const getMotors = createServerFn({ method: 'GET' }).handler(async () => {
  requireSession()
  return db.select().from(motors).orderBy(asc(motors.id))
})

const AddMotorSchema = z.object({ name: z.string().trim().min(1).max(80) })

/** Creates a new motor with the default ranges for the four measurement types. */
export const addMotor = createServerFn({ method: 'POST' })
  .inputValidator(AddMotorSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    const [motor] = await db.insert(motors).values({ name: data.name }).returning()
    await getMotorRangesMap(motor.id)
    return motor
  })

/**
 * Per-motor maintenance forecast: last maintenance, failures accumulated
 * since then, and the predicted date for the next maintenance.
 */
export const getMaintenanceForecast = createServerFn({ method: 'GET' }).handler(async () => {
  requireSession()
  const allMotors = await db.select().from(motors).orderBy(asc(motors.id))

  return Promise.all(
    allMotors.map(async (m) => {
      const [last] = await db
        .select()
        .from(maintenances)
        .where(eq(maintenances.motorId, m.id))
        .orderBy(desc(maintenances.performedAt))
        .limit(1)

      const reference = last ? new Date(last.performedAt) : new Date(m.createdAt)

      const counts = await db
        .select({ status: failures.status, total: count() })
        .from(failures)
        .where(and(eq(failures.motorId, m.id), gt(failures.timestamp, reference)))
        .groupBy(failures.status)

      const alarms = Number(counts.find((c) => c.status === 'alarm')?.total ?? 0)
      const attentions = Number(counts.find((c) => c.status === 'attention')?.total ?? 0)
      const predictedAt = predictMaintenance(reference, alarms, attentions)

      return {
        motorId: m.id,
        motorName: m.name,
        lastMaintenance: last ?? null,
        reference: reference.toISOString(),
        alarms,
        attentions,
        predictedAt: predictedAt.toISOString(),
      }
    }),
  )
})

const RegisterMaintenanceSchema = z.object({
  motorId: z.number().int().positive(),
  performedAt: z.string(),
  description: z.string().trim().min(1).max(2000),
  reason: z.string().trim().min(1).max(2000),
})

export const registerMaintenance = createServerFn({ method: 'POST' })
  .inputValidator(RegisterMaintenanceSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    const performedAt = new Date(data.performedAt)
    if (Number.isNaN(performedAt.getTime())) throw new Error('Data inválida.')
    if (performedAt.getTime() > Date.now() + 60_000) {
      throw new Error('A data da manutenção não pode estar no futuro.')
    }

    const [motor] = await db.select().from(motors).where(eq(motors.id, data.motorId))
    if (!motor) throw new Error('Motor não encontrado.')

    const [row] = await db
      .insert(maintenances)
      .values({
        motorId: motor.id,
        motorName: motor.name,
        performedAt,
        description: data.description,
        reason: data.reason,
        createdBy: 'Suporte',
      })
      .returning()
    return row
  })

export const getMaintenances = createServerFn({ method: 'GET' }).handler(async () => {
  requireSuporte()
  return db.select().from(maintenances).orderBy(desc(maintenances.performedAt))
})

export const clearMaintenances = createServerFn({ method: 'POST' })
  .inputValidator(ClearSchema)
  .handler(async ({ data }) => {
    requireSuporte()
    const removed = await clearRows(
      {
        table: maintenances,
        id: maintenances.id,
        ts: maintenances.performedAt,
        motor: maintenances.motorId,
      },
      data,
    )
    return { removed }
  })
