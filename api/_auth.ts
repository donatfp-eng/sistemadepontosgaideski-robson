import { SignJWT, jwtVerify } from 'jose'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gaideski-secret-metas-2024'
)

export interface JWTPayload {
  userId: number
  userName: string
  userEmail: string
  role: 'admin' | 'supervisor'
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export function getToken(req: VercelRequest): string | null {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)gaideski_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setTokenCookie(res: VercelResponse, token: string) {
  res.setHeader(
    'Set-Cookie',
    `gaideski_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
  )
}

export function clearTokenCookie(res: VercelResponse) {
  res.setHeader(
    'Set-Cookie',
    'gaideski_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  )
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<JWTPayload | null> {
  const token = getToken(req)
  if (!token) {
    res.status(401).json({ error: 'Não autenticado' })
    return null
  }
  const payload = await verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Token inválido' })
    return null
  }
  return payload
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<JWTPayload | null> {
  const user = await requireAuth(req, res)
  if (!user) return null
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito a administradores' })
    return null
  }
  return user
}

export async function requireSupervisorOrAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<JWTPayload | null> {
  const user = await requireAuth(req, res)
  if (!user) return null
  if (user.role !== 'admin' && user.role !== 'supervisor') {
    res.status(403).json({ error: 'Acesso negado' })
    return null
  }
  return user
}
