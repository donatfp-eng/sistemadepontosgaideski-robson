import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { coinConfig } from '../schema'
import { requireAuth, requireAdmin } from '../_auth'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    const [cfg] = await db.select().from(coinConfig).limit(1)
    return res.status(200).json(cfg)
  }

  if (req.method === 'PUT') {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const [before] = await db.select().from(coinConfig).limit(1)
    const body = req.body || {}
    const [updated] = await db.update(coinConfig).set({
      ...body,
      updatedAt: new Date(),
    }).returning()
    await audit(admin, 'update_coin_config', 'coin_config', updated.id, before, updated)
    return res.status(200).json(updated)
  }

  return res.status(405).end()
}
