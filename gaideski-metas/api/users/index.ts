import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { users } from '../schema'
import { requireAdmin } from '../_auth'
import { eq } from 'drizzle-orm'
import { audit } from '../_audit'
import * as bcrypt from 'bcryptjs'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAdmin(req, res)
    if (!user) return
    const list = await db.select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, active: users.active, createdAt: users.createdAt,
    }).from(users).orderBy(users.name)
    return res.status(200).json(list)
  }

  if (req.method === 'POST') {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const { name, email, password, role } = req.body || {}
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    const passwordHash = await bcrypt.hash(password, 10)
    const [created] = await db.insert(users).values({ name, email: email.toLowerCase(), passwordHash, role }).returning()
    const { passwordHash: _, ...safe } = created
    await audit(admin, 'create_user', 'user', created.id, null, safe)
    return res.status(201).json(safe)
  }

  return res.status(405).end()
}
