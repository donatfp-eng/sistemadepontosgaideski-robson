import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { sectors } from '../schema'
import { requireAuth, requireAdmin } from '../_auth'
import { eq } from 'drizzle-orm'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    const list = await db.select().from(sectors).orderBy(sectors.name)
    return res.status(200).json(list)
  }

  if (req.method === 'POST') {
    const user = await requireAdmin(req, res)
    if (!user) return
    const { name } = req.body || {}
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
    const [created] = await db.insert(sectors).values({ name }).returning()
    await audit(user, 'create_sector', 'sector', created.id, null, created)
    return res.status(201).json(created)
  }

  return res.status(405).end()
}
