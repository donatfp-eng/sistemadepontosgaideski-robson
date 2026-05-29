import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db } from '../_db'
import { users } from '../schema'
import { signToken, setTokenCookie } from '../_auth'
import { audit } from '../_audit'
import * as bcrypt from 'bcryptjs'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' })

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()))
  if (!user || !user.active) return res.status(401).json({ error: 'Credenciais inválidas' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

  const payload = {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role as 'admin' | 'supervisor',
  }
  const token = await signToken(payload)
  setTokenCookie(res, token)
  await audit(payload, 'login')
  return res.status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role })
}
