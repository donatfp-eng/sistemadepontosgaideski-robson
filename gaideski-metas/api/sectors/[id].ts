import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../_db'
import { sectors } from '../schema'
import { requireAdmin } from '../_auth'
import { eq } from 'drizzle-orm'
import { audit } from '../_audit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAdmin(req, res)
  if (!user) return
  const id = Number(req.query.id)

  if (req.method === 'DELETE') {
    const [deleted] = await db.delete(sectors).where(eq(sectors.id, id)).returning()
    await audit(user, 'delete_sector', 'sector', id, deleted, null)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
