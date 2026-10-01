import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  checkPassword,
  clearSessionCookie,
  getSessionRole,
  setSessionCookie,
  type Role,
} from './auth.server.js'
import { db } from '../../db/index.js'
import { accessLogs } from '../../db/schema.js'

const LoginSchema = z.object({
  role: z.enum(['operador', 'suporte']),
  password: z.string(),
})

const ROLE_LABEL: Record<Role, string> = {
  operador: 'Operador',
  suporte: 'Suporte',
}

export const login = createServerFn({ method: 'POST' })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    const success = checkPassword(data.role, data.password)

    await db.insert(accessLogs).values({
      userLabel: ROLE_LABEL[data.role],
      role: data.role,
      success,
    })

    if (!success) {
      return { success: false as const, error: 'Senha incorreta.' }
    }

    setSessionCookie(data.role)
    return { success: true as const, role: data.role }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  clearSessionCookie()
  return { success: true }
})

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  return { role: getSessionRole() }
})

const PageVisitSchema = z.object({ page: z.string().max(200) })

/** Records which screen (aba) a logged-in user opened, for Histórico de Entradas. */
export const logPageVisit = createServerFn({ method: 'POST' })
  .inputValidator(PageVisitSchema)
  .handler(async ({ data }) => {
    const role = getSessionRole()
    if (!role) return { success: false }
    await db.insert(accessLogs).values({
      userLabel: ROLE_LABEL[role],
      role,
      success: true,
      event: 'page',
      page: data.page,
    })
    return { success: true }
  })
