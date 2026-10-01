// Server-only auth helpers. NEVER import this file from client code.
// This app uses two shared role passwords (not per-user accounts), so a
// simple signed-free HttpOnly cookie storing the role is enough — there is
// no sensitive per-user data to protect beyond gating which screens are
// visible, so we deliberately avoid pulling in Netlify Identity for this.

import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'

export type Role = 'operador' | 'suporte'

const COOKIE_NAME = 'predtech_session'

// Hardcoded demo passwords per the spec. Kept server-side only.
const ROLE_PASSWORDS: Record<Role, string> = {
  operador: 'op123',
  suporte: 'sup123',
}

export function checkPassword(role: Role, password: string): boolean {
  return ROLE_PASSWORDS[role] === password
}

export function setSessionCookie(role: Role) {
  setCookie(COOKIE_NAME, role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  })
}

export function clearSessionCookie() {
  deleteCookie(COOKIE_NAME, { path: '/' })
}

export function getSessionRole(): Role | null {
  const value = getCookie(COOKIE_NAME)
  if (value === 'operador' || value === 'suporte') return value
  return null
}

/** Throws unless the current session is Suporte. Use in every Suporte-only server function. */
export function requireSuporte(): Role {
  const role = getSessionRole()
  if (role !== 'suporte') {
    throw new Error('Ação permitida apenas para o perfil Suporte.')
  }
  return role
}

/** Throws unless there is a logged-in session (any role). */
export function requireSession(): Role {
  const role = getSessionRole()
  if (!role) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  return role
}
