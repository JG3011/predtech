// Server-only DB helpers shared by the various *.functions.ts files.
// NEVER import this from client code.

import { and, asc, desc, eq, inArray, lt, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { db } from '../../db/index.js'
import { motorRanges, ranges } from '../../db/schema.js'
import { DEFAULT_RANGES, VARIABLES, type RangesMap, type VariableKey } from '../lib/sensors.js'
import type { ClearInput } from '../lib/clear.js'

export async function getRangesMap(): Promise<RangesMap> {
  const rows = await db.select().from(ranges)

  if (rows.length === 0) {
    // Seed defaults on first read.
    const seeded = await db
      .insert(ranges)
      .values(
        VARIABLES.map((v) => ({
          variable: v.key,
          min: DEFAULT_RANGES[v.key].min,
          max: DEFAULT_RANGES[v.key].max,
          attentionBand: DEFAULT_RANGES[v.key].attention,
        })),
      )
      .returning()
    return toMap(seeded)
  }

  return toMap(rows)
}

/** Ranges configured for one motor, seeding defaults for any missing variable. */
export async function getMotorRangesMap(motorId: number): Promise<RangesMap> {
  let rows = await db.select().from(motorRanges).where(eq(motorRanges.motorId, motorId))

  if (rows.length < VARIABLES.length) {
    await db
      .insert(motorRanges)
      .values(
        VARIABLES.map((v) => ({
          motorId,
          variable: v.key,
          min: DEFAULT_RANGES[v.key].min,
          max: DEFAULT_RANGES[v.key].max,
          attentionBand: DEFAULT_RANGES[v.key].attention,
        })),
      )
      .onConflictDoNothing()
    rows = await db.select().from(motorRanges).where(eq(motorRanges.motorId, motorId))
  }

  return toMap(rows)
}

function toMap(
  rows: Array<{ variable: string; min: number; max: number; attentionBand: number }>,
): RangesMap {
  const map = {} as RangesMap
  for (const row of rows) {
    map[row.variable as VariableKey] = {
      min: row.min,
      max: row.max,
      attention: row.attentionBand,
    }
  }
  return map
}

/**
 * Deletes rows from a history table according to a "Limpar" request and
 * returns how many were removed.
 */
export async function clearRows(
  target: { table: PgTable; id: PgColumn; ts: PgColumn; motor?: PgColumn },
  input: ClearInput,
): Promise<number> {
  const conds: SQL[] = []
  if (target.motor && input.motorId) conds.push(eq(target.motor, input.motorId))

  if (input.mode === 'before') {
    if (!input.before) throw new Error('Informe a data limite.')
    const before = new Date(input.before)
    if (Number.isNaN(before.getTime())) throw new Error('Data inválida.')
    conds.push(lt(target.ts, before))
  }

  if (input.mode === 'oldest' || input.mode === 'newest') {
    if (!input.count) throw new Error('Informe a quantidade a remover.')
    const ids = await db
      .select({ id: target.id })
      .from(target.table)
      .where(and(...conds))
      .orderBy(input.mode === 'oldest' ? asc(target.ts) : desc(target.ts))
      .limit(input.count)
    if (ids.length === 0) return 0
    const deleted = await db
      .delete(target.table)
      .where(inArray(target.id, ids.map((r) => r.id as number)))
      .returning({ id: target.id })
    return deleted.length
  }

  const deleted = await db
    .delete(target.table)
    .where(and(...conds))
    .returning({ id: target.id })
  return deleted.length
}

export { desc, asc, db, ranges }
