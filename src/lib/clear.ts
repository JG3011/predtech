// Shared input shape for the "Limpar" action available on history screens.

import { z } from 'zod'

export const ClearSchema = z.object({
  // all: everything (within the optional motor filter)
  // oldest / newest: the N oldest / most recent records
  // before: everything older than the given date
  mode: z.enum(['all', 'oldest', 'newest', 'before']),
  count: z.number().int().positive().optional(),
  before: z.string().optional(),
  motorId: z.number().int().positive().optional(),
})

export type ClearInput = z.infer<typeof ClearSchema>
