// Server-only DB helpers shared by the various *.functions.ts files.
// NEVER import this from client code.

import { desc, asc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { ranges } from '../../db/schema.js'
import { DEFAULT_RANGES, VARIABLES, type RangesMap, type VariableKey } from '../lib/sensors.js'

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

export { desc, asc, db, ranges }
