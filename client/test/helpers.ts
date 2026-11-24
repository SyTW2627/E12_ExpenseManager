import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const API_URL = 'http://localhost:5000/api'
export const PASSWORD = 'password123'

export interface Session {
  token: string
  user: { id: string; name: string; email: string }
}

export interface CreatedGroup {
  _id: string
  name: string
  inviteCode: string
}

// Email distinto en cada llamada para que los tests no compartan datos
export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@e2e.test`
}

export async function registerUser(request: APIRequestContext, name: string): Promise<Session> {
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { name, email: uniqueEmail(name.split(' ')[0]!.toLowerCase()), password: PASSWORD },
  })
  expect(response.status()).toBe(201)
  return response.json()
}

export async function createGroup(
  request: APIRequestContext,
  session: Session,
  data: { name: string; description?: string; members?: string[] }
): Promise<CreatedGroup> {
  const response = await request.post(`${API_URL}/groups`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data,
  })
  expect(response.status()).toBe(201)
  return response.json()
}

// Abre la app con la sesión ya iniciada, igual que si el usuario hubiera hecho login
export async function openAs(page: Page, session: Session, path: string) {
  await page.addInitScript(([token, user]) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', user)
  }, [session.token, JSON.stringify(session.user)] as const)
  await page.goto(path)
}
